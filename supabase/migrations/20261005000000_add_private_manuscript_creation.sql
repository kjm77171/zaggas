-- DAY 04 draft only: apply after explicit approval. No existing data changes.
-- Date prefix uses the client date; ordered after all existing migrations.
-- Preserve Project 1:N Story and existing RLS, constraints and triggers.
BEGIN;

-- Table and column privileges are additive. Reset both; keep SELECT/DELETE unchanged.
-- Trusted service_role table privileges are unchanged.
REVOKE INSERT, UPDATE ON TABLE public.stories FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, owner_id, project_id, title, content, created_at, updated_at)
    ON TABLE public.stories FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, owner_id, project_id, title, content, created_at, updated_at)
    ON TABLE public.stories FROM PUBLIC, anon, authenticated;
GRANT UPDATE (content) ON TABLE public.stories TO authenticated;

CREATE FUNCTION public.zaggas_create_project_manuscript(
    p_project_id uuid,
    p_story_id uuid,
    p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    current_user_id uuid := auth.uid();
    project_title text;
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

    -- Serialize creators. Missing and other-owner Projects return the same error.
    SELECT p.title INTO project_title
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
        IF manuscript.content IS DISTINCT FROM p_content THEN
            RAISE EXCEPTION 'Manuscript content differs; reload before saving' USING ERRCODE = '40001';
        END IF;
        result_status := 'existing_retry';
    ELSE
        BEGIN
            INSERT INTO public.stories AS s (id, owner_id, project_id, title, content)
            VALUES (p_story_id, current_user_id, p_project_id, project_title, p_content)
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
        'updated_at', manuscript.updated_at
    );
END;
$function$;

ALTER FUNCTION public.zaggas_create_project_manuscript(uuid, uuid, text) OWNER TO postgres;
REVOKE ALL PRIVILEGES ON FUNCTION public.zaggas_create_project_manuscript(uuid, uuid, text)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.zaggas_create_project_manuscript(uuid, uuid, text) TO authenticated;

COMMIT;
