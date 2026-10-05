-- DAY05 STEP C: 00003 적용 후, application 쓰기를 중지한 상태에서 별도 승인 후 실행한다.
-- 기존 Story는 변경하지 않는다. baseline을 벗어나면 전체 transaction을 실패시킨다.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- plain SELECT는 허용하지만 기존/신규 원고 쓰기와 Project 행 잠금을 차단한다.
LOCK TABLE public.projects, public.stories, public.manuscript_units, public.screenplay_blocks IN EXCLUSIVE MODE;

CREATE TEMP TABLE zaggas_day05_project_baseline ON COMMIT DROP AS
SELECT p.id, pg_catalog.to_jsonb(p) - ARRAY['last_writing_at', 'last_written_unit_id', 'manuscript_structure_revision'] AS metadata
FROM public.projects p;
CREATE TEMP TABLE zaggas_day05_story_baseline ON COMMIT DROP AS
SELECT s.id, pg_catalog.to_jsonb(s) AS snapshot FROM public.stories s;

DO $backfill$
BEGIN
    IF (SELECT count(*) FROM public.projects) <> 32 OR (SELECT count(*) FROM public.stories) <> 8 THEN
        RAISE EXCEPTION 'Legacy baseline counts changed; stop and inspect';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.stories s LEFT JOIN public.projects p ON p.id = s.project_id
        WHERE s.project_id IS NULL OR s.owner_id IS NULL OR p.id IS NULL OR s.owner_id IS DISTINCT FROM p.owner_id
            OR s.title IS NULL OR NOT public.zaggas_text_has_content(s.title) OR pg_catalog.char_length(s.title) > 200
            OR s.content IS NULL OR NOT public.zaggas_text_has_content(s.content)
            OR pg_catalog.char_length(s.content) > 100000 OR pg_catalog.octet_length(s.content) > 1048576
    ) OR EXISTS (SELECT 1 FROM public.stories GROUP BY project_id HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Legacy relation or payload baseline invalid';
    END IF;
    IF EXISTS (SELECT 1 FROM public.projects WHERE manuscript_structure_revision <> 0)
        OR EXISTS (SELECT 1 FROM public.screenplay_blocks)
        OR EXISTS (SELECT 1 FROM public.manuscript_units WHERE source_story_id IS NULL) THEN
        RAISE EXCEPTION 'DAY05 runtime writes already exist; backfill is not safe';
    END IF;
    -- 재실행으로 새 원고를 덮어쓰지 않는다. 기존 legacy Unit도 원본과 정확히 같아야 한다.
    IF EXISTS (
        SELECT 1 FROM public.manuscript_units u LEFT JOIN public.stories s ON s.id = u.source_story_id
        WHERE s.id IS NULL OR u.id IS DISTINCT FROM s.id OR u.project_id IS DISTINCT FROM s.project_id
            OR u.position <> 1000 OR u.title IS DISTINCT FROM s.title OR u.content IS DISTINCT FROM s.content
            OR u.content_format <> 'PROSE' OR u.revision <> 1 OR u.deleted_at IS NOT NULL
            OR u.last_request_id IS DISTINCT FROM pg_catalog.md5('zaggas:legacy-story:' || s.id::text)::uuid
            OR u.creation_request_id IS NOT NULL OR u.creation_expected_structure_revision IS NOT NULL
            OR u.created_at IS DISTINCT FROM s.created_at OR u.updated_at IS DISTINCT FROM s.updated_at
    ) THEN
        RAISE EXCEPTION 'Existing legacy Unit differs; do not overwrite';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.projects p LEFT JOIN public.stories s ON s.project_id = p.id
        WHERE (p.last_writing_at IS NOT NULL OR p.last_written_unit_id IS NOT NULL)
            AND (s.id IS NULL OR p.last_written_unit_id IS DISTINCT FROM s.id OR p.last_writing_at IS DISTINCT FROM s.updated_at)
    ) THEN
        RAISE EXCEPTION 'Existing writing activity differs; stop and inspect';
    END IF;
END;
$backfill$;

-- id는 원본 Story UUID를 재사용한다. 서로 다른 table의 PK이므로 충돌하지 않는다.
-- last_request_id는 revision 1 baseline 표식이다. 사용자 저장 요청 ID가 아니다.
INSERT INTO public.manuscript_units (
    id, project_id, position, title, content, content_format, revision, last_request_id,
    source_story_id, created_at, updated_at
)
SELECT s.id, s.project_id, 1000, s.title, s.content, 'PROSE', 1,
    pg_catalog.md5('zaggas:legacy-story:' || s.id::text)::uuid, s.id, s.created_at, s.updated_at
FROM public.stories s
ON CONFLICT (source_story_id) DO NOTHING;

UPDATE public.projects p
SET last_writing_at = s.updated_at, last_written_unit_id = u.id
FROM public.stories s JOIN public.manuscript_units u ON u.source_story_id = s.id
WHERE p.id = s.project_id
    AND (p.last_writing_at IS DISTINCT FROM s.updated_at OR p.last_written_unit_id IS DISTINCT FROM u.id);

DO $verify$
BEGIN
    IF (SELECT count(*) FROM public.manuscript_units) <> 8
        OR EXISTS (SELECT 1 FROM public.manuscript_units GROUP BY source_story_id HAVING count(*) > 1)
        OR EXISTS (
            SELECT 1 FROM public.stories s LEFT JOIN public.manuscript_units u ON u.source_story_id = s.id
            WHERE u.id IS NULL OR u.id IS DISTINCT FROM s.id OR u.project_id IS DISTINCT FROM s.project_id
                OR u.position <> 1000 OR u.title IS DISTINCT FROM s.title OR u.content IS DISTINCT FROM s.content
                OR u.content_format <> 'PROSE' OR u.revision <> 1 OR u.deleted_at IS NOT NULL
                OR u.last_request_id IS DISTINCT FROM pg_catalog.md5('zaggas:legacy-story:' || s.id::text)::uuid
                OR u.created_at IS DISTINCT FROM s.created_at OR u.updated_at IS DISTINCT FROM s.updated_at
        ) THEN
        RAISE EXCEPTION 'Legacy copy verification failed';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.projects p LEFT JOIN public.stories s ON s.project_id = p.id
        LEFT JOIN public.manuscript_units u ON u.source_story_id = s.id
        WHERE p.manuscript_structure_revision <> 0
            OR p.last_written_unit_id IS DISTINCT FROM u.id OR p.last_writing_at IS DISTINCT FROM s.updated_at
    ) THEN
        RAISE EXCEPTION 'Project activity verification failed';
    END IF;
    -- updated_at을 포함한 기존 Project metadata와 Story 전체 row를 보존한다.
    IF EXISTS (
        SELECT 1 FROM pg_temp.zaggas_day05_project_baseline b FULL JOIN public.projects p ON p.id = b.id
        WHERE b.id IS NULL OR p.id IS NULL OR b.metadata IS DISTINCT FROM
            (pg_catalog.to_jsonb(p) - ARRAY['last_writing_at', 'last_written_unit_id', 'manuscript_structure_revision'])
    ) OR EXISTS (
        SELECT 1 FROM pg_temp.zaggas_day05_story_baseline b FULL JOIN public.stories s ON s.id = b.id
        WHERE b.id IS NULL OR s.id IS NULL OR b.snapshot IS DISTINCT FROM pg_catalog.to_jsonb(s)
    ) THEN
        RAISE EXCEPTION 'Existing Project metadata or Story changed';
    END IF;
END;
$verify$;
-- deferred pointer FK도 COMMIT 전에 검사한다.
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;
