-- DAY05 STEP D2: SQL Editor의 postgres 역할에서 실행할 단일 SELECT이다.
-- Remote에는 실행하지 않았다. RPC 호출, 쓰기 문장, private 원문 출력은 없다.
-- fingerprint baseline은 제공되지 않아 NULL이다. 실제 값은 STEP B 결과와 수동 비교한다.
-- CHECK/policy는 실제 정의와 기대 정의를 함께 반환하며 의미 일치는 수동 검토한다.
WITH baseline(story_fingerprint, direction_fingerprint) AS (VALUES (NULL::text, NULL::text)),
expected_columns(table_name,column_name,type_name,nullable,default_expr) AS (VALUES
('projects','last_writing_at','timestamp with time zone',true,NULL),
('projects','last_written_unit_id','uuid',true,NULL),
('projects','manuscript_structure_revision','integer',false,'0'),
('manuscript_units','id','uuid',false,NULL),('manuscript_units','project_id','uuid',false,NULL),
('manuscript_units','position','bigint',false,NULL),('manuscript_units','title','text',true,NULL),
('manuscript_units','content','text',true,NULL),('manuscript_units','content_format','text',false,NULL),
('manuscript_units','revision','integer',false,'0'),('manuscript_units','last_request_id','uuid',true,NULL),
('manuscript_units','deleted_at','timestamp with time zone',true,NULL),('manuscript_units','source_story_id','uuid',true,NULL),
('manuscript_units','creation_request_id','uuid',true,NULL),('manuscript_units','creation_expected_structure_revision','integer',true,NULL),
('manuscript_units','created_at','timestamp with time zone',false,'clock_timestamp()'),
('manuscript_units','updated_at','timestamp with time zone',false,'clock_timestamp()'),
('screenplay_blocks','id','uuid',false,NULL),('screenplay_blocks','unit_id','uuid',false,NULL),
('screenplay_blocks','content_format','text',false,'''SCREENPLAY_BLOCKS''::text'),
('screenplay_blocks','position','integer',false,NULL),('screenplay_blocks','block_type','text',false,NULL),
('screenplay_blocks','content','text',true,NULL),
('screenplay_blocks','created_at','timestamp with time zone',false,'clock_timestamp()'),
('screenplay_blocks','updated_at','timestamp with time zone',false,'clock_timestamp()')),
columns_actual AS (
 SELECT c.relname AS table_name,a.attname AS column_name,pg_catalog.format_type(a.atttypid,a.atttypmod) AS type_name,
 NOT a.attnotnull AS nullable,pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS default_expr
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
 LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
 WHERE n.nspname='public' AND c.relname IN ('projects','manuscript_units','screenplay_blocks')
), column_checks AS (
 SELECT e.*,a.type_name AS actual_type,a.nullable AS actual_nullable,a.default_expr AS actual_default,
 COALESCE(a.type_name=e.type_name AND a.nullable=e.nullable AND
 pg_catalog.replace(a.default_expr,'pg_catalog.','') IS NOT DISTINCT FROM e.default_expr,false) AS pass
 FROM expected_columns e LEFT JOIN columns_actual a USING(table_name,column_name)
), expected_keys(table_name,name,kind,columns,referenced_table,referenced_columns,delete_action,deferred) AS (VALUES
('manuscript_units','manuscript_units_pkey','p',ARRAY['id'],NULL,NULL,' ',false),
('manuscript_units','manuscript_units_project_id_fkey','f',ARRAY['project_id'],'projects',ARRAY['id'],'c',false),
('manuscript_units','manuscript_units_source_story_unique','u',ARRAY['source_story_id'],NULL,NULL,' ',false),
('manuscript_units','manuscript_units_project_creation_request_unique','u',ARRAY['project_id','creation_request_id'],NULL,NULL,' ',false),
('manuscript_units','manuscript_units_project_id_unique','u',ARRAY['project_id','id'],NULL,NULL,' ',false),
('manuscript_units','manuscript_units_id_format_unique','u',ARRAY['id','content_format'],NULL,NULL,' ',false),
('screenplay_blocks','screenplay_blocks_pkey','p',ARRAY['id'],NULL,NULL,' ',false),
('screenplay_blocks','screenplay_blocks_unit_format_fk','f',ARRAY['unit_id','content_format'],'manuscript_units',ARRAY['id','content_format'],'c',false),
('screenplay_blocks','screenplay_blocks_unit_position_unique','u',ARRAY['unit_id','position'],NULL,NULL,' ',false),
('projects','projects_last_written_unit_fk','f',ARRAY['id','last_written_unit_id'],'manuscript_units',ARRAY['project_id','id'],'a',true)
), constraints_actual AS (
 SELECT t.relname AS table_name,c.conname AS name,c.contype::text AS kind,c.convalidated,
 c.condeferrable,c.condeferred,c.confdeltype::text AS delete_action,r.relname AS referenced_table,
 ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,ord)
 JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num ORDER BY k.ord) AS columns,
 ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(num,ord)
 JOIN pg_catalog.pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num ORDER BY k.ord) AS referenced_columns,
 pg_catalog.pg_get_constraintdef(c.oid) AS definition
 FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
 JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace LEFT JOIN pg_catalog.pg_class r ON r.oid=c.confrelid
 WHERE n.nspname='public' AND t.relname IN ('projects','manuscript_units','screenplay_blocks')
), key_checks AS (
 SELECT e.*,a.definition,COALESCE(a.kind=e.kind AND a.columns=e.columns AND a.convalidated
 AND (e.kind<>'f' OR (a.referenced_table=e.referenced_table AND a.referenced_columns=e.referenced_columns
 AND a.delete_action=e.delete_action AND a.condeferrable=e.deferred AND a.condeferred=e.deferred)),false) AS pass
 FROM expected_keys e LEFT JOIN constraints_actual a USING(table_name,name)
), expected_checks(table_name,name,expected_expression) AS (VALUES
('projects','projects_manuscript_structure_revision_valid','manuscript_structure_revision >= 0'),
('projects','projects_writing_pointer_pair_valid','(last_writing_at IS NULL) = (last_written_unit_id IS NULL)'),
('manuscript_units','manuscript_units_position_valid','position > 0'),
('manuscript_units','manuscript_units_title_valid','title IS NULL OR (public.zaggas_text_has_content(title) AND pg_catalog.char_length(title) <= 200)'),
('manuscript_units','manuscript_units_content_format_valid','content_format IN (''PROSE'', ''SCREENPLAY_BLOCKS'')'),
('manuscript_units','manuscript_units_content_valid','(content_format = ''SCREENPLAY_BLOCKS'' AND content IS NULL)
        OR (content_format = ''PROSE'' AND (content IS NULL OR (
            pg_catalog.char_length(content) <= 100000 AND pg_catalog.octet_length(content) <= 1048576
        )))'),
('manuscript_units','manuscript_units_revision_valid','revision >= 0'),
('manuscript_units','manuscript_units_save_request_valid','(revision = 0 AND last_request_id IS NULL) OR (revision > 0 AND last_request_id IS NOT NULL)'),
('manuscript_units','manuscript_units_creation_request_valid','(source_story_id IS NULL AND creation_request_id IS NOT NULL AND creation_expected_structure_revision IS NOT NULL AND creation_expected_structure_revision >= 0)
        OR (creation_request_id IS NULL AND creation_expected_structure_revision IS NULL AND source_story_id IS NOT NULL)'),
('screenplay_blocks','screenplay_blocks_format_valid','content_format = ''SCREENPLAY_BLOCKS'''),
('screenplay_blocks','screenplay_blocks_position_valid','position > 0'),
('screenplay_blocks','screenplay_blocks_type_valid','block_type IN (''SCENE_HEADING'', ''ACTION'', ''CHARACTER'', ''DIALOGUE'')'),
('screenplay_blocks','screenplay_blocks_content_valid','content IS NULL OR pg_catalog.char_length(content) <= 8000')
), check_checks AS (
 SELECT e.*,a.definition,COALESCE(a.kind='c' AND a.convalidated,false) AS existence_pass,
 'REVIEW_REQUIRED: compare expected_expression and definition' AS semantic_verdict
 FROM expected_checks e LEFT JOIN constraints_actual a USING(table_name,name)
), expected_functions(signature,return_type,security_definer,authenticated_execute,body_hash) AS (VALUES
('public.zaggas_projects_set_metadata_updated_at()','trigger',false,false,'e8e40ec56f55a1a5f457bb44df8458a7'),
('public.zaggas_create_manuscript_unit(uuid,uuid,integer,uuid)','jsonb',true,true,'7ac50855ddf1f02d7c1d7c5ad99c1d6a'),
('public.zaggas_save_manuscript_unit_internal(uuid,uuid,text,text,jsonb,integer,uuid)','jsonb',true,false,'c7db70dab6a22f70abee451998a762c5'),
('public.zaggas_save_prose_unit(uuid,uuid,text,integer,uuid)','jsonb',true,true,'55dd2a352ce9e5b9986db2f0214183d9'),
('public.zaggas_save_screenplay_unit(uuid,uuid,jsonb,integer,uuid)','jsonb',true,true,'c633f773f662f598edc88b446d1f441c')
), function_checks AS (
 SELECT e.signature,e.body_hash AS expected_body_hash,p.oid IS NOT NULL AS exists,
 pg_catalog.pg_get_userbyid(p.proowner) AS owner,pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
 pg_catalog.pg_get_function_result(p.oid) AS return_type,p.prosecdef AS security_definer,p.proconfig AS config,
 pg_catalog.md5(pg_catalog.btrim(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),''),E' \t\n\r')) AS actual_body_hash,
 pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
 pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE') AS service_role_execute,
 EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
 WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE') AS public_execute,
 COALESCE(pg_catalog.pg_get_userbyid(p.proowner)='postgres' AND p.prosecdef=e.security_definer
 AND pg_catalog.pg_get_function_result(p.oid)=e.return_type
 AND EXISTS(SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg IN ('search_path=""','search_path='))
 AND pg_catalog.md5(pg_catalog.btrim(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),''),E' \t\n\r'))=e.body_hash
 AND pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')=e.authenticated_execute
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
 WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'),false) AS pass
 FROM expected_functions e LEFT JOIN pg_catalog.pg_proc p ON p.oid=pg_catalog.to_regprocedure(e.signature)
), table_acl AS (
 SELECT t.name AS table_name,r.name AS role,v.name AS privilege,
 pg_catalog.has_table_privilege(r.name,pg_catalog.to_regclass('public.'||t.name),v.name) AS allowed,
 COALESCE(pg_catalog.has_table_privilege(r.name,pg_catalog.to_regclass('public.'||t.name),v.name)
 = (r.name='authenticated' AND v.name='SELECT'),false) AS pass
 FROM (VALUES('manuscript_units'),('screenplay_blocks')) t(name)
 CROSS JOIN (VALUES('anon'),('authenticated'),('service_role')) r(name)
 CROSS JOIN (VALUES('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(name)
), fingerprints AS (
 SELECT (SELECT pg_catalog.md5(COALESCE(pg_catalog.string_agg(pg_catalog.md5(pg_catalog.jsonb_build_array(
 s.id,s.owner_id,s.project_id,s.title,s.content,s.created_at,s.updated_at)::text),'' ORDER BY s.id),'')) FROM public.stories s) AS story,
 (SELECT pg_catalog.md5(COALESCE(pg_catalog.string_agg(pg_catalog.md5(pg_catalog.to_jsonb(a)::text),'' ORDER BY a.project_id,a.question_key),'')) FROM public.project_story_direction_answers a) AS direction
), counts AS (
 SELECT (SELECT count(*) FROM public.projects) AS projects,(SELECT count(*) FROM public.stories) AS stories,
 (SELECT count(*) FROM public.project_story_direction_answers) AS direction,
 (SELECT count(*) FROM public.manuscript_units) AS units,(SELECT count(*) FROM public.screenplay_blocks) AS blocks,
 (SELECT count(*) FROM public.manuscript_units WHERE source_story_id IS NOT NULL) AS legacy_units,
 (SELECT count(*) FROM public.stories s LEFT JOIN public.projects p ON p.id=s.project_id WHERE p.id IS NULL) AS missing_project,
 (SELECT count(*) FROM public.stories s JOIN public.projects p ON p.id=s.project_id WHERE s.owner_id IS DISTINCT FROM p.owner_id) AS owner_mismatch,
 (SELECT count(*) FROM public.stories WHERE owner_id IS NULL OR project_id IS NULL) AS null_story_relation,
 (SELECT count(*) FROM (SELECT project_id FROM public.stories GROUP BY project_id HAVING count(*)>1) many) AS multiple_story_projects,
 (SELECT count(*) FROM public.projects WHERE last_writing_at IS NOT NULL OR last_written_unit_id IS NOT NULL OR manuscript_structure_revision<>0) AS noninitial_project_state
)
SELECT pg_catalog.jsonb_build_object(
 'scope','00003 post-schema; 00004 not applied; metadata verification only',
 'columns',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c) ORDER BY table_name,column_name) FROM column_checks c),
 'unexpected_new_table_columns',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a)),'[]'::jsonb) FROM columns_actual a WHERE a.table_name<>'projects' AND NOT EXISTS(SELECT 1 FROM expected_columns e WHERE e.table_name=a.table_name AND e.column_name=a.column_name)),
 'keys',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(k) ORDER BY table_name,name) FROM key_checks k),
 'checks_manual_review',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c) ORDER BY table_name,name) FROM check_checks c),
 'all_constraints',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c) ORDER BY table_name,name) FROM constraints_actual c),
 'indexes',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('table',t.relname,'name',i.relname,
 'unique',x.indisunique,'valid',x.indisvalid,'ready',x.indisready,'definition',pg_catalog.pg_get_indexdef(x.indexrelid),
 'predicate',pg_catalog.pg_get_expr(x.indpred,x.indrelid)) ORDER BY t.relname,i.relname)
 FROM pg_catalog.pg_index x JOIN pg_catalog.pg_class t ON t.oid=x.indrelid JOIN pg_catalog.pg_class i ON i.oid=x.indexrelid
 JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND t.relname IN ('projects','manuscript_units','screenplay_blocks')),
 'active_position_index',(SELECT pg_catalog.jsonb_build_object('exists',count(*)=1,'pass',COALESCE(bool_and(x.indisunique AND x.indisvalid AND x.indisready
 AND pg_catalog.pg_get_expr(x.indpred,x.indrelid) IN ('(deleted_at IS NULL)','deleted_at IS NULL')
 AND ARRAY(SELECT a.attname::text FROM unnest(x.indkey::smallint[]) WITH ORDINALITY k(num,ord) JOIN pg_catalog.pg_attribute a ON a.attrelid=x.indrelid AND a.attnum=k.num ORDER BY k.ord)=ARRAY['project_id','position']),false))
 FROM pg_catalog.pg_index x WHERE x.indexrelid=pg_catalog.to_regclass('public.manuscript_units_active_position_unique') AND x.indrelid=pg_catalog.to_regclass('public.manuscript_units')),
 'triggers',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('table',c.relname,'name',t.tgname,'enabled',t.tgenabled,
 'function',t.tgfoid::regprocedure::text,'definition',pg_catalog.pg_get_triggerdef(t.oid),
 'pass',t.tgenabled='O' AND t.tgtype=19 AND t.tgfoid=pg_catalog.to_regprocedure(CASE WHEN c.relname='projects' THEN 'public.zaggas_projects_set_metadata_updated_at()' ELSE 'public.zaggas_stories_set_updated_at()' END)) ORDER BY c.relname,t.tgname)
 FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname IN ('projects','stories')),
 'rls',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('table',e.name,'exists',c.oid IS NOT NULL,'enabled',c.relrowsecurity,'owner',pg_catalog.pg_get_userbyid(c.relowner),'pass',COALESCE(c.relrowsecurity,false)))
 FROM (VALUES('projects'),('stories'),('project_story_direction_answers'),('manuscript_units'),('screenplay_blocks')) e(name)
 LEFT JOIN pg_catalog.pg_class c ON c.oid=pg_catalog.to_regclass('public.'||e.name)),
 'policies',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('table',tablename,'name',policyname,'roles',roles,'command',cmd,'permissive',permissive,'using',qual,'check',with_check) ORDER BY tablename,policyname)
 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename IN ('projects','stories','project_story_direction_answers','manuscript_units','screenplay_blocks')),
 'policy_contract','Each new table must have exactly one authenticated SELECT policy; inspect owner/auth.uid and active deleted_at condition; no write policy.',
 'table_acl',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY table_name,role,privilege) FROM table_acl a),
 'public_table_acl',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('table',c.relname,'privilege',a.privilege_type)),'[]'::jsonb)
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
 WHERE n.nspname='public' AND c.relname IN ('manuscript_units','screenplay_blocks') AND a.grantee=0),
 'column_acl',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('table',c.table_name,'column',c.column_name,'role',r.name,'privilege',v.name,
 'allowed',pg_catalog.has_column_privilege(r.name,'public.'||c.table_name,c.column_name,v.name),
 'pass',pg_catalog.has_column_privilege(r.name,'public.'||c.table_name,c.column_name,v.name)=(r.name='authenticated' AND v.name='SELECT')) ORDER BY c.table_name,c.column_name,r.name,v.name)
 FROM columns_actual c CROSS JOIN (VALUES('anon'),('authenticated'),('service_role')) r(name)
 CROSS JOIN (VALUES('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) v(name) WHERE c.table_name<>'projects'),
 'public_column_acl',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('table',c.relname,'column',a.attname,'privilege',acl.privilege_type)),'[]'::jsonb)
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
 CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) acl WHERE n.nspname='public' AND c.relname IN ('manuscript_units','screenplay_blocks') AND acl.grantee=0),
 'expected_trigger_presence',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('table',e.table_name,'name',e.name,'pass',EXISTS(
 SELECT 1 FROM pg_catalog.pg_trigger t WHERE t.tgrelid=pg_catalog.to_regclass('public.'||e.table_name) AND t.tgname=e.name
 AND NOT t.tgisinternal AND t.tgenabled='O' AND t.tgtype=19 AND t.tgfoid=pg_catalog.to_regprocedure(e.signature))))
 FROM (VALUES('projects','zaggas_projects_before_update_set_updated_at','public.zaggas_projects_set_metadata_updated_at()'),
 ('stories','zaggas_stories_before_update_set_updated_at','public.zaggas_stories_set_updated_at()')) e(table_name,name,signature)),
 'expected_policy_shape',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('table',e.table_name,'name',e.name,
 'shape_pass',EXISTS(SELECT 1 FROM pg_catalog.pg_policies p WHERE p.schemaname='public' AND p.tablename=e.table_name AND p.policyname=e.name
 AND p.cmd='SELECT' AND p.roles=ARRAY['authenticated']::name[] AND p.permissive='PERMISSIVE' AND p.with_check IS NULL
 AND p.qual LIKE '%auth.uid()%' AND p.qual LIKE '%owner_id%' AND p.qual LIKE '%deleted_at IS NULL%'),
 'exact_policy_count_pass',(SELECT count(*)=1 FROM pg_catalog.pg_policies p WHERE p.schemaname='public' AND p.tablename=e.table_name)))
 FROM (VALUES('manuscript_units','manuscript_units_select_own'),('screenplay_blocks','screenplay_blocks_select_own')) e(table_name,name)),
 'project_state_column_acl',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('column',e.column_name,
 'insert',pg_catalog.has_column_privilege('authenticated','public.projects',e.column_name,'INSERT'),
 'update',pg_catalog.has_column_privilege('authenticated','public.projects',e.column_name,'UPDATE')))
 FROM expected_columns e WHERE e.table_name='projects'),
 'functions',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(f) ORDER BY signature) FROM function_checks f),
 'existing_rpc',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('name',e.name,'exists',p.oid IS NOT NULL,'signature',p.oid::regprocedure::text,
 'body_matches_repository',pg_catalog.md5(pg_catalog.btrim(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),''),E' \t\n\r'))=e.hash) ORDER BY e.name)
 FROM (VALUES('zaggas_complete_onboarding','3addac3bfbe8ad69837738b27b845157'),('zaggas_create_project_manuscript','7d01cab15d77875d132d3cd803fa3c94'),
 ('zaggas_create_titled_project_manuscript','0329c52298c341d714ae646e6fd02a8f'),('zaggas_save_story_direction_answer','a3837088d55b4fdae58e50903ebe08b6')) e(name,hash)
 LEFT JOIN pg_catalog.pg_proc p ON p.proname=e.name AND p.pronamespace=pg_catalog.to_regnamespace('public')),
 'counts',(SELECT pg_catalog.to_jsonb(c) || pg_catalog.jsonb_build_object('pass',projects=32 AND stories=8 AND direction=4 AND units=0 AND blocks=0 AND legacy_units=0 AND missing_project=0 AND owner_mismatch=0 AND null_story_relation=0 AND multiple_story_projects=0 AND noninitial_project_state=0) FROM counts c),
 'fingerprints',(SELECT pg_catalog.jsonb_build_object('story',f.story,'direction',f.direction,'story_matches_baseline',f.story=b.story_fingerprint,'direction_matches_baseline',f.direction=b.direction_fingerprint,
 'verdict',CASE WHEN b.story_fingerprint IS NULL OR b.direction_fingerprint IS NULL THEN 'UNVERIFIED: compare with STEP B baseline' ELSE 'Compare match fields' END) FROM fingerprints f CROSS JOIN baseline b),
 'automated_metadata_pass',(SELECT bool_and(pass) FROM column_checks) AND (SELECT bool_and(pass) FROM key_checks) AND (SELECT bool_and(existence_pass) FROM check_checks)
 AND (SELECT bool_and(pass) FROM function_checks) AND (SELECT bool_and(pass) FROM table_acl),
 'final_review_required','CHECK semantics, policy semantics, trigger presence, index details, unexpected grants/objects and baseline fingerprints must also be reviewed; automated_metadata_pass alone is not final PASS.'
) AS verification;
