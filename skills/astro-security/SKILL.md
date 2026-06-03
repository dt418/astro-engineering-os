---
name: astro-security
description: Security patterns for Astro — CSP, session cookies, CSRF, rate limiting, secrets handling, headers, and adapter-level security controls. Use when designing or reviewing an Astro project that handles authentication, user data, payments, or third-party integrations.
---

# Astro Security

Patterns for building Astro applications that are secure by default. Security is treated as an engineering surface with concrete, verifiable requirements — not a checklist executed at the end of a project.

## Purpose

Reduce the attack surface of an Astro project to the smallest set of behaviors the product requires. Make the secure path the easy path. Make insecure choices require explicit overrides.

## Responsibilities

- Set security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- Configure session cookies correctly.
- Implement CSRF protection on state-changing endpoints.
- Apply rate limiting on auth, signup, and webhook endpoints.
- Manage secrets correctly across build, server, and adapters.
- Audit third-party scripts and integrations.
- Coordinate with `astro-saas` for the authenticated app surface.

## Decision Rules

### Content Security Policy

- Default-deny with explicit allowlist. Generate the policy from config, do not hand-author.
- Inline scripts allowed only when hashed or nonced.
- `script-src 'self' 'nonce-{{NONCE}}' 'strict-dynamic';`
- `style-src 'self' 'nonce-{{NONCE}}';` (avoid `'unsafe-inline'`; use nonces or hashes)
- `object-src 'none'; base-uri 'self'; frame-ancestors 'none';`
- `connect-src` lists analytics and API origins.
- `img-src 'self' https: data:;` — no `http:`.
- Generate a per-request nonce in middleware and apply it to any inline script or style.

### Cookies

| Attribute | Value | Why |
|-----------|-------|-----|
| `HttpOnly` | Always for session cookies | Block XSS-driven session theft |
| `Secure` | Always in production | TLS-only |
| `SameSite` | `Lax` for session, `Strict` for high-privilege | CSRF mitigation |
| `Domain` | None (host-only) | Avoid subdomain leaks |
| `Path` | `/` or app root | Avoid 404-bound scoped paths |
| `Max-Age` | Sliding with absolute cap | Bounded risk |
| `__Host-` prefix | When possible | Bind to host and path |

### CSRF

- Use double-submit cookie or origin check. Not both at once.
- Origin/Referer check: state-changing endpoints reject when the `Origin` header is not in the allowlist.
- SameSite=Lax is necessary but not sufficient.
- Never use `GET` for state-changing actions.

### Rate Limiting

- Apply at the edge for unauthenticated endpoints: `/api/auth/*`, `/api/signup`, `/api/contact`, webhooks.
- Auth: ≤ 5 attempts per 15 minutes per IP+email.
- Signup: ≤ 1 per IP per minute, ≤ 5 per IP per day.
- Webhooks: ≤ 1 burst, then adaptive throttling; rely on signature verification.
- Implement rate limiting in middleware backed by the adapter's primitive (Cloudflare KV/Workers, Vercel KV, etc.).

### Secrets

| Class | Where |
|-------|-------|
| Build-time only | `.env` consumed at build; never logged |
| Server runtime | Adapter secret store (Cloudflare Secrets, Vercel env) |
| Public | `PUBLIC_*` envs — verified to be safe to ship |
| Never | Git, in source, in client bundles |

Any secret reference in a `PUBLIC_*` variable is a security defect, not a mistake.

### Third-Party Scripts

- Default: do not load any.
- Each script requires a written purpose and a CSP entry.
- Use `Partytown` or an iframe sandbox to keep scripts off the main thread.
- Tag managers are dangerous. Each container is a footgun. If used, audit quarterly.

### Dependencies

- Use `npm audit` or `pnpm audit` in CI. Fail on `high` or `critical`.
- Pin lockfile and enforce it in CI.
- Renovate or Dependabot configured for security updates.
- Vet new dependencies: downloads, maintenance, issues, supply-chain history.

## Anti-Patterns

- Setting `Content-Security-Policy: *` or omitting it entirely.
- Using `localStorage` for sessions.
- Trusting the `Origin` header alone without a check against an allowlist.
- Accepting secrets from client requests.
- Loading jQuery or analytics synchronously in `<head>`.
- Storing CSRF tokens in URLs.
- Relying on `SameSite=Strict` for cross-origin OAuth callbacks.
- Skipping rate limiting on `/login` because it's behind a "small" app.

## Implementation Guidance

### CSP Middleware (Cloudflare adapter)

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

const NONCE = crypto.randomUUID().replace(/-/g, '');

function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' https: data:`,
    `font-src 'self'`,
    `connect-src 'self' https://api.example.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `form-action 'self'`,
  ].join('; ');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  response.headers.set('Content-Security-Policy', buildCsp(NONCE));
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
});
```

### Session Cookies

```ts
context.cookies.set('session', token, {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 14,
});
```

### Rate Limiting (Cloudflare KV)

```ts
async function rateLimit(key: string, limit: number, windowSec: number) {
  const kv = (context.locals.runtime.env as Env).RATE_LIMIT;
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const id = `${key}:${bucket}`;
  const count = Number((await kv.get(id)) ?? 0) + 1;
  await kv.put(id, String(count), { expirationTtl: windowSec * 2 });
  return count > limit;
}
```

### Origin Check

```ts
function isTrustedOrigin(request: Request, allow: string[]): boolean {
  const origin = request.headers.get('origin') ?? request.headers.get('referer') ?? '';
  try {
    const u = new URL(origin);
    return allow.includes(u.origin);
  } catch {
    return false;
  }
}
```

## Coordination

- `skills/astro-saas` for authentication and authorization flows.
- `skills/astro-cloudflare` for edge-level rate limiting and secret management.
- `reviewers/security-reviewer.md` for per-PR security review.
- `governance/dependencies.md` for dependency policies.

## Success Criteria

- CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy are set on every response.
- Sessions use `HttpOnly`, `Secure`, `SameSite=Lax/Strict`, scoped cookies.
- State-changing endpoints verify CSRF or origin.
- Rate limits exist on auth, signup, and webhook endpoints.
- No `PUBLIC_*` env var contains a secret (CI-enforced).
- `npm audit --audit-level=high` is clean in CI.
