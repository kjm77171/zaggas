-- READ-ONLY: 00003/00004 직후, DAY05 runtime 쓰기를 시작하기 전에 실행한다.
-- 원문·제목·개인 식별값은 출력하지 않는다. 숫자 expected와 actual이 모두 같아야 한다.
WITH copy AS (
    SELECT s.id AS story_id, s.project_id, s.updated_at AS story_updated_at, u.id AS unit_id,
        u.id IS NOT DISTINCT FROM s.id AND u.project_id IS NOT DISTINCT FROM s.project_id
        AND u.title IS NOT DISTINCT FROM s.title AND u.content IS NOT DISTINCT FROM s.content
        AND u.created_at IS NOT DISTINCT FROM s.created_at AND u.updated_at IS NOT DISTINCT FROM s.updated_at
        AND u.content_format = 'PROSE' AND u.position = 1000 AND u.revision = 1 AND u.deleted_at IS NULL
        AND u.last_request_id IS NOT DISTINCT FROM pg_catalog.md5('zaggas:legacy-story:' || s.id::text)::uuid
        AND u.creation_request_id IS NULL AND u.creation_expected_structure_revision IS NULL AS exact_copy
    FROM public.stories s LEFT JOIN public.manuscript_units u ON u.source_story_id = s.id
), checks AS (
    SELECT 'projects_count' AS check_name, (SELECT count(*) FROM public.projects) AS actual, 32::bigint AS expected
    UNION ALL SELECT 'stories_count', count(*), 8 FROM public.stories
    UNION ALL SELECT 'direction_count', count(*), 4 FROM public.project_story_direction_answers
    UNION ALL SELECT 'units_count', count(*), 8 FROM public.manuscript_units
    UNION ALL SELECT 'legacy_units_count', count(*), 8 FROM public.manuscript_units WHERE source_story_id IS NOT NULL
    UNION ALL SELECT 'missing_or_changed_copy', count(*), 0 FROM copy WHERE exact_copy IS DISTINCT FROM true
    UNION ALL SELECT 'duplicate_source', count(*), 0 FROM (SELECT source_story_id FROM public.manuscript_units WHERE source_story_id IS NOT NULL GROUP BY source_story_id HAVING count(*) > 1) duplicates
    UNION ALL SELECT 'orphan_source_units', count(*), 0 FROM public.manuscript_units u LEFT JOIN public.stories s ON s.id = u.source_story_id WHERE s.id IS NULL
    UNION ALL SELECT 'project_activity_mismatch', count(*), 0 FROM public.projects p LEFT JOIN copy c ON c.project_id = p.id WHERE p.last_written_unit_id IS DISTINCT FROM c.unit_id OR p.last_writing_at IS DISTINCT FROM c.story_updated_at
    UNION ALL SELECT 'empty_projects_without_activity', count(*), 24 FROM public.projects p WHERE NOT EXISTS (SELECT 1 FROM public.stories s WHERE s.project_id = p.id) AND p.last_written_unit_id IS NULL AND p.last_writing_at IS NULL
    UNION ALL SELECT 'nonzero_structure_revision', count(*), 0 FROM public.projects WHERE manuscript_structure_revision <> 0
    UNION ALL SELECT 'screenplay_legacy_preserved_as_prose', count(*), 1 FROM public.manuscript_units u JOIN public.projects p ON p.id = u.project_id WHERE u.source_story_id IS NOT NULL AND p.creation_type = 'SCREENPLAY' AND u.content_format = 'PROSE'
    UNION ALL SELECT 'screenplay_blocks_count', count(*), 0 FROM public.screenplay_blocks
)
SELECT check_name, actual, expected, actual = expected AS pass FROM checks ORDER BY check_name;
-- Project metadata updated_at 및 Story 전체 row 보존은 00004 transaction 내부 snapshot 비교로 검증한다.
-- RLS/RPC/effective ACL은 별도 schema metadata 검증 대상이며 00003의 assertion에서도 확인한다.
