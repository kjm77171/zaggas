-- DAY 04 Project creation context. Draft only; apply after explicit approval.
-- Timestamp follows the existing core migration to preserve dependency ordering.
-- Existing Projects retain NULL context. No data backfill or interest inference.
BEGIN;

ALTER TABLE public.projects
    ADD COLUMN initial_interest_codes text[],
    ADD COLUMN creation_type text,
    ADD CONSTRAINT projects_initial_interest_codes_valid CHECK (
        initial_interest_codes IS NULL
        OR public.zaggas_interest_codes_valid(initial_interest_codes)
    ),
    ADD CONSTRAINT projects_creation_type_valid CHECK (
        creation_type IS NULL
        OR creation_type IN ('SCREENPLAY', 'NOVEL', 'WEB_NOVEL', 'ESSAY')
    );

-- Preserve existing column privileges and owner RLS. No initial-interest write grant.
-- Existing service_role table privileges also cover the new columns.
GRANT UPDATE (creation_type) ON TABLE public.projects TO authenticated;

-- Keep the existing signature, validation, locking, profile merge and draft idempotency.
-- Only the first Project INSERT records raw interests; repeat drafts never overwrite them.
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
    VALUES (current_user_id, '첫 이야기', seed_sentence, draft_id, interest_codes, NULL)
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


COMMIT;
