const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {webcrypto} = require('node:crypto');
globalThis.crypto = webcrypto;
const workerPromise = import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(require('node:path').join(__dirname, '../worker.js'))).toString('base64'));

function setup() {
  let assetCalls = 0;
  const env = {
    PRIVATE_PASSWORD:'only-a-test-password', PRIVATE_SESSION_KEY:'only-a-test-signing-key',
    PRIVATE_LOGIN_LIMITER:{limit:async () => ({success:true})},
    ASSETS:{fetch:async () => { assetCalls++; return new Response('protected asset', {headers:{'Content-Type':'image/png','ETag':'old'}}); }}
  };
  return {env, calls:() => assetCalls};
}
async function fetchPath(path, env, options = {}) {
  const worker = (await workerPromise).default;
  return worker.fetch(new Request('https://sixgunretriever.com' + path, options), env, {});
}
async function login(env, password = env.PRIVATE_PASSWORD, returnTo = '/') {
  return fetchPath('/__private/login', env, {method:'POST',headers:{Origin:'https://sixgunretriever.com','CF-Connecting-IP':'192.0.2.1','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password,returnTo})});
}
test('all paths and methods fail before ASSETS, including guessed and encoded paths', async () => {
  const s = setup();
  for (const path of ['/', '/index.html', '/loads-test', '/library', '/photos', '/magazines', '/assets/icons/favicon-32.png', '/performance-intelligence.js', '/data.json', '/magazine.pdf', '/worker.js', '/wrangler.jsonc', '/.git/config', '/%2e%2e/index.html', '/__private/login/../assets/a.jpg']) {
    for (const method of ['GET','HEAD','POST','OPTIONS']) {
      const r = await fetchPath(path, s.env, {method,headers:{Range:'bytes=0-100','If-None-Match':'*'}});
      assert.equal(r.status,401,`${method} ${path}`);
      assert.match(r.headers.get('X-Robots-Tag'),/noindex/);
      assert.match(r.headers.get('Cache-Control'),/no-store/);
      assert.doesNotMatch(await r.text(),/protected asset|SUPABASE_KEY/);
    }
  }
  assert.equal(s.calls(),0);
});
test('valid login creates a secure signed session and preserves asset bytes', async () => {
  const s=setup(), r=await login(s.env,undefined,'/assets/a.png');
  assert.equal(r.status,303); assert.equal(r.headers.get('Location'),'/assets/a.png');
  const cookie=r.headers.get('Set-Cookie');
  for (const flag of ['__Host-sixgun_private=','HttpOnly','Secure','SameSite=Lax','Path=/']) assert.ok(cookie.includes(flag));
  assert.ok(!cookie.includes(s.env.PRIVATE_PASSWORD));
  const asset=await fetchPath('/assets/a.png',s.env,{headers:{Cookie:cookie.split(';')[0]}});
  assert.equal(asset.status,200);assert.equal(await asset.text(),'protected asset');assert.equal(s.calls(),1);
  assert.equal(asset.headers.get('ETag'),null);assert.match(asset.headers.get('Cache-Control'),/no-store/);
});
test('wrong password, forged, expired, duplicate and revoked cookies cannot fetch assets', async () => {
  const s=setup(); assert.equal((await login(s.env,'wrong')).status,401);
  const cookie=(await login(s.env)).headers.get('Set-Cookie').split(';')[0];
  for (const fake of [cookie+'x', cookie.slice(0,-5)+'bogus', '__Host-sixgun_private=true', cookie+'; '+cookie]) assert.equal((await fetchPath('/image.png',s.env,{headers:{Cookie:fake}})).status,401);
  const realNow=Date.now;
  try { Date.now=()=>realNow()+8*24*60*60*1000;assert.equal((await fetchPath('/image.png',s.env,{headers:{Cookie:cookie}})).status,401); }
  finally { Date.now=realNow; }
  s.env.PRIVATE_PASSWORD='changed';assert.equal((await fetchPath('/image.png',s.env,{headers:{Cookie:cookie}})).status,401);
  assert.equal(s.calls(),0);
});
test('CSRF, oversized forms, rate limiting, unsafe redirects and missing configuration',async () => {
  const s=setup();
  assert.equal((await fetchPath('/__private/login',s.env,{method:'POST',headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await login(s.env,undefined,'//evil.example')).headers.get('Location'),'/');
  assert.equal((await login(s.env,undefined,'/\\evil.example')).headers.get('Location'),'/');
  assert.equal((await login(s.env,'x'.repeat(5000))).status,413);
  s.env.PRIVATE_LOGIN_LIMITER.limit=async()=>({success:false});assert.equal((await login(s.env)).status,429);
  s.env.PRIVATE_LOGIN_LIMITER.limit=async()=>{throw new Error('unavailable');};assert.equal((await login(s.env)).status,503);
  delete s.env.PRIVATE_PASSWORD;assert.equal((await fetchPath('/a.png',s.env)).status,503);assert.equal(s.calls(),0);
});
test('robots disallows indexing; alternate hostnames fail; only explicit false opens site',async () => {
  const s=setup(); assert.match(await (await fetchPath('/robots.txt',s.env)).text(),/Disallow: \//);
  const worker=(await workerPromise).default;
  assert.equal((await worker.fetch(new Request('https://alternate.workers.dev/a.png'),s.env)).status,404);
  for (const mode of [undefined,'true','0','FALSE']) {s.env.PRIVATE_MODE=mode;assert.equal((await fetchPath('/a.png',s.env)).status,401);}
  s.env.PRIVATE_MODE='false';assert.equal(await (await fetchPath('/a.png',s.env)).text(),'protected asset');assert.equal(s.calls(),1);
});
