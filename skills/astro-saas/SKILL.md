---
name: astro-saas
description: SaaS application patterns in Astro — marketing site + authenticated app, hybrid rendering, sessions, billing, dashboards, role-based access, and multi-tenant architecture. Use when building a SaaS product where the public marketing site and the logged-in product share a codebase.
---

# Astro SaaS

Patterns for SaaS products where a static marketing site, a documentation site, and an authenticated application live in the same repository — and where rendering, security, and performance budgets differ sharply between zones.

## Purpose

Keep the marketing surface fast and static, the docs surface fast and indexed, and the app surface dynamic and secure — without splitting the codebase or duplicating infrastructure.

## Responsibilities

- Define zones (marketing, docs, app) with explicit rendering rules per zone.
- Implement authentication and session management.
- Enforce route-level authorization.
- Handle billing webhook ingestion and subscription state.
- Provide dashboard views with per-request data.
- Handle multi-tenant data isolation when applicable.
- Coordinate with `astro-security`, `astro-performance`, `astro-cloudflare`.

## Decision Rules

### Zone Boundaries

| Zone | Path | Rendering | Auth |
|------|------|-----------|------|
| Marketing | `/`, `/pricing`, `/about`, `/blog/*` | Static (SSG) | None |
| Docs | `/docs/*` | Static (SSG) | None |
| Auth | `/login`, `/signup`, `/reset` | SSR (per route) | Pre-auth |
| App | `/app/*` | SSR | Required |
| API | `/api/*` | SSR | Required (except public webhooks) |
| Webhooks | `/api/webhooks/*` | SSR | Signature-verified |

Every page in a zone explicitly declares its rendering mode. Never let a route inherit the wrong default.

### Auth Strategy

Default: session cookie + server-side session store.

- Use a battle-tested library (Lucia, Better Auth, Auth.js) — do not roll your own.
- Sessions stored in a server-side store (KV, Postgres, Redis).
- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax`, scoped to your domain.
- Session rotation on privilege escalation and password change.
- Sliding expiration with absolute maximum (e.g. 14 days sliding, 30 days max).

OAuth providers are added on top of the session model, not as a replacement.

### Authorization

- Authorization decisions are made in `middleware.ts` and re-checked in every server endpoint.
- Roles and permissions live in the database, never hard-coded in client bundles.
- Use a single `authorize(user, action, resource)` function. No scattered checks.
- Deny by default. Allow only when an explicit rule matches.

### Billing

- Provider: Stripe (default) or LemonSqueezy.
- Subscription state lives in your database, not in the provider.
- Provider is the source of truth on price IDs and webhook events.
- Webhook handlers verify signatures and are idempotent on event ID.
- Subscription state transitions go through a single service module.

### Multi-Tenancy

| Need | Pattern |
|------|---------|
| Each customer is one workspace, no sharing | Single database, `tenant_id` column on every row |
| Customers can invite users across workspaces | Membership table joining users and tenants |
| Strict data isolation, compliance-driven | Schema-per-tenant or database-per-tenant |

Default to row-level isolation with `tenant_id`. Move to schema-per-tenant only when compliance demands it.

### Dashboards

- Render the shell statically; load data on the server in the same request.
- Use Server Islands for non-critical widgets to keep TTFB low.
- Stream HTML where supported by the adapter.
- Cache aggregate queries with short TTLs (30–120s) keyed by `tenant_id`.

## Anti-Patterns

- Marketing and app sharing the same layout, dragging client JS into landing pages.
- Authorization checks living only in the client.
- Storing session state in client-readable cookies (e.g. JWT in `localStorage`).
- Trusting `req.user` populated by middleware in unrelated endpoints without re-checking authorization.
- Treating Stripe as the source of truth for plan limits (you can't query Stripe in the hot path).
- Per-tenant subdomain routing without explicit DNS and certificate plans.
- Running expensive ORM queries in the marketing zone (e.g. live MRR counter on the homepage).

## Implementation Guidance

### `astro.config.mjs`

```ts
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static',
  adapter: cloudflare({ mode: 'directory' }),
  redirects: {
    '/app': '/app/dashboard',
  },
});
```

Routes opt into SSR per file:

```astro
---
// src/pages/app/dashboard.astro
export const prerender = false;
---
```

### Middleware

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { resolveSession } from '@/server/auth/session';

export const onRequest = defineMiddleware(async (context, next) => {
  const session = await resolveSession(context.cookies);
  context.locals.user = session?.user ?? null;
  context.locals.session = session ?? null;

  const path = context.url.pathname;
  const protectedPath = path.startsWith('/app') || path.startsWith('/api/private');

  if (protectedPath && !session) {
    return context.redirect(`/login?next=${encodeURIComponent(path)}`);
  }

  return next();
});
```

### Authorization Module

```ts
// src/server/authz/index.ts
type Action =
  | 'workspace:read'
  | 'workspace:write'
  | 'billing:manage'
  | 'member:invite';

export function authorize(user: User, action: Action, resource: Resource): boolean {
  if (!user.memberships.some((m) => m.tenantId === resource.tenantId)) return false;
  const role = user.memberships.find((m) => m.tenantId === resource.tenantId)?.role;
  if (!role) return false;
  return RULES[role].has(action);
}

const RULES = {
  owner:  new Set<Action>(['workspace:read', 'workspace:write', 'billing:manage', 'member:invite']),
  admin:  new Set<Action>(['workspace:read', 'workspace:write', 'member:invite']),
  member: new Set<Action>(['workspace:read']),
};
```

### Stripe Webhook

```ts
// src/pages/api/webhooks/stripe.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { recordEvent, applyEvent } from '@/server/billing';

export const prerender = false;

const stripe = new Stripe(import.meta.env.STRIPE_SECRET, { apiVersion: '2024-06-20' });

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature');
  if (!sig) return new Response('missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      sig,
      import.meta.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return new Response('invalid signature', { status: 400 });
  }

  if (await recordEvent(event.id)) {
    await applyEvent(event);
  }
  return new Response('ok');
};
```

## Coordination

- `skills/astro-security` for cookie, CSRF, and CSP rules.
- `skills/astro-performance` for the marketing/app split.
- `skills/astro-cloudflare` for KV-backed sessions and rate limiting.
- `reviewers/security-reviewer.md` for auth and billing change review.
- `governance/features.md` for feature-first module boundaries.

## Success Criteria

- Marketing zone has zero `client:load` and < 50KB JS.
- App zone enforces auth in middleware and re-checks in every endpoint.
- Webhook handlers are idempotent on provider event ID.
- Subscription state in DB is reconcilable against Stripe via a single command.
- Authorization has 100% test coverage; failures are explicit, never silent.
