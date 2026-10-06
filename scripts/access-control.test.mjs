import { createTestDatabase } from './test-database.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Real PostgreSQL SQL/RLS execution in WASM. Only Supabase's platform schemas
// are stubbed; application tables, functions and policies come from migrations.
test('onboarding transactions and organization isolation', async () => {
  const db = await createTestDatabase();
  try {
    const users = [1,2,3,4,5].map(n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
    for (const id of users) await db.query('INSERT INTO auth.users VALUES ($1, $2)', [id, `${id}@example.test`]);
    const asUser = async (id, role = 'authenticated') => {
      await db.exec('RESET ROLE');
      await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id || '']);
      await db.exec(`SET ROLE ${role}`);
    };
    const create = async (name = 'Example') => (await db.query(
      "SELECT * FROM public.create_organization($1, 'healthcare', 'Canada')", [name])).rows[0];
    await asUser(null, 'anon');
    await assert.rejects(create(), /permission denied/);
    await asUser(null);
    await assert.rejects(create(), /Authentication required/);
    await asUser(users[0]);
    const a = await create('Organization A');
    assert.equal(a.owner_id, users[0]);
    assert.equal((await create()).id, a.id, 'retries reuse the organization');
    assert.equal((await db.query('SELECT count(*)::int n FROM subscriptions')).rows[0].n, 1);
    assert.equal((await db.query('SELECT role FROM user_roles')).rows[0].role, 'admin');
    await db.exec("UPDATE profiles SET role_title = 'Risk manager'");
    await asUser(users[1]);
    const b = await create('Organization B');
    const ownAssessment = (await db.query(
      'INSERT INTO assessments (org_id, user_id, title) VALUES ($1,$2,$3) RETURNING id',
      [b.id, users[1], 'Private B'])).rows[0].id;
    await asUser(users[0]);
    for (const table of ['organizations','assessments','subscriptions','user_roles']) {
      const result = await db.query(`SELECT * FROM ${table} WHERE ${table === 'organizations' ? 'id' : 'org_id'} = $1`, [b.id]);
      assert.equal(result.rows.length, 0, `${table}: other organization hidden`);
    }
    await assert.rejects(db.query('UPDATE profiles SET org_id = $1', [b.id]), /permission denied/);
    await assert.rejects(db.query('UPDATE profiles SET user_id = $1', [users[1]]), /permission denied/);
    await assert.rejects(db.query('INSERT INTO profiles (user_id, org_id) VALUES ($1,$2)', [users[0],b.id]), /permission denied/);
    await assert.rejects(db.query('UPDATE organizations SET owner_id = $1', [users[1]]), /permission denied/);
    await assert.rejects(db.query('INSERT INTO assessments (org_id,user_id,title) VALUES ($1,$2,$3)', [b.id, users[0], 'Attack']), /row-level security/);
    assert.equal((await db.query('UPDATE assessments SET title = $1 WHERE id = $2 RETURNING id', ['Attack', ownAssessment])).rows.length, 0);
    assert.equal((await db.query('DELETE FROM assessments WHERE id = $1 RETURNING id', [ownAssessment])).rows.length, 0);
    await assert.rejects(db.query('SELECT activate_weighting_weights($1,1)', [b.id]), /Organization admin required/);
    await assert.rejects(db.query('SELECT release_stale_assignments()'), /permission denied/);
    await assert.rejects(db.query('INSERT INTO user_roles (user_id,org_id,role) VALUES ($1,$2,$3)', [users[0],b.id,'admin']), /row-level security/);

    // Ordinary membership cannot be converted into ownership/admin by retrying onboarding.
    await db.exec('RESET ROLE');
    await db.query('UPDATE profiles SET org_id=$1 WHERE user_id=$2', [a.id,users[2]]);
    await db.query("INSERT INTO user_roles(user_id,org_id,role) VALUES($1,$2,'member')", [users[2],a.id]);
    await asUser(users[2]);
    await assert.rejects(create(), /Already a member/);
    await assert.rejects(db.query('SELECT activate_weighting_weights($1,1)', [a.id]), /Organization admin required/);

    // Recover the partial state produced by the original browser flow.
    await db.exec('RESET ROLE');
    const legacy = (await db.query("INSERT INTO organizations(name,sector,region,owner_id) VALUES('Legacy','healthcare','Canada',$1) RETURNING id", [users[3]])).rows[0].id;
    await db.query('UPDATE profiles SET org_id=$1 WHERE user_id=$2', [legacy,users[3]]);
    await asUser(users[3]);
    assert.equal((await create()).id, legacy);
    assert.equal((await db.query('SELECT role FROM user_roles')).rows[0].role, 'admin');
    assert.equal((await db.query('SELECT count(*)::int n FROM subscriptions')).rows[0].n, 1);

    // Inject a failure at the final write and prove the earlier writes roll back.
    await db.exec(`RESET ROLE;
      CREATE FUNCTION fail_test_subscription() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Injected subscription failure'; END $$;
      CREATE TRIGGER fail_test_subscription BEFORE INSERT ON subscriptions
        FOR EACH ROW EXECUTE FUNCTION fail_test_subscription();`);
    await asUser(users[4]);
    await assert.rejects(create('Rollback'), /Injected subscription failure/);
    assert.equal((await db.query('SELECT org_id FROM profiles')).rows[0].org_id, null);
    await db.exec('RESET ROLE');
    assert.equal((await db.query('SELECT count(*)::int n FROM organizations WHERE owner_id=$1', [users[4]])).rows[0].n, 0);
    assert.equal((await db.query('SELECT count(*)::int n FROM user_roles WHERE user_id=$1', [users[4]])).rows[0].n, 0);
  } finally { await db.close(); }
});
