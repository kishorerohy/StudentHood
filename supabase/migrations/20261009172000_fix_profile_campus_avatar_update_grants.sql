-- Repair the live StudentHood Edit Profile and manual campus status Save flows.
-- Authenticated users already hold UPDATE on basic editable profile columns, but
-- were missing column grants for campus_presence and avatar_url.
-- Keep table-level UPDATE revoked, preserving the existing column allow-list.
-- The existing profiles UPDATE RLS policy restricts both changes to auth.uid()=id.
grant update (campus_presence, avatar_url) on table public.profiles to authenticated;

-- Do not grant UPDATE on locked DOB, age, guardian, trust, or privacy controls.
-- Do not alter the existing profile RLS policies or grant any anonymous access.
