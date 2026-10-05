-- DAY05 STEP B: SELECT 전용 remote 사전 점검. 전체 실행은 조회만 수행한다.
-- 본문/제목/개인정보는 출력하지 않고 건수와 fingerprint만 반환한다.
WITH story_stats AS (
    SELECT pg_catalog.count(*) AS total,
        pg_catalog.count(*) FILTER (WHERE s.project_id IS NOT NULL) AS project_linked,
        pg_catalog.count(*) FILTER (WHERE s.owner_id IS NULL) AS owner_null,
        pg_catalog.count(*) FILTER (WHERE s.project_id IS NULL) AS project_null,
        pg_catalog.count(*) FILTER (WHERE s.project_id IS NOT NULL AND p.id IS NULL) AS missing_project,
        pg_catalog.count(*) FILTER (WHERE s.project_id IS NOT NULL AND s.owner_id IS DISTINCT FROM p.owner_id) AS owner_mismatch,
        pg_catalog.count(*) FILTER (WHERE p.creation_type = 'SCREENPLAY') AS screenplay_stories,
        pg_catalog.count(*) FILTER (WHERE NOT public.zaggas_text_has_content(s.content)
            OR NOT public.zaggas_text_has_content(s.title)
            OR pg_catalog.char_length(s.content) > 100000 OR pg_catalog.char_length(s.title) > 200) AS invalid_rows,
        pg_catalog.md5(COALESCE(pg_catalog.string_agg(pg_catalog.md5(pg_catalog.jsonb_build_array(
            s.id, s.owner_id, s.project_id, s.title, s.content, s.created_at, s.updated_at)::text), '' ORDER BY s.id), '')) AS fingerprint
    FROM public.stories s LEFT JOIN public.projects p ON p.id = s.project_id
), project_story_counts AS (
    SELECT p.id, pg_catalog.count(s.id) AS story_count
    FROM public.projects p LEFT JOIN public.stories s ON s.project_id = p.id GROUP BY p.id
), object_stats AS (
    SELECT pg_catalog.to_regclass('public.manuscript_units') IS NOT NULL AS units_exists,
        pg_catalog.to_regclass('public.screenplay_blocks') IS NOT NULL AS blocks_exists,
        (SELECT pg_catalog.count(*) FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'projects'
                AND column_name IN ('last_writing_at', 'last_written_unit_id', 'manuscript_structure_revision')) AS new_project_columns,
        (SELECT pg_catalog.count(*) FROM pg_catalog.pg_proc f JOIN pg_catalog.pg_namespace n ON n.oid = f.pronamespace
            WHERE n.nspname = 'public' AND f.proname IN ('zaggas_create_manuscript_unit',
                'zaggas_save_manuscript_unit_internal', 'zaggas_save_prose_unit', 'zaggas_save_screenplay_unit',
                'zaggas_projects_set_metadata_updated_at')) AS new_function_collisions
)
SELECT pg_catalog.jsonb_build_object(
    'postgres_version', pg_catalog.current_setting('server_version'),
    'project_state', (SELECT pg_catalog.jsonb_build_object(
        'title_null', pg_catalog.count(*) FILTER (WHERE title IS NULL),
        'creation_type_null', pg_catalog.count(*) FILTER (WHERE creation_type IS NULL),
        'updated_at_null', pg_catalog.count(*) FILTER (WHERE updated_at IS NULL),
        'updated_at_before_created_at', pg_catalog.count(*) FILTER (WHERE updated_at < created_at),
        'earliest_updated_at', pg_catalog.min(updated_at), 'latest_updated_at', pg_catalog.max(updated_at),
        'fingerprint', pg_catalog.md5(COALESCE(pg_catalog.string_agg(pg_catalog.md5(pg_catalog.jsonb_build_array(
            id, owner_id, title, seed_sentence, creation_type, created_at, updated_at)::text), '' ORDER BY id), '')))
        FROM public.projects),
    'story_content_state', (SELECT pg_catalog.jsonb_build_object(
        'title_null', pg_catalog.count(*) FILTER (WHERE title IS NULL),
        'content_null', pg_catalog.count(*) FILTER (WHERE content IS NULL),
        'min_code_points', pg_catalog.min(pg_catalog.char_length(content)),
        'max_code_points', pg_catalog.max(pg_catalog.char_length(content)),
        'total_code_points', COALESCE(pg_catalog.sum(pg_catalog.char_length(content)), 0),
        'max_bytes', pg_catalog.max(pg_catalog.octet_length(content)),
        'over_prose_byte_limit', pg_catalog.count(*) FILTER (WHERE pg_catalog.octet_length(content) > 1048576),
        'length_0', pg_catalog.count(*) FILTER (WHERE pg_catalog.char_length(content) = 0),
        'length_1_to_1000', pg_catalog.count(*) FILTER (WHERE pg_catalog.char_length(content) BETWEEN 1 AND 1000),
        'length_1001_to_10000', pg_catalog.count(*) FILTER (WHERE pg_catalog.char_length(content) BETWEEN 1001 AND 10000),
        'length_10001_to_100000', pg_catalog.count(*) FILTER (WHERE pg_catalog.char_length(content) BETWEEN 10001 AND 100000),
        'length_over_100000', pg_catalog.count(*) FILTER (WHERE pg_catalog.char_length(content) > 100000)) FROM public.stories),
    'story_creation_type_distribution', (SELECT COALESCE(pg_catalog.jsonb_object_agg(type_label, total), '{}'::jsonb)
        FROM (SELECT CASE WHEN p.id IS NULL THEN 'UNLINKED' ELSE COALESCE(p.creation_type, 'NULL') END AS type_label,
            pg_catalog.count(*) AS total FROM public.stories s LEFT JOIN public.projects p ON p.id = s.project_id
            GROUP BY CASE WHEN p.id IS NULL THEN 'UNLINKED' ELSE COALESCE(p.creation_type, 'NULL') END) distribution),
    'direction_state', (SELECT pg_catalog.jsonb_build_object('total', pg_catalog.count(*),
        'missing_project', pg_catalog.count(*) FILTER (WHERE p.id IS NULL),
        'invalid_owner_profile', pg_catalog.count(*) FILTER (WHERE p.id IS NOT NULL AND profile.user_id IS NULL),
        'fingerprint', pg_catalog.md5(COALESCE(pg_catalog.string_agg(pg_catalog.md5(pg_catalog.to_jsonb(a)::text), ''
            ORDER BY a.project_id, a.question_key), '')))
        FROM public.project_story_direction_answers a LEFT JOIN public.projects p ON p.id = a.project_id
        LEFT JOIN public.profiles profile ON profile.user_id = p.owner_id),
    'per_project_story_counts', (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'project_token', pg_catalog.md5(id::text), 'count', story_count) ORDER BY id), '[]'::jsonb) FROM project_story_counts),
    'new_function_collision_details', (SELECT COALESCE(pg_catalog.jsonb_agg(f.oid::regprocedure::text ORDER BY f.proname), '[]'::jsonb)
        FROM pg_catalog.pg_proc f JOIN pg_catalog.pg_namespace n ON n.oid = f.pronamespace
        WHERE n.nspname = 'public' AND f.proname IN ('zaggas_create_manuscript_unit', 'zaggas_save_manuscript_unit_internal',
            'zaggas_save_prose_unit', 'zaggas_save_screenplay_unit', 'zaggas_projects_set_metadata_updated_at')),
    'default_acl', (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'owner', pg_catalog.pg_get_userbyid(d.defaclrole), 'schema', COALESCE(n.nspname, 'ALL'),
        'object_type', d.defaclobjtype, 'acl', d.defaclacl) ORDER BY d.defaclrole, d.defaclnamespace, d.defaclobjtype), '[]'::jsonb)
        FROM pg_catalog.pg_default_acl d LEFT JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace
        WHERE (d.defaclnamespace = 0 OR n.nspname = 'public') AND d.defaclobjtype IN ('r', 'f')),
    'new_relation_collisions', (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'name', c.relname, 'kind', c.relkind) ORDER BY c.relname), '[]'::jsonb)
        FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname IN ('manuscript_units', 'screenplay_blocks',
            'manuscript_units_pkey', 'manuscript_units_source_story_unique',
            'manuscript_units_project_creation_request_unique', 'manuscript_units_project_id_unique',
            'manuscript_units_id_format_unique', 'manuscript_units_active_position_unique',
            'screenplay_blocks_pkey', 'screenplay_blocks_unit_position_unique')),
    'new_project_constraint_collisions', (SELECT COALESCE(pg_catalog.jsonb_agg(c.conname ORDER BY c.conname), '[]'::jsonb)
        FROM pg_catalog.pg_constraint c WHERE c.conrelid = 'public.projects'::regclass AND c.conname IN (
            'projects_manuscript_structure_revision_valid', 'projects_writing_pointer_pair_valid', 'projects_last_written_unit_fk')),
    'project_trigger_baseline', (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'name', t.tgname, 'enabled', t.tgenabled, 'function', t.tgfoid::regprocedure::text,
        'definition', pg_catalog.pg_get_triggerdef(t.oid)) ORDER BY t.tgname), '[]'::jsonb)
        FROM pg_catalog.pg_trigger t WHERE t.tgrelid = 'public.projects'::regclass AND NOT t.tgisinternal),
    'relevant_table_raw_acl', (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'table', c.relname, 'owner', pg_catalog.pg_get_userbyid(c.relowner), 'acl', c.relacl) ORDER BY c.relname)
        FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname IN ('projects', 'stories', 'project_story_direction_answers')),
    'relevant_role_inheritance', (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'member', member_role.rolname, 'parent', parent_role.rolname) ORDER BY member_role.rolname, parent_role.rolname), '[]'::jsonb)
        FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles member_role ON member_role.oid = m.member
        JOIN pg_catalog.pg_roles parent_role ON parent_role.oid = m.roleid
        WHERE member_role.rolname IN ('anon', 'authenticated', 'service_role')),
    'stories', (SELECT pg_catalog.to_jsonb(s) FROM story_stats s),
    'project_count', (SELECT pg_catalog.count(*) FROM public.projects),
    'project_story_distribution', (SELECT pg_catalog.jsonb_build_object(
        'zero', pg_catalog.count(*) FILTER (WHERE story_count = 0),
        'one', pg_catalog.count(*) FILTER (WHERE story_count = 1),
        'multiple', pg_catalog.count(*) FILTER (WHERE story_count > 1)) FROM project_story_counts),
    'creation_type_distribution', (SELECT COALESCE(pg_catalog.jsonb_object_agg(type_label, total), '{}'::jsonb)
        FROM (SELECT COALESCE(creation_type, 'NULL') AS type_label, pg_catalog.count(*) AS total
            FROM public.projects GROUP BY creation_type) distribution),
    'new_object_collisions', (SELECT pg_catalog.to_jsonb(o) FROM object_stats o),
    'existing_columns', (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'table', table_name, 'column', column_name, 'type', data_type, 'nullable', is_nullable,
        'default', column_default) ORDER BY table_name, ordinal_position)
        FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('projects', 'stories', 'project_story_direction_answers')),
    'rls', (SELECT pg_catalog.jsonb_object_agg(c.relname, c.relrowsecurity)
        FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname IN ('projects', 'stories', 'project_story_direction_answers')),
    'policies', (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'table', tablename, 'name', policyname, 'roles', roles, 'command', cmd, 'using', qual, 'check', with_check)
        ORDER BY tablename, policyname) FROM pg_catalog.pg_policies
        WHERE schemaname = 'public' AND tablename IN ('projects', 'stories', 'project_story_direction_answers')),
    'constraints', (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'table', c.conrelid::regclass::text, 'name', c.conname, 'definition', pg_catalog.pg_get_constraintdef(c.oid)) ORDER BY c.conname)
        FROM pg_catalog.pg_constraint c WHERE c.conrelid IN ('public.projects'::regclass, 'public.stories'::regclass, 'public.project_story_direction_answers'::regclass)),
    'indexes', (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'table', tablename, 'name', indexname, 'definition', indexdef) ORDER BY tablename, indexname)
        FROM pg_catalog.pg_indexes WHERE schemaname = 'public' AND tablename IN ('projects', 'stories', 'project_story_direction_answers')),
    'triggers', (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'table', t.tgrelid::regclass::text, 'name', t.tgname, 'enabled', t.tgenabled,
        'definition', pg_catalog.pg_get_triggerdef(t.oid),
        'function_hash', pg_catalog.md5(pg_catalog.pg_get_functiondef(t.tgfoid))) ORDER BY t.tgname)
        FROM pg_catalog.pg_trigger t WHERE NOT t.tgisinternal
            AND t.tgrelid IN ('public.projects'::regclass, 'public.stories'::regclass, 'public.project_story_direction_answers'::regclass)),
    'table_privileges', (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'table', t.table_name, 'role', r.role_name,
        'select', pg_catalog.has_table_privilege(r.role_name, 'public.' || t.table_name, 'SELECT'),
        'insert', pg_catalog.has_table_privilege(r.role_name, 'public.' || t.table_name, 'INSERT'),
        'update', pg_catalog.has_table_privilege(r.role_name, 'public.' || t.table_name, 'UPDATE'),
        'delete', pg_catalog.has_table_privilege(r.role_name, 'public.' || t.table_name, 'DELETE')) ORDER BY t.table_name, r.role_name)
        FROM (VALUES ('projects'), ('stories'), ('project_story_direction_answers')) t(table_name)
        CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) r(role_name)),
    'column_privileges', (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'table', c.table_name, 'column', c.column_name, 'role', r.role_name,
        'insert', pg_catalog.has_column_privilege(r.role_name, 'public.' || c.table_name, c.column_name, 'INSERT'),
        'update', pg_catalog.has_column_privilege(r.role_name, 'public.' || c.table_name, c.column_name, 'UPDATE'))
        ORDER BY c.table_name, c.ordinal_position, r.role_name)
        FROM information_schema.columns c CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) r(role_name)
        WHERE c.table_schema = 'public' AND c.table_name IN ('projects', 'stories', 'project_story_direction_answers')),
    'existing_rpc', (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'signature', f.oid::regprocedure::text, 'owner', pg_catalog.pg_get_userbyid(f.proowner),
        'security_definer', f.prosecdef, 'config', f.proconfig,
        'definition_hash', pg_catalog.md5(pg_catalog.pg_get_functiondef(f.oid)),
        'body_hash', pg_catalog.md5(pg_catalog.btrim(pg_catalog.replace(f.prosrc, pg_catalog.chr(13), ''), E' \t\n\r')),
        'repository_body_matches', pg_catalog.md5(pg_catalog.btrim(pg_catalog.replace(f.prosrc, pg_catalog.chr(13), ''), E' \t\n\r')) = baseline.body_hash,
        'authenticated_execute', pg_catalog.has_function_privilege('authenticated', f.oid, 'EXECUTE'),
        'anon_execute', pg_catalog.has_function_privilege('anon', f.oid, 'EXECUTE'),
        'service_role_execute', pg_catalog.has_function_privilege('service_role', f.oid, 'EXECUTE'),
        'public_execute', EXISTS (SELECT 1 FROM pg_catalog.aclexplode(
            COALESCE(f.proacl, pg_catalog.acldefault('f', f.proowner))) acl
            WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE')) ORDER BY f.proname)
        FROM pg_catalog.pg_proc f JOIN pg_catalog.pg_namespace n ON n.oid = f.pronamespace
        JOIN (VALUES ('zaggas_complete_onboarding', '3addac3bfbe8ad69837738b27b845157'),
            ('zaggas_create_project_manuscript', '7d01cab15d77875d132d3cd803fa3c94'),
            ('zaggas_create_titled_project_manuscript', '0329c52298c341d714ae646e6fd02a8f'),
            ('zaggas_save_story_direction_answer', 'a3837088d55b4fdae58e50903ebe08b6')) AS baseline(function_name, body_hash) ON baseline.function_name = f.proname
        WHERE n.nspname = 'public' AND f.proname IN ('zaggas_complete_onboarding',
            'zaggas_create_project_manuscript', 'zaggas_create_titled_project_manuscript', 'zaggas_save_story_direction_answer'))
) AS preflight;
