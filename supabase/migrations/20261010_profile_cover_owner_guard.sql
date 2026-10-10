-- A student may reference only a profile cover under their own private
-- storage prefix, preventing arbitrary links to another student's media.
alter table public.profiles
drop constraint if exists profiles_cover_path_owned;
alter table public.profiles
add constraint profiles_cover_path_owned check (
  cover_url is null
  or (split_part(cover_url,'/',1)=id::text
      and cover_url ~ '^[0-9a-f-]{36}/cover-[0-9]+\\.(jpg|png|webp)$')
);
