import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';

export async function createTestDatabase() {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint);
      CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS
        $$ SELECT string_to_array($1, '/') $$;
      GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
      GRANT ALL ON storage.objects TO anon, authenticated;
    `);
    for (const file of (await readdir(new URL('../supabase/migrations/', import.meta.url))).sort()) {
      const sql = (await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'))
        .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '')
        .replace(/ALTER PUBLICATION supabase_realtime ADD TABLE [^;]+;/g, '');
      try { await db.exec(sql); } catch (error) { throw new Error(`${file}: ${error.message}`, { cause: error }); }
    }
    return db;
  } catch (error) { await db.close(); throw error; }
}
