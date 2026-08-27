# Supabase setup

The app already contains the project URL and publishable key. The publishable
key cannot create tables or users, so complete these one-time owner steps:

1. Open the Supabase project and go to **SQL Editor**.
2. Run the SQL migrations in filename order:
   - `supabase/migrations/20260825_initial.sql`
   - `supabase/migrations/20260825_gun_biography.sql`
   - `supabase/migrations/20260826_gun_biography_letter.sql`
   - `supabase/migrations/20260826_photographic_record.sql`
   - `supabase/migrations/20260826_parts_maintenance.sql`
   - `supabase/migrations/20260827_garmin_chronograph_import.sql`
   - `supabase/migrations/20260827_bullet_catalog.sql`
3. Go to **Authentication > Users > Add user** and create your one owner user.
4. Go to **Authentication > Sign In / Providers > Email** and disable new-user
   signup after that owner exists. Leave email/password and/or magic links on.
5. In **Authentication > URL Configuration**, add the production site URL
   (`https://sixgunretriever.com`) as the Site URL and an allowed redirect URL.
6. Open the app, sign in, and leave it open until the sync indicator says
   **Synced**. The first successful login imports the old local data and the
   built-in Library into the private tables.

All application tables use Row Level Security keyed to `auth.uid()`. The photo
bucket is private and restricts every object to the signed-in user's own folder.
The app provides sign-in only; it does not expose account creation.

The Parts & Maintenance migration adds owner-only parts/modification history and
maintenance ledger tables. Run it before using the new binder section so those
entries can sync across devices.

The Garmin chronograph migration extends sessions with import metadata and adds
owner-only per-shot storage. Run it before importing ShotView CSV files.

Photographic Record uploads create a display rendition (maximum 1800 px) and a
higher-quality PDF rendition (maximum 3200 px) in separate private folders in
the existing `sixgun-photos` bucket. The final migration raises the per-object
limit to 20 MB and adds owner-only RLS policies for records, Moments, and photos.

