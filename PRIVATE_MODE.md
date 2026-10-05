# Sixgun Retriever private mode

The production Worker is `sixgunretriever`, serving `https://sixgunretriever.com`.

Every page and asset passes through the Worker before Cloudflare serves static content (`assets.run_worker_first: true`). Without a valid signed cookie, visitors receive only a small login page or a 401 response. The existing application and its data-sync authentication run only after this gate succeeds. Original site assets are retained.

## Password and sessions

In Cloudflare: **Workers & Pages → sixgunretriever → Settings → Variables and Secrets**.

- `PRIVATE_PASSWORD`: **Secret**, holding the family password. It is never embedded in HTML, JavaScript, the repository or this guide.
- `PRIVATE_SESSION_KEY`: **Secret**, an independent random signing key.
- `PRIVATE_MODE`: plain variable, `true` while private. Missing or unrecognized values stay private.
- `PRIVATE_LOGIN_LIMITER`: rate-limit binding, namespace `1001`, 10 login attempts per IP per 60 seconds at a Cloudflare location.

Successful login sets a seven-day signed cookie with `Secure`, `HttpOnly`, `SameSite=Lax` and a host-only `__Host-` name. Changing either secret invalidates every existing cookie. Missing secrets or a failed limiter cause a closed 503 response, never a fallback to public content.

## Launching publicly

1. Change `PRIVATE_MODE` to the exact lowercase string `false` in the Cloudflare Worker variables, then deploy the variable change.
2. Also change `vars.PRIVATE_MODE` to `false` in the tracked `wrangler.jsonc` so later source deployments keep the public setting.
3. Recheck the homepage and a direct image URL in a private browser window. They should load without the family password.

Public mode removes this gate and its private caching/indexing headers. Existing application data-sync account permissions remain. Do not roll back to an old unprotected Worker version to launch; use the variable instead.

To become private again, set the same variable to `true` and update the source configuration. Rotate either secret if old sessions should be invalidated.

## Other addresses and indexing

The `sixgunretriever` and obsolete `sixgun-retriever` workers.dev addresses and version previews were disabled. The old Worker and assets were retained. The unrelated `autumn-firefly-1c83` / 6MWT Recorder Worker was not changed. The hardened Worker also rejects alternate hostnames. Keep `workers_dev: false` and `preview_urls: false` in future deployments.

While private, `/robots.txt` says `Disallow: /`; every response includes `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex`. Protected responses and login responses are marked no-store for both browsers and Cloudflare. Previously cached zone content was purged.

Search directives cannot recall files already downloaded or guarantee removal of old search results. The source repository `chasedouthit-bot/Sixgun-Retriever` was public when inspected; keeping the live domain private does not hide that separate GitHub copy. Its visibility needs to be changed independently.

## Verification

Run `node --test tests/private-edge-auth.cjs` for security regression checks. They exercise direct and guessed URLs, multiple HTTP methods, forged and expired cookies, password rotation, missing configuration, rate-limit failures, CSRF rejection, bounded form sizes and unsafe redirects. No secret values are required for the tests.

Live HTTP verification checks protected routes and assets without authentication and compares original content hashes after a valid login. The existing Supabase backend is outside this Cloudflare gate; its migrations specify owner row-level security and a private photo bucket, but this change does not independently audit its current live policies.
