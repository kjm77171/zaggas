-- DAY 01: one text body per Story. Apply once after schema review.
-- Intentionally fail if these objects already exist; do not mask schema drift.
BEGIN;

CREATE TABLE public.stories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT stories_title_not_blank CHECK (char_length(btrim(title)) > 0),
    CONSTRAINT stories_title_max_length CHECK (char_length(title) <= 200),
    CONSTRAINT stories_content_not_blank CHECK (char_length(btrim(content)) > 0),
    CONSTRAINT stories_content_max_length CHECK (char_length(content) <= 100000)
);

CREATE FUNCTION public.zaggas_stories_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := statement_timestamp();
    RETURN NEW;
END;
$$;

CREATE TRIGGER zaggas_stories_before_update_set_updated_at
BEFORE UPDATE ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.zaggas_stories_set_updated_at();

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies. Remove automatic or inherited PUBLIC grants.
REVOKE ALL PRIVILEGES ON TABLE public.stories FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stories TO service_role;

-- Trigger execution does not require exposing the function as a callable API.
REVOKE ALL PRIVILEGES ON FUNCTION public.zaggas_stories_set_updated_at() FROM PUBLIC, anon, authenticated;

COMMIT;
