const RELEASE_VERSION = '2.36.2';
const APP_SCRIPTS = [
  'performance-intelligence.js',
  'status-hotfix.js',
  'filter-controls.js',
  'pearce-bibliography.js',
  'library-reader-hotfix.js',
  'grouped-loads-test.js'
];

const existingSite = {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    const transformed = new HTMLRewriter()
      .on('body', {
        element(element) {
          element.append(APP_SCRIPTS.map(file=>`<script src="/${file}?v=${RELEASE_VERSION}"></script>`).join(''), { html: true });
        }
      })
      .transform(response);

    transformed.headers.set('Cache-Control', 'no-store, max-age=0');
    return transformed;
  }
};

// Private by default. Only the explicit string "false" opens the site.
const COOKIE = '__Host-sixgun_private';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();

function privateResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('CDN-Cache-Control', 'no-store');
  headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('Vary', 'Cookie');
  headers.delete('ETag');
  headers.delete('Last-Modified');
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}

function reply(body, status = 401, headers = {}) {
  return privateResponse(new Response(body, {status, headers: {'Content-Type': 'text/plain; charset=utf-8', ...headers}}));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}

function safeReturn(value, origin) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/';
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.pathname.startsWith('/__private/')) return '/';
    return url.pathname + url.search + url.hash;
  } catch { return '/'; }
}

function loginPage(returnTo, message = '', status = 401) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="#1a1613"><title>Sixgun Retriever · Private</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:#1a1613;color:#f4efe6;font-family:Georgia,serif}main{width:100%;max-width:390px;border:1px solid #3a3229;border-radius:14px;padding:32px;background:#231e19}small{color:#c79a4b;letter-spacing:.16em;text-transform:uppercase}h1{font-size:29px;font-weight:normal;margin:14px 0}p{color:#b8ad9c;line-height:1.6}label{display:block;margin:24px 0 8px}input,button{width:100%;padding:14px;border:1px solid #584932;border-radius:7px;font-size:16px}input{background:#1a1613;color:#f4efe6}button{margin-top:14px;background:#c79a4b;color:#1a1613;cursor:pointer;font-weight:bold}.error{color:#efac9b}input:focus-visible,button:focus-visible{outline:2px solid #c79a4b;outline-offset:3px}
  </style></head><body><main><small>Sixgun Retriever</small><h1>A private workspace.</h1><p>Enter the family password to continue.</p>${message ? `<p class="error" role="alert">${escapeHtml(message)}</p>` : ''}<form action="/__private/login" method="post"><input type="hidden" name="returnTo" value="${escapeHtml(returnTo)}"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="256" required autofocus><button type="submit">Enter</button></form></main></body></html>`;
  return reply(html, status, {'Content-Type':'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'", 'X-Frame-Options':'DENY'});
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid token');
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

async function sessionKey(env) {
  // Changing either secret revokes every existing session.
  const raw = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify([env.PRIVATE_SESSION_KEY, env.PRIVATE_PASSWORD])));
  return crypto.subtle.importKey('raw', raw, {name:'HMAC', hash:'SHA-256'}, false, ['sign', 'verify']);
}

async function passwordMatches(actual, expected) {
  const hashes = await Promise.all([actual, expected].map(x => crypto.subtle.digest('SHA-256', encoder.encode(x))));
  const a = new Uint8Array(hashes[0]), b = new Uint8Array(hashes[1]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function validSession(request, env, hostname) {
  const values = (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).filter(x => x.startsWith(COOKIE + '='));
  if (values.length !== 1) return false;
  const token = values[0].slice(COOKIE.length + 1);
  if (token.length > 1024) return false;
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra !== undefined) return false;
    if (!await crypto.subtle.verify('HMAC', await sessionKey(env), fromBase64url(signature), encoder.encode(payload))) return false;
    const session = JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
    const now = Math.floor(Date.now() / 1000);
    return session.v === 1 && session.aud === hostname && Number.isInteger(session.iat) && Number.isInteger(session.exp) && session.iat <= now && session.exp > now && session.exp - session.iat === SESSION_SECONDS;
  } catch { return false; }
}

async function boundedBody(request) {
  if (Number(request.headers.get('Content-Length') || 0) > 4096) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4096) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Never serve content on forgotten alternate hostnames, even in public mode.
    if (url.hostname !== 'sixgunretriever.com') return reply('Not found.', 404);
    if (url.protocol !== 'https:') return reply(null, 308, {Location: 'https://' + url.host + url.pathname + url.search});
    if (env.PRIVATE_MODE === 'false') return existingSite.fetch(request, env, ctx);
    if (url.pathname === '/robots.txt' && ['GET','HEAD'].includes(request.method)) return reply(request.method === 'HEAD' ? null : 'User-agent: *\nDisallow: /\n', 200);
    if (!env.PRIVATE_PASSWORD || !env.PRIVATE_SESSION_KEY || !env.PRIVATE_LOGIN_LIMITER) return reply('Private site temporarily unavailable.', 503);
    try {
      if (url.pathname === '/__private/logout') {
        if (request.method !== 'POST') return reply('Use POST to sign out.', 405, {Allow:'POST'});
        if (request.headers.get('Origin') !== url.origin) return reply('Request denied.', 403);
        return reply(null, 303, {Location:'/', 'Set-Cookie': `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`});
      }
      const authenticated = await validSession(request, env, url.hostname);
      if (url.pathname === '/__private/login') {
        if (request.method === 'GET' || request.method === 'HEAD') {
          const target = safeReturn(url.searchParams.get('returnTo'), url.origin);
          if (authenticated) return reply(null, 303, {Location:target});
          return request.method === 'HEAD' ? reply(null) : loginPage(target);
        }
        if (request.method !== 'POST') return reply('Method not allowed.', 405, {Allow:'GET, HEAD, POST'});
        if (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return reply('Request denied.', 403);
        if (!(request.headers.get('Content-Type') || '').startsWith('application/x-www-form-urlencoded')) return reply('Unsupported form.', 415);
        const ip = request.headers.get('CF-Connecting-IP');
        if (!ip) return reply('Request denied.', 403);
        const limit = await env.PRIVATE_LOGIN_LIMITER.limit({key:'sixgun-private:' + ip});
        if (!limit.success) return reply('Too many attempts. Please wait a minute and try again.', 429, {'Retry-After':'60'});
        const body = await boundedBody(request);
        if (body === null) return reply('Form too large.', 413);
        const form = new URLSearchParams(body);
        const target = safeReturn(form.get('returnTo'), url.origin);
        const password = form.get('password') || '';
        if (password.length > 256 || !await passwordMatches(password, env.PRIVATE_PASSWORD)) return loginPage(target, 'That password did not match.');
        const now = Math.floor(Date.now() / 1000);
        const payload = base64url(encoder.encode(JSON.stringify({v:1, aud:url.hostname, iat:now, exp:now + SESSION_SECONDS})));
        const signature = base64url(await crypto.subtle.sign('HMAC', await sessionKey(env), encoder.encode(payload)));
        return reply(null, 303, {Location:target, 'Set-Cookie':`${COOKIE}=${payload}.${signature}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}`});
      }
      if (!authenticated) {
        if (request.method === 'GET' && (url.pathname === '/' || (request.headers.get('Accept') || '').includes('text/html'))) return loginPage(safeReturn(url.pathname + url.search, url.origin));
        return reply(request.method === 'HEAD' ? null : 'Private site. Sign in to continue.');
      }
      // No assets binding, application code, or HTMLRewriter runs before this point.
      return privateResponse(await existingSite.fetch(request, env, ctx));
    } catch {
      return reply('Private site temporarily unavailable.', 503);
    }
  }
};
