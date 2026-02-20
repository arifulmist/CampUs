# CampUs
An online collaborative hub and forum for students and teachers.

## Viewing Other Users' Profiles (Supabase RLS)

If `/profile/<student_id>` loads a profile but shows no skills/interests/posts, it’s usually because Supabase Row Level Security (RLS) is restricting `SELECT` queries to only your own rows.

This repo includes a migration that enables **read-only** `SELECT` access for authenticated users on the profile-related tables:

- [src/supabase/migrations/allow_profile_view_select.sql](src/supabase/migrations/allow_profile_view_select.sql)

## Comment Edit/Delete (Supabase RLS)

If comment edits/deletes appear to work in the UI but don’t persist, Supabase RLS may be blocking `UPDATE`/`DELETE` on `public.comments`.

This repo includes a migration that allows authenticated users to update/delete **only their own** comments:

- [src/supabase/migrations/allow_comment_owner_update_delete.sql](src/supabase/migrations/allow_comment_owner_update_delete.sql)

Apply it to your Supabase project using your usual workflow (for example, via the Supabase SQL Editor or Supabase CLI).



to run this project :
->npm run dev 
to run email server :
->npm run email-server
