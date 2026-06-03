---
name: astro-ecommerce
description: E-commerce patterns for Astro — catalog, product detail, cart, checkout, payments, inventory, order management, and SEO for product surfaces. Use when building a storefront, headless commerce front-end, or product browsing experience on top of Shopify, Stripe, Medusa, or a custom backend.
---

# Astro E-commerce

> **Audience:** AI agents (primary) + Humans (skill authors)

Patterns for storefronts where the product catalog, browsing, and SEO surfaces must be fast, while cart, checkout, and order management are dynamic and high-integrity.

## Purpose

Render a fast, crawlable, accessible storefront with Astro while keeping the transactional surface isolated, correct, and auditable. Treat product data as a build artifact; treat cart and checkout as live systems.

## Responsibilities

- Ingest product data from the source of truth (Shopify, Medusa, custom API).
- Build static catalog pages with build-time revalidation.
- Handle cart state across client and server.
- Integrate a payment provider correctly: checkout sessions, webhooks, idempotency.
- Render structured data for `Product`, `Offer`, `BreadcrumbList`, `Organization`.
- Handle inventory, variants, and pricing in one place.
- Coordinate with `astro-seo`, `astro-performance`, `astro-security`.

## Decision Rules

### Catalog Rendering

- Product list pages (PLP) and product detail pages (PDP) → static with revalidation.
- Choose the revalidation strategy by update frequency:

| Update Frequency | Strategy |
|------------------|----------|
| Hourly or less    | Build-time fetch, deploy on every change |
| Every few minutes | ISR-like with adapter (Cloudflare KV cache, Fastly), short TTL |
| Live price/inventory | Server Island overlay on a static shell |

Never re-render the entire catalog for one product change. Invalidate by tag or key.

### Cart

Cart state lives where it makes sense per surface:

| Surface | State |
|---------|-------|
| Anonymous user | Signed cookie or `localStorage` |
| Logged-in user | Server-side cart table keyed by user ID |
| Cross-device | Server-side, keyed by user ID, mirrored to cookie for fast reads |

Never store the cart total or prices in `localStorage`. Those are derived from server state.

### Checkout

- Use the payment provider's hosted checkout or a Stripe Checkout session.
- Never accept raw card details on Astro pages. Always tokenize.
- The cart-to-checkout transition is the only place where the cart is "frozen" with a server-side snapshot.
- Apply discounts, taxes, and shipping on the server in a single function. Client-side previews are hints only.

### Pricing and Inventory

- Authoritative price and inventory live in the commerce backend.
- Astro caches by tag (e.g. `product:<sku>`) and revalidates on webhook.
- A product is "in stock" only when the backend confirms it. The PDP can show optimistic state with a clear disclaimer.
- Tax calculation belongs to a server endpoint that talks to a tax provider (Stripe Tax, TaxJar, custom).

### Structured Data

Every PDP emits:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "...",
  "image": ["..."],
  "description": "...",
  "sku": "...",
  "brand": { "@type": "Brand", "name": "..." },
  "offers": {
    "@type": "Offer",
    "url": "...",
    "priceCurrency": "USD",
    "price": "0.00",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition"
  }
}
```

Variation is handled with `offers: [...]` or a parent `Product` + `ProductVariant` graph.

## Anti-Patterns

- Trusting client-sent prices at checkout. The server must recompute.
- Caching the entire catalog as one giant JSON file in the browser.
- Showing the wrong product image because the cache and the live record diverged.
- Storing cart contents in a JWT in `localStorage` (forgery risk).
- Rendering variants client-side after page load without server-rendered defaults.
- Emitting `Product` JSON-LD without `Offer` (or with an empty `Offer`).
- Computing shipping or tax in the browser.

## Implementation Guidance

### Source-Agnostic Product Type

```ts
// src/lib/commerce/types.ts
export type Money = { amount: number; currency: string };

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  images: string[];
  price: Money;
  compareAtPrice?: Money;
  inStock: boolean;
  variants: Variant[];
  tags: string[];
  categoryHandles: string[];
}

export interface Variant {
  id: string;
  sku: string;
  title: string;
  price: Money;
  inStock: boolean;
  selectedOptions: { name: string; value: string }[];
}
```

### Static Product Detail Page

```astro
---
// src/pages/products/[handle].astro
import { getAllProducts, getProductByHandle } from '@/lib/commerce';
import ProductLayout from '@/layouts/Product.astro';
import ProductJsonLd from '@/components/ProductJsonLd.astro';

export async function getStaticPaths() {
  const products = await getAllProducts();
  return products.map((p) => ({ params: { handle: p.handle }, props: { product: p } }));
}
const { product } = Astro.props;
---
<ProductLayout product={product}>
  <ProductJsonLd product={product} slot="head" />
</ProductLayout>
```

### Cart Server Endpoint

```ts
// src/pages/api/cart/items.ts
import type { APIRoute } from 'astro';
import { recomputeCart, upsertCartItem } from '@/server/cart';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  const cart = await upsertCartItem({ cartId: locals.cartId, item: body });
  const priced = await recomputeCart(cart);
  return new Response(JSON.stringify(priced), {
    headers: { 'content-type': 'application/json' },
  });
};
```

### Checkout Session

```ts
// src/pages/api/checkout.ts
import type { APIRoute } from 'astro';
import { getStripe } from '@/server/billing';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const cart = await getCartForCheckout(locals.cartId);
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: cart.items.map(toStripeLineItem),
    success_url: `${import.meta.env.SITE}/orders/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${import.meta.env.SITE}/cart`,
  });
  return Response.json({ url: session.url });
};
```

### Inventory Webhook

```ts
// src/pages/api/webhooks/commerce.ts
import type { APIRoute } from 'astro';
import { revalidateByTag } from '@/server/cache';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const event = await verifyWebhook(request);  // provider-specific
  if (event.type === 'product.updated' || event.type === 'inventory.updated') {
    await revalidateByTag(`product:${event.sku}`);
    await revalidateByTag(`collection:${event.collection}`);
  }
  return new Response('ok');
};
```

## Coordination

- `skills/astro-seo` for canonical URLs on PDP and PLP, pagination correctness, and structured data validation.
- `skills/astro-performance` for image budgets and LCP targets on PDPs.
- `skills/astro-security` for CSRF on cart endpoints and webhook signature verification.
- `reviewers/seo-reviewer.md` for product structured data review.
- `reviewers/security-reviewer.md` for checkout and webhook review.

## Success Criteria

- PLP and PDP render statically; LCP < 1.8s on representative products.
- Price, tax, and shipping are always recomputed server-side at checkout.
- Every PDP has valid `Product` + `Offer` JSON-LD.
- Webhook handlers are idempotent and verify signatures.
- Inventory and price changes propagate to the storefront within the revalidation budget.
