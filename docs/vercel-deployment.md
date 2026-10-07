# Deploy HIRA Pro to Vercel

## Prepared repository

The frontend builds with `npm run build` into `dist`. `vercel.json` configures Vite and routes page requests back to `index.html`, including direct visits to `/dashboard`, `/auth`, and `/risk-intelligence`.

Merge the preparation pull request before importing the default GitHub branch. Until then, the default branch does not contain these changes. Do not upload local environment files or Supabase CLI cache files.

## Vercel setup

1. Sign in to Vercel with the GitHub account that owns the repository.
2. Add a project and import `zeolen-creator/risk-guard-pro`.
3. Use the repository root, Vite framework, `npm run build`, and output directory `dist`.
4. Add `VITE_SUPABASE_URL` with `https://knlusxozrktgcdyatpej.supabase.co`.
5. Add `VITE_SUPABASE_PUBLISHABLE_KEY` with this project's public publishable key (or legacy anon key). These settings are compiled into the browser app. Never use a secret/service-role key or OpenAI key here.
6. Deploy and record the stable production address provided by Vercel.

## Supabase login setup after the address exists

In Supabase Authentication > URL Configuration, set Site URL to the production address and add the production origin with `/` to allowed redirect URLs. The app uses its current origin followed by `/` for signup confirmation. Keep any local development redirect URLs still needed. Use exact trusted deployment addresses when enabling preview logins.

The existing database and deployed Supabase Edge Functions remain separate from the frontend. Their OpenAI credentials stay in Supabase secrets. Verify model access with a real AI request after deployment; a successful function upload does not establish provider availability.

## Acceptance checks

Open the production URL, sign in, refresh `/dashboard`, and directly open `/risk-intelligence`. Check a saved assessment, then one AI request and its sources. Confirm email signup links return to the production website. A domain-specific configuration and these live checks can only be completed after the production URL is assigned.

Vercel hosting removes the need to keep a local PowerShell server running. New frontend changes require another deployment; changes to Supabase functions require separate function deployment.
