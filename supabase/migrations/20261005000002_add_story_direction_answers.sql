-- 로컬 초안: 별도 검토와 승인 후에만 적용한다.
-- 기존 데이터, Project/Story 저장 시각과 기존 권한은 변경하지 않는다.
BEGIN;

CREATE TABLE public.project_story_direction_answers (
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    question_key text NOT NULL,
    answer text,
    question_set_version integer NOT NULL,
    revision integer NOT NULL,
    last_request_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    CONSTRAINT project_story_direction_answers_pkey PRIMARY KEY (project_id, question_key),
    CONSTRAINT project_story_direction_answers_question_key_valid CHECK (
        question_key IN ('focus', 'exploration', 'meaning', 'after_feeling')
    ),
    CONSTRAINT project_story_direction_answers_version_valid CHECK (question_set_version = 1),
    CONSTRAINT project_story_direction_answers_revision_valid CHECK (revision >= 1),
    CONSTRAINT project_story_direction_answers_answer_valid CHECK (
        answer IS NULL OR (
            public.zaggas_text_has_content(answer)
            AND pg_catalog.char_length(answer) <= 2000
        )
    )
);

ALTER TABLE public.project_story_direction_answers OWNER TO postgres;
ALTER TABLE public.project_story_direction_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_story_direction_answers_select_own
ON public.project_story_direction_answers FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.projects AS p
    WHERE p.id = project_story_direction_answers.project_id
        AND p.owner_id = (SELECT auth.uid())
));

-- 새 테이블의 자동 부여 권한을 제한한다. service_role의 기본 테이블 권한은 유지한다.
-- 직접 쓰기 정책은 없으며 authenticated는 조회와 전용 RPC만 사용한다.
REVOKE ALL PRIVILEGES ON TABLE public.project_story_direction_answers
    FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.project_story_direction_answers TO authenticated;

CREATE FUNCTION public.zaggas_save_story_direction_answer(
    p_project_id uuid,
    p_question_key text,
    p_answer text,
    p_question_set_version integer,
    p_expected_revision integer,
    p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    current_user_id uuid := auth.uid();
    normalized_answer text;
    persisted public.project_story_direction_answers%ROWTYPE;
    result_status text;
    write_timestamp timestamptz;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    IF pg_catalog.current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION 'Read committed isolation required' USING ERRCODE = '0A000';
    END IF;
    IF p_project_id IS NULL OR p_request_id IS NULL THEN
        RAISE EXCEPTION 'Project and request IDs are required' USING ERRCODE = '22023';
    END IF;
    IF p_question_key IS NULL
        OR p_question_key NOT IN ('focus', 'exploration', 'meaning', 'after_feeling') THEN
        RAISE EXCEPTION 'Invalid question key' USING ERRCODE = '22023';
    END IF;
    IF p_question_set_version IS DISTINCT FROM 1 THEN
        RAISE EXCEPTION 'Unsupported question version' USING ERRCODE = '22023';
    END IF;
    IF p_expected_revision IS NULL OR p_expected_revision < 0 THEN
        RAISE EXCEPTION 'Invalid expected revision' USING ERRCODE = '22023';
    END IF;

    -- PostgreSQL UTF-8 text의 char_length는 Unicode code point 수를 센다.
    -- 공백만 있는 입력은 NULL이며 유효한 원문의 줄바꿈과 공백은 그대로 보존한다.
    IF public.zaggas_text_has_content(p_answer) THEN
        IF pg_catalog.char_length(p_answer) > 2000 THEN
            RAISE EXCEPTION 'Answer exceeds capacity' USING ERRCODE = '22023';
        END IF;
        normalized_answer := p_answer;
    ELSE
        normalized_answer := NULL;
    END IF;

    -- projects_id_owner_unique(id, owner_id)는 기존 FK의 참조 가능한 UNIQUE이다.
    -- 삭제와 owner_id 변경은 이 잠금과 충돌한다. 다른 질문의 저장은 함께 진행할 수 있다.
    -- Project 자체를 UPDATE하지 않으며 없는 Project와 다른 소유자는 같은 오류를 반환한다.
    PERFORM p.id FROM public.projects AS p
    WHERE p.id = p_project_id AND p.owner_id = current_user_id
    FOR KEY SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project unavailable' USING ERRCODE = '42501';
    END IF;

    SELECT a.* INTO persisted
    FROM public.project_story_direction_answers AS a
    WHERE a.project_id = p_project_id AND a.question_key = p_question_key
    FOR UPDATE;

    IF NOT FOUND THEN
        IF p_expected_revision <> 0 THEN
            -- 행 없음도 현재 상태로 반환하며 추측해서 새 행을 생성하지 않는다.
            result_status := 'conflict';
        ELSIF normalized_answer IS NULL THEN
            result_status := 'noop';
        ELSE
            write_timestamp := pg_catalog.clock_timestamp();
            INSERT INTO public.project_story_direction_answers AS a (
                project_id, question_key, answer, question_set_version, revision, last_request_id,
                created_at, updated_at
            ) VALUES (
                p_project_id, p_question_key, normalized_answer, p_question_set_version, 1, p_request_id,
                write_timestamp, write_timestamp
            )
            ON CONFLICT (project_id, question_key) DO NOTHING
            RETURNING a.* INTO persisted;
            IF FOUND THEN
                result_status := 'saved';
            ELSE
                -- INSERT와 별도 statement의 새 READ COMMITTED snapshot으로 승자의 행을 읽는다.
                SELECT a.* INTO persisted
                FROM public.project_story_direction_answers AS a
                WHERE a.project_id = p_project_id AND a.question_key = p_question_key
                FOR UPDATE;
                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Retry direction save' USING ERRCODE = '40001';
                END IF;
            END IF;
        END IF;
    END IF;

    -- 기존 행 또는 최초 INSERT 경쟁에서 다른 요청이 저장한 행을 처리한다.
    IF result_status IS NULL THEN
        IF persisted.last_request_id = p_request_id THEN
            IF persisted.answer IS DISTINCT FROM normalized_answer
                OR persisted.question_set_version IS DISTINCT FROM p_question_set_version
                OR p_expected_revision <> persisted.revision - 1 THEN
                RAISE EXCEPTION 'Request ID reused with incompatible input' USING ERRCODE = '22023';
            END IF;
            result_status := 'existing_retry';
        ELSIF persisted.revision <> p_expected_revision THEN
            result_status := 'conflict';
        ELSIF persisted.answer IS NOT DISTINCT FROM normalized_answer
            AND persisted.question_set_version = p_question_set_version THEN
            result_status := 'noop';
        ELSE
            IF persisted.revision = 2147483647 THEN
                RAISE EXCEPTION 'Answer revision capacity reached' USING ERRCODE = '22003';
            END IF;
            write_timestamp := pg_catalog.clock_timestamp();
            UPDATE public.project_story_direction_answers AS a
            SET answer = normalized_answer,
                question_set_version = p_question_set_version,
                revision = a.revision + 1,
                last_request_id = p_request_id,
                updated_at = write_timestamp
            WHERE a.project_id = p_project_id AND a.question_key = p_question_key
            RETURNING a.* INTO persisted;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Retry direction save' USING ERRCODE = '40001';
            END IF;
            result_status := 'saved';
        END IF;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'status', result_status,
        'project_id', p_project_id,
        'question_key', p_question_key,
        'answer', persisted.answer,
        'question_set_version', COALESCE(persisted.question_set_version, p_question_set_version),
        'revision', COALESCE(persisted.revision, 0),
        'created_at', persisted.created_at,
        'updated_at', persisted.updated_at
    );
END;
$function$;

-- 기존 보안 RPC와 같은 소유자와 실행 권한을 사용한다.
ALTER FUNCTION public.zaggas_save_story_direction_answer(uuid, text, text, integer, integer, uuid)
    OWNER TO postgres;
REVOKE ALL PRIVILEGES ON FUNCTION public.zaggas_save_story_direction_answer(uuid, text, text, integer, integer, uuid)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.zaggas_save_story_direction_answer(uuid, text, text, integer, integer, uuid)
    TO authenticated;

COMMIT;
