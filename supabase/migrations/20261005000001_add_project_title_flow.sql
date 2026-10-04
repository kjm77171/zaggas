-- DAY 04 draft only. Apply only after remote preflight and explicit approval.
-- Preserve all existing titles and Story snapshots. No backfill or normalization.
BEGIN;

ALTER TABLE public.projects
    ALTER COLUMN title DROP NOT NULL,
    DROP CONSTRAINT projects_title_valid,
    ADD CONSTRAINT projects_title_valid CHECK (
        title IS NULL
        OR (public.zaggas_text_has_content(title) AND char_length(title) <= 200)
    );

-- Preserve onboarding behavior; only new Project title changes to NULL.
CREATE OR REPLACE FUNCTION public.zaggas_complete_onboarding(
    draft_id uuid,
    interest_codes text[],
    seed_sentence text,
    guest_messages jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    current_user_id uuid := auth.uid();
    existing_project_id uuid;
    new_project_id uuid;
    new_conversation_id uuid;
    current_interests text[];
    merged_interests text[];
    already_onboarded boolean;
    message_item jsonb;
    message_position integer := 0;
    expected_role text;
    total_length integer := 0;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    IF draft_id IS NULL THEN
        RAISE EXCEPTION 'draft_id is required' USING ERRCODE = '22023';
    END IF;
    IF interest_codes IS NULL OR NOT public.zaggas_interest_codes_valid(interest_codes)
        OR cardinality(interest_codes) = 0 THEN
        RAISE EXCEPTION 'Invalid interest_codes' USING ERRCODE = '22023';
    END IF;
    IF seed_sentence IS NULL OR NOT public.zaggas_text_has_content(seed_sentence) OR char_length(seed_sentence) > 500 THEN
        RAISE EXCEPTION 'Invalid seed_sentence' USING ERRCODE = '22023';
    END IF;
    IF guest_messages IS NULL OR jsonb_typeof(guest_messages) <> 'array' THEN
        RAISE EXCEPTION 'guest_messages must be an array' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(guest_messages) > 5 OR octet_length(guest_messages::text) > 100000 THEN
        RAISE EXCEPTION 'Guest transcript too large' USING ERRCODE = '22023';
    END IF;
    FOR message_item IN SELECT value FROM jsonb_array_elements(guest_messages) LOOP
        IF jsonb_typeof(message_item) <> 'object' THEN
            RAISE EXCEPTION 'Invalid guest message object' USING ERRCODE = '22023';
        END IF;
        IF EXISTS (SELECT 1 FROM jsonb_object_keys(message_item) AS keys(key) WHERE key NOT IN ('role', 'content'))
            OR jsonb_typeof(message_item -> 'role') IS DISTINCT FROM 'string'
            OR jsonb_typeof(message_item -> 'content') IS DISTINCT FROM 'string'
            OR (message_item ->> 'role') NOT IN ('user', 'assistant')
            OR NOT public.zaggas_text_has_content(message_item ->> 'content')
            OR char_length(message_item ->> 'content') > 4000 THEN
            RAISE EXCEPTION 'Invalid guest message fields' USING ERRCODE = '22023';
        END IF;
        message_position := message_position + 1;
        IF message_position % 2 = 1 THEN
            expected_role := 'user';
        ELSE
            expected_role := 'assistant';
        END IF;
        IF (message_item ->> 'role') <> expected_role THEN
            RAISE EXCEPTION 'Guest message roles must alternate, beginning with user' USING ERRCODE = '22023';
        END IF;
        total_length := total_length + char_length(message_item ->> 'content');
    END LOOP;
    IF total_length > 12000 THEN
        RAISE EXCEPTION 'Guest transcript too long' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.profiles(user_id) VALUES (current_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    -- Serialize concurrent requests for this user; a failed invocation rolls back all writes.
    SELECT p.interest_codes, p.onboarding_completed INTO current_interests, already_onboarded
    FROM public.profiles p WHERE p.user_id = current_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile unavailable' USING ERRCODE = '42501';
    END IF;
    SELECT p.id INTO existing_project_id FROM public.projects p
    WHERE p.owner_id = current_user_id AND p.onboarding_draft_id = draft_id;
    IF FOUND THEN
        RETURN existing_project_id;
    END IF;

    INSERT INTO public.projects(owner_id, title, seed_sentence, onboarding_draft_id, initial_interest_codes, creation_type)
    VALUES (current_user_id, NULL, seed_sentence, draft_id, interest_codes, NULL)
    ON CONFLICT (owner_id, onboarding_draft_id) DO NOTHING
    RETURNING id INTO new_project_id;
    IF new_project_id IS NULL THEN
        SELECT p.id INTO new_project_id FROM public.projects p
        WHERE p.owner_id = current_user_id AND p.onboarding_draft_id = draft_id;
        IF new_project_id IS NULL THEN
            RAISE EXCEPTION 'Retry onboarding' USING ERRCODE = '40001';
        END IF;
        RETURN new_project_id;
    END IF;

    IF jsonb_array_length(guest_messages) > 0 THEN
        INSERT INTO public.ai_conversations(project_id) VALUES (new_project_id) RETURNING id INTO new_conversation_id;
        INSERT INTO public.ai_messages(conversation_id, sequence_no, role, content, origin)
        SELECT new_conversation_id, entry.position::integer, entry.message ->> 'role',
            entry.message ->> 'content', 'guest_import'
        FROM jsonb_array_elements(guest_messages) WITH ORDINALITY AS entry(message, position);
    END IF;

    -- Merge only during initial onboarding. Concrete interests supersede 'unsure'.
    -- Later drafts create Projects but never silently overwrite established profile interests.
    IF NOT already_onboarded THEN
        SELECT array_agg(DISTINCT item.code ORDER BY item.code) INTO merged_interests
        FROM unnest(current_interests || interest_codes) AS item(code)
        WHERE item.code <> 'unsure';
        IF merged_interests IS NULL THEN
            merged_interests := ARRAY['unsure']::text[];
        END IF;
        UPDATE public.profiles SET interest_codes = merged_interests, onboarding_completed = true
        WHERE user_id = current_user_id;
    END IF;
    RETURN new_project_id;
END;
$$;
ALTER FUNCTION public.zaggas_complete_onboarding(uuid, text[], text, jsonb) OWNER TO postgres;
REVOKE ALL PRIVILEGES ON FUNCTION public.zaggas_complete_onboarding(uuid, text[], text, jsonb)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.zaggas_complete_onboarding(uuid, text[], text, jsonb) TO authenticated;

-- Existing three-argument manuscript RPC remains unchanged.
-- This new RPC only creates an untitled Project's first manuscript.
CREATE FUNCTION public.zaggas_create_titled_project_manuscript(
    p_project_id uuid,
    p_story_id uuid,
    p_content text,
    p_title text,
    p_expected_project_updated_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    current_user_id uuid := auth.uid();
    locked_project public.projects%ROWTYPE;
    candidate public.stories%ROWTYPE;
    manuscript public.stories%ROWTYPE;
    manuscript_count integer := 0;
    result_status text;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    -- A fresh post-lock snapshot is required to see a preceding creator's commit.
    IF pg_catalog.current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION 'Read committed isolation required' USING ERRCODE = '0A000';
    END IF;
    IF p_project_id IS NULL OR p_story_id IS NULL THEN
        RAISE EXCEPTION 'Project and manuscript IDs are required' USING ERRCODE = '22023';
    END IF;
    IF p_content IS NULL OR NOT public.zaggas_text_has_content(p_content)
        OR pg_catalog.char_length(p_content) > 100000 THEN
        RAISE EXCEPTION 'Invalid manuscript content' USING ERRCODE = '22023';
    END IF;

    IF p_title IS NULL OR NOT public.zaggas_text_has_content(p_title)
        OR pg_catalog.char_length(p_title) > 200 THEN
        RAISE EXCEPTION 'Invalid project title' USING ERRCODE = '22023';
    END IF;
    IF p_expected_project_updated_at IS NULL THEN
        RAISE EXCEPTION 'Expected project timestamp is required' USING ERRCODE = '22023';
    END IF;

    -- Serialize creators. Missing and other-owner Projects return the same error.
    SELECT p.* INTO locked_project
    FROM public.projects AS p
    WHERE p.id = p_project_id AND p.owner_id = current_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project unavailable' USING ERRCODE = '42501';
    END IF;

    -- Inspect all linked rows; never hide inconsistent ownership.
    -- LIMIT 2 distinguishes 0/1/multiple; ordering only stabilizes lock acquisition.
    -- Story locks protect retry comparison from simultaneous UPDATE/DELETE.
    FOR candidate IN
        SELECT s.* FROM public.stories AS s
        WHERE s.project_id = p_project_id
        ORDER BY s.id
        LIMIT 2
        FOR UPDATE
    LOOP
        manuscript_count := manuscript_count + 1;
        IF manuscript_count = 1 THEN
            manuscript := candidate;
        END IF;
    END LOOP;

    IF manuscript_count >= 2 THEN
        RAISE EXCEPTION 'Multiple manuscripts require review' USING ERRCODE = '55000';
    ELSIF manuscript_count = 1 THEN
        IF manuscript.owner_id IS DISTINCT FROM current_user_id
            OR manuscript.project_id IS DISTINCT FROM p_project_id
            OR manuscript.id IS DISTINCT FROM p_story_id THEN
            RAISE EXCEPTION 'A manuscript already exists or the request is unavailable' USING ERRCODE = '55000';
        END IF;
        -- Identical stored content is required for retry success; no implicit UPDATE.
        IF manuscript.content IS DISTINCT FROM p_content
            OR manuscript.title IS DISTINCT FROM p_title THEN
            RAISE EXCEPTION 'Manuscript snapshot differs; reload before saving' USING ERRCODE = '40001';
        END IF;
        result_status := 'existing_retry';
    ELSE
        -- Retry above intentionally precedes these checks: creation changes Project.updated_at.
        IF locked_project.title IS NOT NULL THEN
            RAISE EXCEPTION 'Project already has a title; reload before saving' USING ERRCODE = '40001';
        END IF;
        IF locked_project.updated_at IS DISTINCT FROM p_expected_project_updated_at THEN
            RAISE EXCEPTION 'Project changed; reload before saving' USING ERRCODE = '40001';
        END IF;

        -- Include both writes in the same exception subtransaction. Any INSERT failure
        -- rolls back the title UPDATE; uncaught errors also abort the RPC transaction.
        BEGIN
            UPDATE public.projects AS p SET title = p_title
            WHERE p.id = p_project_id AND p.owner_id = current_user_id
            RETURNING p.* INTO locked_project;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Project unavailable' USING ERRCODE = '42501';
            END IF;

            INSERT INTO public.stories AS s (id, owner_id, project_id, title, content)
            VALUES (p_story_id, current_user_id, p_project_id, p_title, p_content)
            RETURNING s.* INTO manuscript;
        EXCEPTION WHEN unique_violation THEN
            -- Do not disclose the colliding ID's owner, Project or contents.
            RAISE EXCEPTION 'Manuscript request unavailable' USING ERRCODE = '23505';
        END;
        result_status := 'created';
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'status', result_status,
        'id', manuscript.id,
        'project_id', manuscript.project_id,
        'title', manuscript.title,
        'content', manuscript.content,
        'created_at', manuscript.created_at,
        'updated_at', manuscript.updated_at,
        'project_title', locked_project.title,
        'project_updated_at', locked_project.updated_at
    );
END;
$function$;

ALTER FUNCTION public.zaggas_create_titled_project_manuscript(uuid, uuid, text, text, timestamptz) OWNER TO postgres;
REVOKE ALL PRIVILEGES ON FUNCTION public.zaggas_create_titled_project_manuscript(uuid, uuid, text, text, timestamptz)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.zaggas_create_titled_project_manuscript(uuid, uuid, text, text, timestamptz) TO authenticated;

COMMIT;
