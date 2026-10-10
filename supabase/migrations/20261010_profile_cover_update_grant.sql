-- Profile owners can update only their own cover URL under existing profile RLS and path ownership constraint.
grant update(cover_url) on table public.profiles to authenticated;
