# Supabase setup

The app already contains the project URL and publishable key. The publishable
key cannot create tables or users, so complete these one-time owner steps:

1. Open the Supabase project and go to **SQL Editor**.
2. Paste and run `supabase/migrations/20260825_initial.sql`.
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

