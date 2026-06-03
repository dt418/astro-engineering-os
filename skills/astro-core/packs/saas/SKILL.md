# SaaS Pack

> **Audience:** AI agents (primary) + Humans (skill authors)

Extends `astro-core` with patterns specific to SaaS (Software as a Service) applications.

## Purpose

The `saas` pack provides specialized knowledge for building SaaS applications with features like authentication, subscriptions, multi-tenancy, billing, and dashboard interfaces.

---

# Architecture

## Project Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.astro
│   │   ├── SignupForm.astro
│   │   └── PasswordReset.astro
│   ├── dashboard/
│   │   ├── DashboardLayout.astro
│   │   ├── Sidebar.astro
│   │   ├── Header.astro
│   │   └── MetricCard.astro
│   ├── billing/
│   │   ├── PricingTable.astro
│   │   ├── InvoiceList.astro
│   │   └── SubscriptionStatus.astro
│   └── shared/
│       ├── Button.astro
│       ├── Input.astro
│       └── Modal.astro
├── layouts/
│   ├── MarketingLayout.astro
│   └── DashboardLayout.astro
├── pages/
│   ├── index.astro
│   ├── pricing.astro
│   ├── auth/
│   │   ├── login.astro
│   │   ├── signup.astro
│   │   └── callback.astro
│   ├── dashboard/
│   │   ├── index.astro
│   │   ├── settings/
│   │   └── billing/
│   └── api/
│       ├── auth/
│       ├── billing/
│       └── webhooks/
├── lib/
│   ├── auth.ts
│   ├── billing.ts
│   └── tenant.ts
├── db/
│   └── schema.ts
└── actions/
    ├── auth.ts
    └── billing.ts
```

---

# Authentication

## Auth Provider Setup

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    github: {
      clientId: import.meta.env.GITHUB_CLIENT_ID,
      clientSecret: import.meta.env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: import.meta.env.GOOGLE_CLIENT_ID,
      clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update daily
  },
});
```

## Middleware Protection

```typescript
// src/middleware.ts
import { auth } from './lib/auth';
import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const session = await auth.getSession(context.request);
  
  const protectedRoutes = ['/dashboard', '/settings', '/billing'];
  const isProtected = protectedRoutes.some(route => 
    context.url.pathname.startsWith(route)
  );
  
  if (isProtected && !session) {
    return context.redirect('/auth/login');
  }
  
  return next();
};
```

## Login Action

```typescript
// src/actions/auth.ts
import { fail, redirect } from '@astrojs/core';
import { signIn } from './auth';

export const login = defineAction({
  accept: 'form',
  input: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    remember: z.boolean().optional(),
  }),
  handler: async ({ email, password, remember }) => {
    try {
      const session = await signIn.emailPassword(email, password, {
        remember,
      });
      
      return redirect('/dashboard');
    } catch (error) {
      return fail(400, {
        error: 'Invalid email or password',
      });
    }
  },
});
```

---

# Multi-Tenancy

## Tenant Model

```typescript
// src/db/schema.ts
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan', { enum: ['free', 'pro', 'enterprise'] }).default('free'),
  settings: text('settings', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role', { enum: ['owner', 'admin', 'member'] }).default('member'),
  avatar: text('avatar'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});
```

## Tenant Resolution

```typescript
// src/lib/tenant.ts
import { auth } from './auth';

export async function getTenant(context: { request: Request }) {
  const session = await auth.getSession(context.request);
  
  if (!session?.user) {
    return null;
  }
  
  // Get user's tenant from database
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    with: {
      tenant: true,
    },
  });
  
  return user?.tenant;
}

export async function requireTenant(context: { request: Request }) {
  const tenant = await getTenant(context);
  
  if (!tenant) {
    throw new Error('No tenant found');
  }
  
  return tenant;
}
```

---

# Subscription Management

## Subscription Schema

```typescript
// src/db/schema.ts
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: text('plan').notNull(),
  status: text('status', { 
    enum: ['active', 'canceled', 'past_due', 'trialing'] 
  }),
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
  canceledAt: integer('canceled_at', { mode: 'timestamp' }),
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  stripeInvoiceId: text('stripe_invoice_id'),
  amount: integer('amount').notNull(), // cents
  currency: text('currency').default('usd'),
  status: text('status', { enum: ['paid', 'open', 'void'] }),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  invoiceUrl: text('invoice_url'),
});
```

## Billing Actions

```typescript
// src/actions/billing.ts
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = defineAction({
  accept: 'form',
  input: z.object({
    plan: z.enum(['pro', 'enterprise']),
    tenantId: z.string(),
  }),
  handler: async ({ plan, tenantId }) => {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    
    if (!tenant) {
      return fail(400, { error: 'Tenant not found' });
    }
    
    const priceId = PLAN_PRICES[plan];
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${import.meta.env.SITE_URL}/dashboard/billing?success=true`,
      cancel_url: `${import.meta.env.SITE_URL}/dashboard/billing?canceled=true`,
      metadata: { tenantId },
    });
    
    return redirect(session.url!);
  },
});

export const createBillingPortal = defineAction({
  accept: 'form',
  handler: async (_, { locals }) => {
    const session = await auth.getSession(locals.request);
    const user = await getUserWithTenant(session.user.id);
    
    if (!user?.subscription?.stripeSubscriptionId) {
      return fail(400, { error: 'No subscription found' });
    }
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.subscription.stripeSubscriptionId,
      return_url: `${import.meta.env.SITE_URL}/dashboard/billing`,
    });
    
    return redirect(portalSession.url);
  },
});
```

---

# Dashboard Components

## Metric Card

```astro
---
// src/components/dashboard/MetricCard.astro
interface Props {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: string;
}

const { label, value, change, changeLabel, icon } = Astro.props;
const isPositive = change && change > 0;
---

<div class="metric-card">
  <div class="metric-header">
    <span class="metric-label">{label}</span>
    {icon && <span class="metric-icon">{icon}</span>}
  </div>
  <div class="metric-value">{value}</div>
  {change !== undefined && (
    <div class:list={['metric-change', { positive: isPositive, negative: !isPositive }]}>
      <span class="change-arrow">{isPositive ? '↑' : '↓'}</span>
      <span>{Math.abs(change)}%</span>
      {changeLabel && <span class="change-label">{changeLabel}</span>}
    </div>
  )}
</div>
```

## Dashboard Layout

```astro
---
// src/layouts/DashboardLayout.astro
import { auth } from '../lib/auth';
import Sidebar from '../components/dashboard/Sidebar.astro';
import Header from '../components/dashboard/Header.astro';

const session = await auth.getSession(Astro.request);
const user = await getUserWithTenant(session.user.id);

const currentPath = Astro.url.pathname;
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Dashboard - {user?.tenant?.name}</title>
  </head>
  <body>
    <div class="dashboard">
      <Sidebar {currentPath} user={user} />
      <div class="dashboard-content">
        <Header user={user} />
        <main class="dashboard-main">
          <slot />
        </main>
      </div>
    </div>
  </body>
</html>
```

---

# Pricing Page

## Pricing Table

```astro
---
// src/pages/pricing.astro
const plans = [
  {
    name: 'Free',
    price: 0,
    features: ['5 projects', '1GB storage', 'Community support'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: 29,
    features: ['Unlimited projects', '100GB storage', 'Priority support', 'Custom domains'],
    cta: 'Start Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    features: ['Everything in Pro', 'Unlimited storage', 'SSO', 'SLA', 'Dedicated support'],
    cta: 'Contact Sales',
    popular: false,
  },
];
---

<div class="pricing-table">
  {plans.map(plan => (
    <div class:list={['plan-card', { popular: plan.popular }]}>
      {plan.popular && <span class="popular-badge">Most Popular</span>}
      <h3>{plan.name}</h3>
      <div class="price">
        <span class="amount">${plan.price}</span>
        <span class="period">/month</span>
      </div>
      <ul class="features">
        {plan.features.map(feature => (
          <li>{feature}</li>
        ))}
      </ul>
      <form action={checkoutAction}>
        <input type="hidden" name="plan" value={plan.name.toLowerCase()} />
        <button type="submit">{plan.cta}</button>
      </form>
    </div>
  ))}
</div>
```

---

# Webhooks

## Stripe Webhook Handler

```typescript
// src/pages/api/webhooks/stripe.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      import.meta.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return new Response('Webhook Error', { status: 400 });
  }
  
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await db.update(subscriptions)
        .set({
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
      break;
    }
    
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await db.insert(invoices).values({
        id: invoice.id,
        tenantId: invoice.metadata.tenantId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        status: 'paid',
        paidAt: new Date(),
        invoiceUrl: invoice.hosted_invoice_url,
      });
      break;
    }
  }
  
  return new Response('OK', { status: 200 });
};
```

---

# SEO Considerations

## SaaS Landing Page SEO

- Home page with clear value proposition
- Feature pages with detailed explanations
- Case studies and testimonials
- Pricing transparency
- Blog for content marketing

## Technical SEO

- Structured data for software application
- breadcrumbList schema
- FAQ schema for pricing page
- Organization schema for company

---

# Performance Considerations

## Dashboard Performance

- Lazy load dashboard widgets
- Virtual scrolling for large lists
- Optimistic updates for actions
- Debounced search inputs

## Bundle Optimization

- Code split by route
- Lazy load billing components
- Preload critical fonts
- Inline critical CSS

---

# Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Auth on every request | Slow | Cache session |
| No tenant isolation | Security | Strict queries |
| Sync billing state | Complexity | Webhook-driven |
| Large API responses | Performance | Pagination |
| No rate limiting | Abuse | Add rate limits |

---

# Security Considerations

## Authorization

```typescript
// Middleware check
export async function requireRole(roles: string[]) {
  return async (context: { request: Request }) => {
    const session = await auth.getSession(context.request);
    const user = await getUserWithTenant(session.user.id);
    
    if (!roles.includes(user.role)) {
      return new Response('Forbidden', { status: 403 });
    }
    
    return user;
  };
}
```

## Rate Limiting

```typescript
// Apply to sensitive endpoints
const rateLimit = await checkRateLimit({
  key: request.headers.get('x-forwarded-for') || 'unknown',
  limit: 100,
  window: '1 minute',
});

if (!rateLimit.success) {
  return new Response('Too Many Requests', { status: 429 });
}
```

---

# Deployment

## Environment Variables

```bash
# Production
DATABASE_URL=file:./prod.db
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
GITHUB_CLIENT_ID=...
GOOGLE_CLIENT_ID=...
SITE_URL=https://yourapp.com
```

## Recommended Platforms

| Platform | Best For | Features |
|----------|----------|----------|
| Cloudflare Workers | Performance | Edge, D1, KV |
| Vercel | DX | Serverless, Edge |
| Railway | Simplicity | Auto-scaling |
| Fly.io | Global | Multi-region |