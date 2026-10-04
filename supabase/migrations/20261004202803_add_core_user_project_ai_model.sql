-- DAY 02 core model. Review before applying; never rerun to conceal schema drift.
-- Requires PostgreSQL 15+ for column-specific ON DELETE SET NULL.
-- No existing Story row is deleted, reassigned, or rewritten by this migration.
BEGIN;

-- ECMAScript trim whitespace: explicit code points independent of database locale.
-- Blank validation does not trim or rewrite stored content.
CREATE FUNCTION public.zaggas_text_has_content(value text)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = ''
AS $$
    SELECT value IS NOT NULL AND btrim(value,
        U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
    ) <> '';
$$;

CREATE FUNCTION public.zaggas_interest_codes_valid(codes text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = ''
AS $$
    SELECT codes IS NOT NULL
       AND coalesce(array_ndims(codes), 1) = 1
       AND coalesce(array_lower(codes, 1), 1) = 1
       AND cardinality(codes) <= 8
       AND NOT EXISTS (
           SELECT 1 FROM unnest(codes) AS item(code)
           WHERE code IS NULL OR code NOT IN (
               'filmScreenplay', 'novel', 'webNovel', 'essay',
               'everydayStory', 'empathyComfort', 'idea', 'unsure'
           )
       )
       AND cardinality(codes) = (SELECT count(DISTINCT code) FROM unnest(codes) AS item(code))
       AND (NOT ('unsure' = ANY(codes)) OR cardinality(codes) = 1);
$$;

CREATE TABLE public.profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text,
    interest_codes text[] NOT NULL DEFAULT '{}',
    onboarding_completed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT profiles_interest_codes_valid CHECK (public.zaggas_interest_codes_valid(interest_codes)),
    CONSTRAINT profiles_display_name_valid CHECK (
        display_name IS NULL OR (public.zaggas_text_has_content(display_name) AND char_length(display_name) <= 100)
    )
);

CREATE TABLE public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
    title text NOT NULL,
    seed_sentence text,
    onboarding_draft_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT projects_title_valid CHECK (public.zaggas_text_has_content(title) AND char_length(title) <= 200),
    CONSTRAINT projects_seed_sentence_valid CHECK (
        seed_sentence IS NULL OR (public.zaggas_text_has_content(seed_sentence) AND char_length(seed_sentence) <= 500)
    ),
    CONSTRAINT projects_owner_draft_unique UNIQUE (owner_id, onboarding_draft_id),
    -- Required target key for the Story ownership composite FK; not redundant with id PK.
    CONSTRAINT projects_id_owner_unique UNIQUE (id, owner_id)
);

-- New CHECKs validate existing rows; any failure aborts the entire transaction.
-- Existing max-length constraints and Story trigger remain unchanged.
ALTER TABLE public.stories
    DROP CONSTRAINT stories_title_not_blank,
    DROP CONSTRAINT stories_content_not_blank,
    ADD CONSTRAINT stories_title_not_blank CHECK (public.zaggas_text_has_content(title)),
    ADD CONSTRAINT stories_content_not_blank CHECK (public.zaggas_text_has_content(content)),
    ADD COLUMN owner_id uuid REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
    ADD COLUMN project_id uuid,
    ADD CONSTRAINT stories_project_requires_owner CHECK (project_id IS NULL OR owner_id IS NOT NULL),
    ADD CONSTRAINT stories_project_owner_fk FOREIGN KEY (project_id, owner_id)
        REFERENCES public.projects(id, owner_id)
        ON DELETE SET NULL (project_id);
-- Nullable owner_id preserves legacy rows. No automatic backfill.
-- Project deletion only clears project_id; the existing Story UPDATE trigger also refreshes updated_at.
-- Profile/Auth deletion is blocked while owned Projects or Stories exist: explicit account cleanup required.

CREATE TABLE public.ai_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
    -- No project_id UNIQUE: multiple conversations per Project are allowed.
);

CREATE TABLE public.ai_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    sequence_no integer NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    origin text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ai_messages_sequence_positive CHECK (sequence_no >= 1),
    CONSTRAINT ai_messages_conversation_sequence_unique UNIQUE (conversation_id, sequence_no),
    CONSTRAINT ai_messages_role_valid CHECK (role IN ('user', 'assistant')),
    CONSTRAINT ai_messages_origin_valid CHECK (origin IN ('guest_import', 'member_input', 'server_generated')),
    CONSTRAINT ai_messages_role_origin_valid CHECK (
        origin = 'guest_import'
        OR (origin = 'member_input' AND role = 'user')
        OR (origin = 'server_generated' AND role = 'assistant')
    ),
    CONSTRAINT ai_messages_content_valid CHECK (public.zaggas_text_has_content(content) AND char_length(content) <= 4000)
);

-- Existing trigger function is generic in behavior despite its Story-specific name.
-- Reuse it unchanged; do not replace the existing Story function or trigger.
CREATE TRIGGER zaggas_profiles_before_update_set_updated_at
BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.zaggas_stories_set_updated_at();
CREATE TRIGGER zaggas_projects_before_update_set_updated_at
BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.zaggas_stories_set_updated_at();

-- projects(owner_id) and ai_messages(conversation_id) are covered by UNIQUE leading columns.
CREATE INDEX stories_owner_id_idx ON public.stories(owner_id);
CREATE INDEX stories_project_id_idx ON public.stories(project_id);
CREATE INDEX ai_conversations_project_id_idx ON public.ai_conversations(project_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
-- No profile DELETE policy or authenticated DELETE grant.

CREATE POLICY projects_select_own ON public.projects FOR SELECT TO authenticated
USING (owner_id = (SELECT auth.uid()));
CREATE POLICY projects_insert_own ON public.projects FOR INSERT TO authenticated
WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY projects_update_own ON public.projects FOR UPDATE TO authenticated
USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY projects_delete_own ON public.projects FOR DELETE TO authenticated
USING (owner_id = (SELECT auth.uid()));

CREATE POLICY stories_select_own ON public.stories FOR SELECT TO authenticated
USING (owner_id = (SELECT auth.uid()));
CREATE POLICY stories_insert_own ON public.stories FOR INSERT TO authenticated
WITH CHECK (owner_id = (SELECT auth.uid()) AND (
    project_id IS NULL OR EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = stories.project_id AND p.owner_id = (SELECT auth.uid())
    )
));
CREATE POLICY stories_update_own ON public.stories FOR UPDATE TO authenticated
USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()) AND (
    project_id IS NULL OR EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = stories.project_id AND p.owner_id = (SELECT auth.uid())
    )
));
CREATE POLICY stories_delete_own ON public.stories FOR DELETE TO authenticated
USING (owner_id = (SELECT auth.uid()));

CREATE POLICY ai_conversations_select_own ON public.ai_conversations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = ai_conversations.project_id AND p.owner_id = (SELECT auth.uid())));
CREATE POLICY ai_conversations_insert_own ON public.ai_conversations FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = ai_conversations.project_id AND p.owner_id = (SELECT auth.uid())));
CREATE POLICY ai_conversations_delete_own ON public.ai_conversations FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = ai_conversations.project_id AND p.owner_id = (SELECT auth.uid())));

CREATE POLICY ai_messages_select_own ON public.ai_messages FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c JOIN public.projects p ON p.id = c.project_id
    WHERE c.id = ai_messages.conversation_id AND p.owner_id = (SELECT auth.uid())
));
-- No authenticated message INSERT/UPDATE/DELETE policy.
-- Guest imports use only the validated onboarding RPC; imported assistant text
-- is UNTRUSTED and never proof of an actual provider response.
-- Member input / verified responses require future authorized server/RPC writers.

REVOKE ALL PRIVILEGES ON TABLE public.profiles, public.projects, public.stories,
    public.ai_conversations, public.ai_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT INSERT (user_id, display_name, interest_codes) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, interest_codes) ON public.profiles TO authenticated;
GRANT SELECT, DELETE ON TABLE public.projects TO authenticated;
-- Reserve onboarding_draft_id for RPC idempotency; clients cannot preempt it.
GRANT INSERT (id, owner_id, title, seed_sentence) ON public.projects TO authenticated;
GRANT UPDATE (title, seed_sentence) ON public.projects TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.stories TO authenticated;
GRANT UPDATE (title, content, project_id) ON public.stories TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.ai_conversations TO authenticated;
GRANT SELECT ON TABLE public.ai_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles, public.projects, public.stories,
    public.ai_conversations, public.ai_messages TO service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.zaggas_interest_codes_valid(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zaggas_interest_codes_valid(text[]) TO authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION public.zaggas_text_has_content(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zaggas_text_has_content(text) TO authenticated, service_role;

-- INVOKER cannot write fields denied to its caller. One narrow DEFINER boundary.
-- Trusted owner postgres executes fixed SQL only; no arbitrary table access,
-- dynamic SQL, caller-supplied owners, origins, sequence numbers or message IDs.
-- RLS is bypassed here: reads/writes use auth.uid() or newly created IDs only.
-- Call through authenticated Auth sessions; do not expose raw SQL connections.
-- public/auth schemas must remain non-writable by untrusted roles.
-- guest_messages is an array of {"role":"user|assistant","content":"..."} only.
-- IDs, sequence_no and origin are assigned here, never taken from client input.
-- Up to 5 messages (seed + two user/assistant turns), each <=4000 chars, total <=12000.
CREATE FUNCTION public.zaggas_complete_onboarding(
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

    INSERT INTO public.projects(owner_id, title, seed_sentence, onboarding_draft_id)
    VALUES (current_user_id, '첫 이야기', seed_sentence, draft_id)
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
