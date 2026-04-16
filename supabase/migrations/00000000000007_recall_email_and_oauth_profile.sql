-- Migration: 00000000000007_recall_email_and_oauth_profile
-- Phase 33: Token Lifecycle & Onboarding
-- (1) profiles.recall_email_sent_at -- re-engagement email sent-once guard (EMAIL-03)
-- (2) handle_new_user() -- fall back to Google OAuth full_name/name when display_name absent (AUTH-HARDEN-01)

-- =============================================================================
-- (1) Add recall_email_sent_at column to profiles
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN recall_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.recall_email_sent_at IS
  'Timestamp of the most recent recall (re-engagement) email sent to this user. NULL = never sent. Used by check_token_health() to enforce a 30-day re-send cap.';

-- No index: at <10k users a partial index is not justified (see 33-RESEARCH Q4).

-- =============================================================================
-- (2) Patch handle_new_user() to populate display_name from Google OAuth metadata
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    )
  );
  RETURN NEW;
END;
$$;

-- Note: the existing CREATE TRIGGER on_auth_user_created from the initial schema
-- does NOT need to be re-created -- CREATE OR REPLACE FUNCTION updates the body
-- in place and the trigger reference is unchanged.
