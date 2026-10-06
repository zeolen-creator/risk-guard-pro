# Run HIRA without Lovable

This repository runs the web app on its selected frontend host and uses Supabase for authentication, database, and Edge Functions. AI calls run from Supabase Edge Functions using your own OpenAI API key. The key is a Supabase secret; it must never go in the browser app or Git.

## One-time Supabase setup

1. In the Supabase Dashboard, open **Edge Functions** and then **Secrets** for the HIRA project.
2. Add a secret named `OPENAI_API_KEY` and paste your OpenAI API key as its value. Save it there; do not paste it into a chat or commit it to the repository.
3. Deploy the database migrations with `npx supabase db push` and the Edge Functions with `npx supabase functions deploy --project-ref knlusxozrktgcdyatpej` from the repository folder.

The migrations include starter hazard and consequence categories so the empty project has data for the HIRA screens. They are editable reference examples, not a site-specific assessment.

## AI billing

OpenAI API usage is billed separately from a ChatGPT subscription. Set up API billing and usage limits in the OpenAI API platform before using the AI features.

## Frontend hosting

The frontend still needs to be built and deployed to a static frontend host. Configure that host with the new Supabase project URL and its public client key as Vite environment variables. Never put the OpenAI key in `VITE_*` variables. This repository does not contain a Lovable runtime dependency for hosting the app.
