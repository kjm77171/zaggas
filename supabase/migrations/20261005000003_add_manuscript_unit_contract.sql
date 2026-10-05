-- DAY05 STEP C 최종안. 별도 Remote 적용 승인 전 실행 금지.
-- 기존 stories 복사/삭제, 기존 RPC 변경, application 전환은 포함하지 않는다.
-- 승인된 초기 기술 안전 한도: Prose 100000 code points / 1 MiB,
-- Block 8000 code points, Scene 200 Blocks / 200000 code points / 2 MiB JSON.
-- 제품 최종 한도가 아니다. legacy 복사는 다음 00004 migration에서 수행한다.
BEGIN;

-- 기존 trigger가 다른 구현으로 바뀌었다면 교체하지 않고 중단한다.
DO $baseline$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_trigger t
        WHERE t.tgrelid = 'public.projects'::regclass
            AND t.tgname = 'zaggas_projects_before_update_set_updated_at'
            AND NOT t.tgisinternal AND t.tgenabled = 'O' AND t.tgtype = 19
            AND t.tgfoid = 'public.zaggas_stories_set_updated_at()'::regprocedure
    ) THEN
        RAISE EXCEPTION 'Project timestamp trigger baseline changed';
    END IF;
END;
$baseline$;
ALTER TABLE public.projects
    ADD COLUMN last_writing_at timestamptz,
    ADD COLUMN last_written_unit_id uuid,
    ADD COLUMN manuscript_structure_revision integer NOT NULL DEFAULT 0,
    ADD CONSTRAINT projects_manuscript_structure_revision_valid
        CHECK (manuscript_structure_revision >= 0),
    ADD CONSTRAINT projects_writing_pointer_pair_valid
        CHECK ((last_writing_at IS NULL) = (last_written_unit_id IS NULL));

CREATE TABLE public.manuscript_units (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    position bigint NOT NULL,
    title text,
    content text,
    content_format text NOT NULL,
    revision integer NOT NULL DEFAULT 0,
    last_request_id uuid,
    deleted_at timestamptz,
    source_story_id uuid,
    -- 생성 요청은 이후 본문 저장의 last_request_id와 독립적으로 보존한다.
    creation_request_id uuid,
    creation_expected_structure_revision integer,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    CONSTRAINT manuscript_units_position_valid CHECK (position > 0),
    CONSTRAINT manuscript_units_title_valid CHECK (
        title IS NULL OR (public.zaggas_text_has_content(title) AND pg_catalog.char_length(title) <= 200)
    ),
    CONSTRAINT manuscript_units_content_format_valid CHECK (content_format IN ('PROSE', 'SCREENPLAY_BLOCKS')),
    CONSTRAINT manuscript_units_content_valid CHECK (
        (content_format = 'SCREENPLAY_BLOCKS' AND content IS NULL)
        OR (content_format = 'PROSE' AND (content IS NULL OR (
            pg_catalog.char_length(content) <= 100000 AND pg_catalog.octet_length(content) <= 1048576
        )))
    ),
    CONSTRAINT manuscript_units_revision_valid CHECK (revision >= 0),
    CONSTRAINT manuscript_units_save_request_valid CHECK (
        (revision = 0 AND last_request_id IS NULL) OR (revision > 0 AND last_request_id IS NOT NULL)
    ),
    CONSTRAINT manuscript_units_creation_request_valid CHECK (
        (source_story_id IS NULL AND creation_request_id IS NOT NULL AND creation_expected_structure_revision IS NOT NULL AND creation_expected_structure_revision >= 0)
        OR (creation_request_id IS NULL AND creation_expected_structure_revision IS NULL AND source_story_id IS NOT NULL)
    ),
    CONSTRAINT manuscript_units_source_story_unique UNIQUE (source_story_id),
    CONSTRAINT manuscript_units_project_creation_request_unique UNIQUE (project_id, creation_request_id),
    CONSTRAINT manuscript_units_project_id_unique UNIQUE (project_id, id),
    CONSTRAINT manuscript_units_id_format_unique UNIQUE (id, content_format)
);
CREATE UNIQUE INDEX manuscript_units_active_position_unique
    ON public.manuscript_units(project_id, position) WHERE deleted_at IS NULL;
-- source_story_id는 추적 정보다. legacy 정리 시 이 연결값을 지우는 FK를 두지 않는다.

CREATE TABLE public.screenplay_blocks (
    id uuid PRIMARY KEY,
    unit_id uuid NOT NULL,
    -- 복합 FK의 기술 컬럼: Prose Unit 아래 Block을 붙일 수 없다.
    content_format text NOT NULL DEFAULT 'SCREENPLAY_BLOCKS',
    position integer NOT NULL,
    block_type text NOT NULL,
    content text,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    CONSTRAINT screenplay_blocks_format_valid CHECK (content_format = 'SCREENPLAY_BLOCKS'),
    CONSTRAINT screenplay_blocks_unit_format_fk FOREIGN KEY (unit_id, content_format)
        REFERENCES public.manuscript_units(id, content_format) ON DELETE CASCADE,
    CONSTRAINT screenplay_blocks_position_valid CHECK (position > 0),
    CONSTRAINT screenplay_blocks_unit_position_unique UNIQUE (unit_id, position),
    CONSTRAINT screenplay_blocks_type_valid CHECK (block_type IN ('SCENE_HEADING', 'ACTION', 'CHARACTER', 'DIALOGUE')),
    CONSTRAINT screenplay_blocks_content_valid CHECK (content IS NULL OR pg_catalog.char_length(content) <= 8000)
);

-- 같은 Project 조건은 FK로, 활성 조건은 조회와 저장 RPC 및 향후 삭제 RPC로 보장한다.
ALTER TABLE public.projects ADD CONSTRAINT projects_last_written_unit_fk
    FOREIGN KEY (id, last_written_unit_id)
    REFERENCES public.manuscript_units(project_id, id) DEFERRABLE INITIALLY DEFERRED;

-- 기존 Project trigger만 교체한다. Story/Profile helper와 trigger는 변경하지 않는다.
-- metadata가 달라질 때만 metadata 충돌 기준 updated_at을 바꾼다.
CREATE FUNCTION public.zaggas_projects_set_metadata_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
BEGIN
    IF (pg_catalog.to_jsonb(NEW) - ARRAY['updated_at', 'last_writing_at', 'last_written_unit_id', 'manuscript_structure_revision'])
        IS DISTINCT FROM
       (pg_catalog.to_jsonb(OLD) - ARRAY['updated_at', 'last_writing_at', 'last_written_unit_id', 'manuscript_structure_revision']) THEN
        NEW.updated_at := pg_catalog.clock_timestamp();
    ELSE
        NEW.updated_at := OLD.updated_at;
    END IF;
    RETURN NEW;
END;
$function$;
DROP TRIGGER zaggas_projects_before_update_set_updated_at ON public.projects;
CREATE TRIGGER zaggas_projects_before_update_set_updated_at
    BEFORE UPDATE ON public.projects FOR EACH ROW
    EXECUTE FUNCTION public.zaggas_projects_set_metadata_updated_at();
ALTER FUNCTION public.zaggas_projects_set_metadata_updated_at() OWNER TO postgres;
REVOKE ALL PRIVILEGES ON FUNCTION public.zaggas_projects_set_metadata_updated_at()
    FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.manuscript_units OWNER TO postgres;
ALTER TABLE public.screenplay_blocks OWNER TO postgres;
ALTER TABLE public.manuscript_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenplay_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY manuscript_units_select_own ON public.manuscript_units FOR SELECT TO authenticated
USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = manuscript_units.project_id AND p.owner_id = (SELECT auth.uid())
));
CREATE POLICY screenplay_blocks_select_own ON public.screenplay_blocks FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.manuscript_units u JOIN public.projects p ON p.id = u.project_id
    WHERE u.id = screenplay_blocks.unit_id AND u.deleted_at IS NULL AND p.owner_id = (SELECT auth.uid())
));
-- 신규 테이블의 ACL만 명시한다. 기존 table/RPC 권한은 변경하지 않는다.
REVOKE ALL PRIVILEGES ON TABLE public.manuscript_units, public.screenplay_blocks
    FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.manuscript_units, public.screenplay_blocks TO authenticated;
-- service_role: 신규 private 원고 경로에서는 table 권한과 RPC execute를 부여하지 않는다.

CREATE FUNCTION public.zaggas_create_manuscript_unit(
    p_project_id uuid, p_unit_id uuid, p_expected_structure_revision integer, p_request_id uuid
)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
    current_user_id uuid := auth.uid();
    project_row public.projects%ROWTYPE;
    unit_row public.manuscript_units%ROWTYPE;
    next_position bigint;
    result_status text;
BEGIN
    IF current_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
    IF pg_catalog.current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION 'Read committed isolation required' USING ERRCODE = '0A000';
    END IF;
    IF p_project_id IS NULL OR p_unit_id IS NULL OR p_request_id IS NULL
        OR p_expected_structure_revision IS NULL OR p_expected_structure_revision < 0 THEN
        RAISE EXCEPTION 'Invalid unit creation request' USING ERRCODE = '22023';
    END IF;
    SELECT p.* INTO project_row FROM public.projects p
    WHERE p.id = p_project_id AND p.owner_id = current_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Project unavailable' USING ERRCODE = '42501'; END IF;
    SELECT u.* INTO unit_row FROM public.manuscript_units u
    WHERE u.project_id = p_project_id AND u.creation_request_id = p_request_id FOR UPDATE;
    IF FOUND THEN
        IF unit_row.id <> p_unit_id OR unit_row.creation_expected_structure_revision <> p_expected_structure_revision THEN
            RAISE EXCEPTION 'Request ID reused with incompatible input' USING ERRCODE = '22023';
        END IF;
        IF unit_row.deleted_at IS NOT NULL THEN
            RETURN pg_catalog.jsonb_build_object('status', 'conflict', 'reason', 'unit_deleted');
        END IF;
        result_status := 'existing_retry';
    ELSE
        IF project_row.manuscript_structure_revision <> p_expected_structure_revision THEN
            RETURN pg_catalog.jsonb_build_object('status', 'conflict', 'structure_revision', project_row.manuscript_structure_revision);
        END IF;
        IF project_row.manuscript_structure_revision = 2147483647 THEN
            RAISE EXCEPTION 'Structure revision capacity reached' USING ERRCODE = '22003';
        END IF;
        SELECT COALESCE(pg_catalog.max(u.position), 0) + 1000 INTO next_position
        FROM public.manuscript_units u WHERE u.project_id = p_project_id AND u.deleted_at IS NULL;
        BEGIN
            INSERT INTO public.manuscript_units AS u
                (id, project_id, position, content_format, creation_request_id, creation_expected_structure_revision)
            VALUES (p_unit_id, p_project_id, next_position,
                CASE WHEN project_row.creation_type = 'SCREENPLAY' THEN 'SCREENPLAY_BLOCKS' ELSE 'PROSE' END,
                p_request_id, p_expected_structure_revision)
            RETURNING u.* INTO unit_row;
        EXCEPTION WHEN unique_violation THEN
            RAISE EXCEPTION 'Unit request unavailable' USING ERRCODE = '23505';
        END;
        UPDATE public.projects SET manuscript_structure_revision = manuscript_structure_revision + 1
        WHERE id = p_project_id RETURNING * INTO project_row;
        result_status := 'created';
    END IF;
    RETURN pg_catalog.jsonb_build_object('status', result_status, 'unit', pg_catalog.to_jsonb(unit_row),
        'structure_revision', project_row.manuscript_structure_revision);
END;
$function$;

-- 공통 내부 저장 함수. authenticated에서 직접 실행할 수 없다.
CREATE FUNCTION public.zaggas_save_manuscript_unit_internal(
    p_project_id uuid, p_unit_id uuid, p_content_format text,
    p_content text, p_blocks jsonb, p_expected_revision integer, p_request_id uuid
)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
    current_user_id uuid := auth.uid();
    unit_row public.manuscript_units%ROWTYPE;
    normalized_content text;
    normalized_blocks jsonb := '[]'::jsonb;
    old_blocks jsonb := '[]'::jsonb;
    old_block_times jsonb := '[]'::jsonb;
    block_item jsonb;
    block_id uuid;
    block_content text;
    total_length integer := 0;
    block_ids uuid[] := ARRAY[]::uuid[];
    changed boolean;
    result_status text;
    write_timestamp timestamptz;
BEGIN
    IF current_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
    IF pg_catalog.current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION 'Read committed isolation required' USING ERRCODE = '0A000';
    END IF;
    IF p_project_id IS NULL OR p_unit_id IS NULL OR p_request_id IS NULL
        OR p_expected_revision IS NULL OR p_expected_revision < 0
        OR p_content_format IS NULL OR p_content_format NOT IN ('PROSE', 'SCREENPLAY_BLOCKS') THEN
        RAISE EXCEPTION 'Invalid save request' USING ERRCODE = '22023';
    END IF;
    -- Project -> Unit 순서로 잠금. activity와 metadata 변경도 같은 Project 잠금 아래 직렬화한다.
    PERFORM p.id FROM public.projects p WHERE p.id = p_project_id AND p.owner_id = current_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Project unavailable' USING ERRCODE = '42501'; END IF;
    SELECT u.* INTO unit_row FROM public.manuscript_units u
    WHERE u.id = p_unit_id AND u.project_id = p_project_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unit unavailable' USING ERRCODE = '42501'; END IF;
    IF unit_row.deleted_at IS NOT NULL THEN
        RETURN pg_catalog.jsonb_build_object('status', 'conflict', 'reason', 'unit_deleted');
    END IF;
    IF unit_row.content_format <> p_content_format THEN
        RAISE EXCEPTION 'Writing format mismatch' USING ERRCODE = '22023';
    END IF;

    IF p_content_format = 'PROSE' THEN
        IF p_blocks IS NOT NULL THEN RAISE EXCEPTION 'Unexpected blocks' USING ERRCODE = '22023'; END IF;
        -- 공백만 있으면 NULL. 의미 있는 원문은 trim/normalize하지 않는다.
        IF p_content IS NOT NULL AND (pg_catalog.char_length(p_content) > 100000 OR pg_catalog.octet_length(p_content) > 1048576) THEN
            RAISE EXCEPTION 'Prose draft safety limit exceeded' USING ERRCODE = '22023';
        END IF;
        normalized_content := CASE WHEN public.zaggas_text_has_content(p_content) THEN p_content ELSE NULL END;
        changed := unit_row.content IS DISTINCT FROM normalized_content;
    ELSE
        IF p_content IS NOT NULL OR p_blocks IS NULL OR pg_catalog.jsonb_typeof(p_blocks) <> 'array' THEN
            RAISE EXCEPTION 'Expected block snapshot array' USING ERRCODE = '22023';
        END IF;
        IF pg_catalog.jsonb_array_length(p_blocks) > 200 OR pg_catalog.octet_length(p_blocks::text) > 2097152 THEN
            RAISE EXCEPTION 'Scene draft safety limit exceeded' USING ERRCODE = '22023';
        END IF;
        FOR block_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_blocks) LOOP
            IF pg_catalog.jsonb_typeof(block_item) <> 'object' THEN
                RAISE EXCEPTION 'Invalid block object' USING ERRCODE = '22023';
            END IF;
            IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(block_item) AS keys(key)
                WHERE key NOT IN ('id', 'block_type', 'content'))
                OR pg_catalog.jsonb_typeof(block_item -> 'id') IS DISTINCT FROM 'string'
                OR pg_catalog.jsonb_typeof(block_item -> 'block_type') IS DISTINCT FROM 'string'
                OR (block_item ->> 'block_type') NOT IN ('SCENE_HEADING', 'ACTION', 'CHARACTER', 'DIALOGUE')
                OR NOT (block_item ? 'content')
                OR pg_catalog.jsonb_typeof(block_item -> 'content') NOT IN ('string', 'null') THEN
                RAISE EXCEPTION 'Invalid block fields' USING ERRCODE = '22023';
            END IF;
            IF (block_item ->> 'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                RAISE EXCEPTION 'Invalid block ID' USING ERRCODE = '22023';
            END IF;
            block_id := (block_item ->> 'id')::uuid;
            IF block_id = ANY(block_ids) THEN RAISE EXCEPTION 'Duplicate block ID' USING ERRCODE = '22023'; END IF;
            block_ids := pg_catalog.array_append(block_ids, block_id);
            block_content := block_item ->> 'content';
            IF pg_catalog.char_length(block_content) > 8000 THEN
                RAISE EXCEPTION 'Block draft safety limit exceeded' USING ERRCODE = '22023';
            END IF;
            total_length := total_length + COALESCE(pg_catalog.char_length(block_content), 0);
            block_content := CASE WHEN public.zaggas_text_has_content(block_content) THEN block_content ELSE NULL END;
            normalized_blocks := normalized_blocks || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
                'id', block_id, 'block_type', block_item ->> 'block_type', 'content', block_content));
        END LOOP;
        IF total_length > 200000 THEN RAISE EXCEPTION 'Scene text safety limit exceeded' USING ERRCODE = '22023'; END IF;
        SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
            'id', b.id, 'block_type', b.block_type, 'content', b.content) ORDER BY b.position), '[]'::jsonb),
            COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                'id', b.id, 'block_type', b.block_type, 'content', b.content,
                'created_at', b.created_at, 'updated_at', b.updated_at)), '[]'::jsonb)
        INTO old_blocks, old_block_times FROM public.screenplay_blocks b WHERE b.unit_id = p_unit_id;
        changed := old_blocks IS DISTINCT FROM normalized_blocks;
    END IF;

    IF unit_row.last_request_id = p_request_id THEN
        IF p_expected_revision <> unit_row.revision - 1 OR changed THEN
            RAISE EXCEPTION 'Request ID reused with incompatible input' USING ERRCODE = '22023';
        END IF;
        result_status := 'existing_retry';
    ELSIF unit_row.revision <> p_expected_revision THEN
        result_status := 'conflict';
    ELSIF NOT changed THEN
        result_status := 'noop';
    ELSE
        IF unit_row.revision = 2147483647 THEN RAISE EXCEPTION 'Unit revision capacity reached' USING ERRCODE = '22003'; END IF;
        write_timestamp := pg_catalog.clock_timestamp();
        IF p_content_format = 'SCREENPLAY_BLOCKS' THEN
            IF EXISTS (SELECT 1 FROM public.screenplay_blocks b WHERE b.id = ANY(block_ids) AND b.unit_id <> p_unit_id) THEN
                RAISE EXCEPTION 'Block ID unavailable' USING ERRCODE = '22023';
            END IF;
            -- 전체 교체는 같은 RPC transaction 안에서 수행한다. 이전 Block 생성 시각은 유지한다.
            DELETE FROM public.screenplay_blocks WHERE unit_id = p_unit_id;
            INSERT INTO public.screenplay_blocks(id, unit_id, position, block_type, content, created_at, updated_at)
            SELECT (entry.item ->> 'id')::uuid, p_unit_id, entry.ordinality::integer,
                entry.item ->> 'block_type', entry.item ->> 'content',
                COALESCE((previous.item ->> 'created_at')::timestamptz, write_timestamp),
                CASE WHEN previous.item IS NOT NULL
                    AND (previous.item ->> 'block_type') = (entry.item ->> 'block_type')
                    AND (previous.item ->> 'content') IS NOT DISTINCT FROM (entry.item ->> 'content')
                    THEN (previous.item ->> 'updated_at')::timestamptz ELSE write_timestamp END
            FROM pg_catalog.jsonb_array_elements(normalized_blocks) WITH ORDINALITY AS entry(item, ordinality)
            LEFT JOIN LATERAL (SELECT old.item FROM pg_catalog.jsonb_array_elements(old_block_times) AS old(item)
                WHERE (old.item ->> 'id') = (entry.item ->> 'id')) AS previous ON true;
        END IF;
        UPDATE public.manuscript_units AS u SET content = normalized_content, revision = u.revision + 1,
            last_request_id = p_request_id, updated_at = write_timestamp
        WHERE u.id = p_unit_id RETURNING u.* INTO unit_row;
        UPDATE public.projects SET last_writing_at = write_timestamp, last_written_unit_id = p_unit_id WHERE id = p_project_id;
        result_status := 'saved';
    END IF;
    -- conflict은 최신 서버 snapshot을 반환한다. 다른 탭의 내용을 덮어쓰지 않는다.
    RETURN pg_catalog.jsonb_build_object('status', result_status, 'unit', pg_catalog.to_jsonb(unit_row),
        'blocks', CASE WHEN p_content_format = 'SCREENPLAY_BLOCKS' THEN
            CASE WHEN result_status = 'saved' THEN normalized_blocks ELSE old_blocks END ELSE NULL END);
END;
$function$;

CREATE FUNCTION public.zaggas_save_prose_unit(
    p_project_id uuid, p_unit_id uuid, p_content text, p_expected_revision integer, p_request_id uuid
)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
    SELECT public.zaggas_save_manuscript_unit_internal(p_project_id, p_unit_id, 'PROSE', p_content, NULL, p_expected_revision, p_request_id);
$function$;
CREATE FUNCTION public.zaggas_save_screenplay_unit(
    p_project_id uuid, p_unit_id uuid, p_blocks jsonb, p_expected_revision integer, p_request_id uuid
)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
    SELECT public.zaggas_save_manuscript_unit_internal(p_project_id, p_unit_id, 'SCREENPLAY_BLOCKS', NULL, p_blocks, p_expected_revision, p_request_id);
$function$;

ALTER FUNCTION public.zaggas_create_manuscript_unit(uuid, uuid, integer, uuid) OWNER TO postgres;
ALTER FUNCTION public.zaggas_save_manuscript_unit_internal(uuid, uuid, text, text, jsonb, integer, uuid) OWNER TO postgres;
ALTER FUNCTION public.zaggas_save_prose_unit(uuid, uuid, text, integer, uuid) OWNER TO postgres;
ALTER FUNCTION public.zaggas_save_screenplay_unit(uuid, uuid, jsonb, integer, uuid) OWNER TO postgres;
REVOKE ALL PRIVILEGES ON FUNCTION public.zaggas_create_manuscript_unit(uuid, uuid, integer, uuid),
    public.zaggas_save_manuscript_unit_internal(uuid, uuid, text, text, jsonb, integer, uuid),
    public.zaggas_save_prose_unit(uuid, uuid, text, integer, uuid),
    public.zaggas_save_screenplay_unit(uuid, uuid, jsonb, integer, uuid)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.zaggas_create_manuscript_unit(uuid, uuid, integer, uuid),
    public.zaggas_save_prose_unit(uuid, uuid, text, integer, uuid),
    public.zaggas_save_screenplay_unit(uuid, uuid, jsonb, integer, uuid) TO authenticated;

-- role 상속이나 예상 밖 default ACL이 계약을 넓히면 전체 schema 적용을 실패시킨다.
DO $acl$
DECLARE
    table_name text;
    role_name text;
    privilege_name text;
    function_signature text;
    column_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['public.manuscript_units', 'public.screenplay_blocks'] LOOP
        IF NOT pg_catalog.has_table_privilege('authenticated', table_name, 'SELECT') THEN
            RAISE EXCEPTION 'Authenticated SELECT privilege missing';
        END IF;
        FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
            FOREACH privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
                IF NOT (role_name = 'authenticated' AND privilege_name = 'SELECT')
                    AND pg_catalog.has_table_privilege(role_name, table_name, privilege_name) THEN
                    RAISE EXCEPTION 'Unexpected table privilege: % % %', role_name, table_name, privilege_name;
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
    FOREACH column_name IN ARRAY ARRAY['last_writing_at', 'last_written_unit_id', 'manuscript_structure_revision'] LOOP
        IF pg_catalog.has_column_privilege('authenticated', 'public.projects', column_name, 'UPDATE')
            OR pg_catalog.has_column_privilege('authenticated', 'public.projects', column_name, 'INSERT') THEN
            RAISE EXCEPTION 'Unexpected direct Project state privilege: %', column_name;
        END IF;
    END LOOP;
    FOREACH function_signature IN ARRAY ARRAY[
        'public.zaggas_create_manuscript_unit(uuid,uuid,integer,uuid)',
        'public.zaggas_save_prose_unit(uuid,uuid,text,integer,uuid)',
        'public.zaggas_save_screenplay_unit(uuid,uuid,jsonb,integer,uuid)',
        'public.zaggas_save_manuscript_unit_internal(uuid,uuid,text,text,jsonb,integer,uuid)',
        'public.zaggas_projects_set_metadata_updated_at()'
    ] LOOP
        IF pg_catalog.has_function_privilege('anon', function_signature, 'EXECUTE')
            OR pg_catalog.has_function_privilege('service_role', function_signature, 'EXECUTE')
            OR EXISTS (
                SELECT 1 FROM pg_catalog.pg_proc p,
                    LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
                WHERE p.oid = function_signature::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
            ) THEN
            RAISE EXCEPTION 'Unexpected RPC/helper EXECUTE privilege';
        END IF;
        IF pg_catalog.has_function_privilege('authenticated', function_signature, 'EXECUTE')
            IS DISTINCT FROM (function_signature NOT IN (
                'public.zaggas_save_manuscript_unit_internal(uuid,uuid,text,text,jsonb,integer,uuid)',
                'public.zaggas_projects_set_metadata_updated_at()'
            )) THEN
            RAISE EXCEPTION 'Authenticated RPC/helper privilege mismatch';
        END IF;
    END LOOP;
END;
$acl$;
COMMIT;
