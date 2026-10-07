import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase } from './test-database.mjs';

test('saved synthesis approval, atomic version replacement and assessment snapshots', async () => {
  const db = await createTestDatabase();
  try {
    const names = ['Fatalities','Injuries/Illness','Displacement','Psychosocial','Support Systems',
      'Property Damage','Infrastructure','Environmental','Economic','Reputational'];
    const keys = ['Fatalities','Injuries','Displacement','Psychosocial_Impact','Support_System_Impact',
      'Property_Damage','Infrastructure_Impact','Environmental_Damage','Economic_Impact','Reputational_Impact'];
    // This test deliberately reorders the catalog; replace the migration's seeded fixtures.
    await db.query('DELETE FROM consequences');
    for (const [i,name] of names.entries()) {
      await db.query('INSERT INTO consequences(category, category_number, description) VALUES($1,$2,$1)', [name,10-i]);
    }
    const user = '00000000-0000-4000-8000-000000000001';
    const other = '00000000-0000-4000-8000-000000000002';
    await db.query('INSERT INTO auth.users VALUES($1,$2),($3,$4)', [user,'a@example.test',other,'b@example.test']);
    const asUser = async id => {
      await db.exec('RESET ROLE');
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
      await db.exec('SET ROLE authenticated');
    };
    await asUser(user);
    const org = (await db.query("SELECT * FROM create_organization('A Org','healthcare','Canada')")).rows[0];
    const profile = (await db.query('SELECT id FROM profiles')).rows[0].id;
    const equal = Object.fromEntries(keys.map(k => [k,10]));
    const changed = {...equal, Fatalities:20.25, Injuries:0, Displacement:9.75};
    const newSession = async weights => {
      const id = (await db.query('SELECT create_weighting_session() AS id')).rows[0].id;
      await db.query(`INSERT INTO weighting_ai_synthesis(session_id,sources_used,source_weights,recommended_weights,
        weight_changes,justification_report_executive,justification_report_detailed,justification_report_technical,
        consistency_checks,all_checks_passed,ai_model_used,ai_prompt_tokens,ai_response_tokens,ai_total_cost_usd)
        VALUES($1,'{}','{}',$2,'{}','Executive','Detailed','Technical','{}',true,'test',0,0,0)`, [id,weights]);
      await db.query("UPDATE weighting_sessions SET status='completed',layer5_completed=true WHERE id=$1", [id]);
      return id;
    };
    const approve = async (id,weights) => (await db.query('SELECT approve_weighting_session($1,$2,$3) AS version', [id,weights,'Reviewed'])).rows[0].version;
    const s1 = await newSession(equal);
    await assert.rejects(approve(s1, changed), /Recommendations changed/);
    assert.equal((await db.query('SELECT count(*)::int n FROM weighting_final_weights')).rows[0].n,0);
    assert.equal(await approve(s1,equal),1);
    assert.equal(await approve(s1,equal),1);
    const first = (await db.query('SELECT * FROM weighting_final_weights')).rows[0];
    assert.equal(first.approved_by,profile);
    assert.equal(first.status,'approved');
    assert.equal(first.is_active,true);
    assert.equal((await db.query('SELECT weights_configured FROM organizations')).rows[0].weights_configured,true);
    const assessment = (await db.query("INSERT INTO assessments(org_id,user_id,title,status) VALUES($1,$2,'Original','completed') RETURNING *", [org.id,user])).rows[0];
    assert.equal(Object.keys(assessment.weights).length,10);
    const originalWeights = assessment.weights;
    await assert.rejects(db.query('UPDATE weighting_ai_synthesis SET recommended_weights=$1 WHERE session_id=$2',[changed,s1]),/Start a new session/);

    const s2 = await newSession(changed);
    const versions = (await db.query('SELECT version FROM weighting_sessions ORDER BY version')).rows.map(r=>r.version);
    assert.deepEqual(versions,[1,2]);
    await db.exec(`RESET ROLE;
      CREATE FUNCTION fail_weight_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected weight failure'; END $$;
      CREATE TRIGGER fail_weight_insert BEFORE INSERT ON consequence_weights FOR EACH ROW EXECUTE FUNCTION fail_weight_insert();`);
    await asUser(user);
    await assert.rejects(approve(s2,changed),/Injected weight failure/);
    assert.equal((await db.query('SELECT version FROM weighting_final_weights WHERE is_active')).rows[0].version,1);
    assert.equal((await db.query('SELECT count(*)::int n FROM weighting_weight_versions')).rows[0].n,0);
    assert.equal((await db.query('SELECT status FROM weighting_sessions WHERE id=$1',[s2])).rows[0].status,'completed');
    await db.exec('RESET ROLE; DROP TRIGGER fail_weight_insert ON consequence_weights;');
    await asUser(user);
    assert.equal(await approve(s2,changed),2);
    const actual = (await db.query('SELECT c.category,w.weight FROM consequence_weights w JOIN consequences c ON c.id=w.consequence_id')).rows;
    assert.equal(Number(actual.find(r=>r.category==='Fatalities').weight),20.25);
    assert.equal(Number(actual.find(r=>r.category==='Injuries/Illness').weight),0);
    assert.equal((await db.query('SELECT count(*)::int n FROM weighting_weight_versions')).rows[0].n,1);
    assert.equal(await approve(s1,equal),1, 'retrying old approval does not replace active v2');
    assert.equal((await db.query('SELECT version FROM weighting_final_weights WHERE is_active')).rows[0].version,2);
    assert.deepEqual((await db.query('SELECT weights FROM assessments WHERE id=$1',[assessment.id])).rows[0].weights,originalWeights);
    const newer = (await db.query("INSERT INTO assessments(org_id,user_id,title) VALUES($1,$2,'New') RETURNING weights", [org.id,user])).rows[0];
    assert.notDeepEqual(newer.weights,originalWeights);
    await assert.rejects(db.query('UPDATE assessments SET weights=$1 WHERE id=$2',[newer.weights,assessment.id]),/saved snapshot/);
    await db.query("UPDATE assessments SET title='Still original weights' WHERE id=$1",[assessment.id]);

    const malformed = {...changed, Extra:0};
    const s3 = await newSession(malformed);
    await assert.rejects(approve(s3,malformed),/Unknown, duplicate/);
    await db.query('UPDATE weighting_ai_synthesis SET recommended_weights=$1 WHERE session_id=$2',[equal,s3]);
    await db.exec("RESET ROLE; UPDATE consequences SET category='Unmapped custom name' WHERE category='Economic';");
    await asUser(user);
    await assert.rejects(approve(s3,equal),/Consequence catalog/);
    assert.equal((await db.query('SELECT version FROM weighting_final_weights WHERE is_active')).rows[0].version,2);
    await db.exec("RESET ROLE; UPDATE consequences SET category='Economic' WHERE category='Unmapped custom name';");
    await asUser(other);
    await db.query("SELECT create_organization('B Org','healthcare','Canada')");
    await assert.rejects(approve(s3,equal),/Organization admin required/);
    await assert.rejects(db.query('SELECT activate_weighting_weights($1,1)',[org.id]),/Organization admin required/);

    // Manual setup archives the active AI version atomically, without touching assessments.
    await asUser(user);
    await db.query('SELECT save_consequence_weights($1)',[originalWeights]);
    assert.equal((await db.query('SELECT count(*)::int n FROM weighting_final_weights WHERE is_active')).rows[0].n,0);
    assert.equal((await db.query('SELECT count(*)::int n FROM weighting_weight_versions')).rows[0].n,2);
    await assert.rejects(db.query('SELECT save_consequence_weights($1)',[{}]),/sum to 100/);
    assert.equal(Number((await db.query('SELECT sum(weight) total FROM consequence_weights')).rows[0].total),100);
  } finally { await db.close(); }
});
