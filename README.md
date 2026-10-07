# HIRA Pro

Hazard Identification and Risk Assessment using React, TypeScript, Vite, Tailwind, shadcn/ui, Supabase and OpenAI.

## Local development

Install Node.js and npm. Run npm ci, then npm run dev from this directory.
Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your local environment. Open the URL printed by Vite and keep the terminal running.

Supabase handles authentication, storage and Edge Functions. Login sessions persist in browser local storage. OpenAI credentials belong only in Supabase Edge Function secrets. Never put private keys in frontend variables or Git.

## Deployment

Run npm run build and publish dist/ to a static website host. Configure the Vite environment variables before building, route application URLs back to index.html, and configure Supabase authentication redirect URLs for your domain.

Apply database migrations with npx supabase db push and deploy the required Edge Functions separately. See [AI setup](docs/run-with-openai.md) and [research tools](docs/evidence-risk-tools.md).

The optional Drizzle configuration reads the server-side DATABASE_MIGRATION_URL environment variable. The regular Supabase CLI migration workflow does not need this variable.

## Checks

Run npm test and npm run build.
