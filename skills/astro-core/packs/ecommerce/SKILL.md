# E-commerce Pack

> **Audience:** AI agents (primary) + Humans (skill authors)

Extends `astro-core` with patterns specific to e-commerce applications.

## Purpose

The `e-commerce` pack provides specialized knowledge for building e-commerce platforms with features like product catalogs, shopping cart, checkout, payments, inventory management, and order processing.

---

# Architecture

## Project Structure

```
src/
├── components/
│   ├── product/
│   │   ├── ProductCard.astro
│   │   ├── ProductGrid.astro
│   │   ├── ProductGallery.astro
│   │   └── ProductInfo.astro
│   ├── cart/
│   │   ├── CartButton.astro
│   │   ├── CartDrawer.astro
│   │   ├── CartItem.astro
│   │   └── CartSummary.astro
│   ├── checkout/
│   │   ├── CheckoutForm.astro
│   │   ├── AddressForm.astro
│   │   ├── PaymentForm.astro
│   │   └── OrderSummary.astro
│   ├── account/
│   │   ├── OrderHistory.astro
│   │   ├── Wishlist.astro
│   │   └── ProfileForm.astro
│   └── shared/
│       ├── Badge.astro
│       ├── Rating.astro
│       └── Price.astro
├── layouts/
│   ├── StoreLayout.astro
│   ├── ProductLayout.astro
│   └── CheckoutLayout.astro
├── pages/
│   ├── index.astro
│   ├── products/
│   │   ├── index.astro
│   │   ├── [slug].astro
│   │   └── category/[category].astro
│   ├── cart.astro
│   ├── checkout/
│   │   ├── index.astro
│   │   └── success.astro
│   ├── account/
│   └── api/
│       ├── products/
│       ├── cart/
│       └── checkout/
├── lib/
│   ├── products.ts
│   ├── cart.ts
│   ├── orders.ts
│   └── payments.ts
├── db/
│   └── schema.ts
└── actions/
    ├── cart.ts
    └── checkout.ts
```

---

# Product Management

## Product Schema

```typescript
// src/db/schema.ts
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(), // cents
  compareAtPrice: integer('compare_at_price'),
  sku: text('sku').unique(),
  inventory: integer('inventory').default(0),
  status: text('status', { enum: ['active', 'draft', 'archived'] }).default('active'),
  categoryId: text('category_id').references(() => categories.id),
  images: text('images', { mode: 'json' }),
  variants: text('variants', { mode: 'json' }),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  image: text('image'),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').default(0),
});
```

## Product Queries

```typescript
// src/lib/products.ts
import { db } from 'astro:db';

export async function getProducts(filters?: {
  category?: string;
  status?: 'active' | 'draft' | 'archived';
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = db.select().from(products).where(eq(products.status, 'active'));
  
  if (filters?.category) {
    query = query.where(eq(products.categoryId, filters.category));
  }
  
  if (filters?.search) {
    query = query.where(
      or(
        like(products.name, `%${filters.search}%`),
        like(products.description, `%${filters.search}%`)
      )
    );
  }
  
  return query
    .limit(filters?.limit || 20)
    .offset(filters?.offset || 0)
    .orderBy(desc(products.createdAt));
}

export async function getProductBySlug(slug: string) {
  return db.select().from(products).where(eq(products.slug, slug)).get();
}

export async function getRelatedProducts(productId: string, limit = 4) {
  const product = await getProductById(productId);
  
  if (!product?.categoryId) return [];
  
  return db.select().from(products)
    .where(
      and(
        eq(products.categoryId, product.categoryId),
        ne(products.id, productId),
        eq(products.status, 'active')
      )
    )
    .limit(limit);
}
```

---

# Shopping Cart

## Cart State Management

```typescript
// src/lib/cart.ts
import { defineAction, z } from 'astro:actions';

interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export async function getCart(sessionId: string): Promise<CartItem[]> {
  const cartData = await KV.get(`cart:${sessionId}`);
  return cartData ? JSON.parse(cartData) : [];
}

export async function setCart(sessionId: string, items: CartItem[]): Promise<void> {
  await KV.put(`cart:${sessionId}`, JSON.stringify(items), {
    expirationTtl: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function addToCart(
  sessionId: string, 
  productId: string, 
  quantity: number,
  variantId?: string
): Promise<CartItem[]> {
  const cart = await getCart(sessionId);
  
  const existingIndex = cart.findIndex(
    item => item.productId === productId && item.variantId === variantId
  );
  
  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({ productId, variantId, quantity });
  }
  
  await setCart(sessionId, cart);
  return cart;
}

export async function updateCartItem(
  sessionId: string,
  productId: string,
  quantity: number,
  variantId?: string
): Promise<CartItem[]> {
  const cart = await getCart(sessionId);
  
  if (quantity <= 0) {
    return removeFromCart(sessionId, productId, variantId);
  }
  
  const index = cart.findIndex(
    item => item.productId === productId && item.variantId === variantId
  );
  
  if (index > -1) {
    cart[index].quantity = quantity;
    await setCart(sessionId, cart);
  }
  
  return cart;
}

export async function removeFromCart(
  sessionId: string,
  productId: string,
  variantId?: string
): Promise<CartItem[]> {
  const cart = await getCart(sessionId);
  const filtered = cart.filter(
    item => !(item.productId === productId && item.variantId === variantId)
  );
  await setCart(sessionId, filtered);
  return filtered;
}

export async function clearCart(sessionId: string): Promise<void> {
  await KV.delete(`cart:${sessionId}`);
}
```

## Cart Actions

```typescript
// src/actions/cart.ts
export const addToCart = defineAction({
  accept: 'form',
  input: z.object({
    productId: z.string(),
    quantity: z.number().min(1).max(99),
    variantId: z.string().optional(),
  }),
  handler: async ({ productId, quantity, variantId }) => {
    const sessionId = await getSessionId(Astro);
    
    const product = await getProductById(productId);
    if (!product) {
      return fail(400, { error: 'Product not found' });
    }
    
    if (product.inventory < quantity) {
      return fail(400, { error: 'Insufficient inventory' });
    }
    
    await addToCart(sessionId, productId, quantity, variantId);
    
    return { success: true };
  },
});

export const updateCart = defineAction({
  accept: 'form',
  input: z.object({
    productId: z.string(),
    quantity: z.number().min(0).max(99),
    variantId: z.string().optional(),
  }),
  handler: async ({ productId, quantity, variantId }) => {
    const sessionId = await getSessionId(Astro);
    
    if (quantity === 0) {
      await removeFromCart(sessionId, productId, variantId);
    } else {
      await updateCartItem(sessionId, productId, quantity, variantId);
    }
    
    return { success: true };
  },
});

export const clearCartAction = defineAction({
  handler: async () => {
    const sessionId = await getSessionId(Astro);
    await clearCart(sessionId);
    return { success: true };
  },
});
```

---

# Product Display

## Product Card

```astro
---
// src/components/product/ProductCard.astro
interface Props {
  product: {
    slug: string;
    name: string;
    price: number;
    compareAtPrice?: number;
    images: string[];
    rating?: number;
    reviewCount?: number;
  };
}

const { product } = Astro.props;
const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
---

<article class="product-card">
  <a href={`/products/${product.slug}`}>
    <div class="product-image">
      <img src={product.images[0]} alt={product.name} loading="lazy" />
      {hasDiscount && <span class="sale-badge">Sale</span>}
    </div>
    <div class="product-info">
      <h3>{product.name}</h3>
      <div class="product-rating">
        {product.rating && (
          <>
            <span class="stars">{'★'.repeat(Math.floor(product.rating))}</span>
            <span class="count">({product.reviewCount})</span>
          </>
        )}
      </div>
      <div class="product-price">
        <span class="price">${(product.price / 100).toFixed(2)}</span>
        {hasDiscount && (
          <span class="compare-price">
            ${(product.compareAtPrice! / 100).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  </a>
  
  <button 
    class="add-to-cart"
    data-product-id={product.id}
    data-variant-id={product.variantId}
  >
    Add to Cart
  </button>
</article>
```

## Product Gallery

```astro
---
// src/components/product/ProductGallery.astro
interface Props {
  images: string[];
  alt: string;
}

const { images, alt } = Astro.props;
---

<div class="product-gallery">
  <div class="main-image">
    <img id="main-image" src={images[0]} alt={alt} />
  </div>
  <div class="thumbnails">
    {images.map((image, index) => (
      <button 
        class:list={{ active: index === 0 }}
        data-index={index}
      >
        <img src={image} alt={`${alt} - Image ${index + 1}`} />
      </button>
    ))}
  </div>
</div>

<script>
  const thumbnails = document.querySelectorAll('.thumbnail button');
  const mainImage = document.getElementById('main-image');
  
  thumbnails.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index!);
      mainImage.src = images[index];
      thumbnails.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
    });
  });
</script>
```

---

# Checkout

## Checkout Flow

```
Cart → Information → Shipping → Payment → Confirmation
```

## Checkout Page

```astro
---
// src/pages/checkout/index.astro
import CheckoutLayout from '../../layouts/CheckoutLayout.astro';
import OrderSummary from '../../components/checkout/OrderSummary.astro';
import AddressForm from '../../components/checkout/AddressForm.astro';
import PaymentForm from '../../components/checkout/PaymentForm.astro';

const sessionId = await getSessionId(Astro);
const cart = await getCart(sessionId);
const cartProducts = await Promise.all(
  cart.map(async item => ({
    ...item,
    product: await getProductById(item.productId),
  }))
);

const subtotal = cartProducts.reduce(
  (sum, item) => sum + (item.product?.price || 0) * item.quantity, 
  0
);
const shipping = subtotal > 5000 ? 0 : 999; // Free over $50
const tax = Math.round(subtotal * 0.08); // 8% tax
const total = subtotal + shipping + tax;
---

<CheckoutLayout title="Checkout">
  <div class="checkout-grid">
    <div class="checkout-form">
      <section class="step" id="information">
        <h2>Contact Information</h2>
        <form id="information-form">
          <input type="email" name="email" placeholder="Email" required />
          <label>
            <input type="checkbox" name="newsletter" />
            Email me with news and offers
          </label>
        </form>
      </section>
      
      <section class="step" id="shipping">
        <h2>Shipping Address</h2>
        <AddressForm />
      </section>
      
      <section class="step" id="payment">
        <h2>Payment</h2>
        <PaymentForm />
      </section>
    </div>
    
    <aside class="order-summary">
      <OrderSummary 
        items={cartProducts}
        subtotal={subtotal}
        shipping={shipping}
        tax={tax}
        total={total}
      />
    </aside>
  </div>
</CheckoutLayout>
```

## Stripe Checkout

```typescript
// src/actions/checkout.ts
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = defineAction({
  accept: 'form',
  input: z.object({
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number(),
    })),
  }),
  handler: async ({ items }) => {
    const products = await Promise.all(
      items.map(async item => {
        const product = await getProductById(item.productId);
        return {
          product,
          quantity: item.quantity,
        };
      })
    );
    
    const lineItems = products.map(({ product, quantity }) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: product!.name,
          images: product!.images,
        },
        unit_amount: product!.price,
      },
      quantity,
    }));
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed',
            fixed_amount: { amount: 999, currency: 'usd' },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed',
            fixed_amount: { amount: 1999, currency: 'usd' },
            display_name: 'Express Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 3 },
            },
          },
        },
      ],
      success_url: `${import.meta.env.SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${import.meta.env.SITE_URL}/cart`,
    });
    
    return redirect(session.url!);
  },
});
```

---

# Orders

## Order Schema

```typescript
// src/db/schema.ts
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id),
  status: text('status', { 
    enum: ['pending', 'processing', 'shipped', 'delivered', 'canceled'] 
  }).default('pending'),
  subtotal: integer('subtotal').notNull(),
  shipping: integer('shipping').notNull(),
  tax: integer('tax').notNull(),
  total: integer('total').notNull(),
  shippingAddress: text('shipping_address', { mode: 'json' }),
  billingAddress: text('billing_address', { mode: 'json' }),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id),
  productId: text('product_id').references(() => products.id),
  variantId: text('variant_id'),
  name: text('name').notNull(),
  sku: text('sku'),
  price: integer('price').notNull(),
  quantity: integer('quantity').notNull(),
});
```

---

# Inventory Management

## Stock Check

```typescript
// src/lib/inventory.ts
export async function checkInventory(productId: string, quantity: number): Promise<{
  available: boolean;
  currentStock: number;
  requested: number;
}> {
  const product = await db.select()
    .from(products)
    .where(eq(products.id, productId))
    .get();
  
  return {
    available: (product?.inventory || 0) >= quantity,
    currentStock: product?.inventory || 0,
    requested: quantity,
  };
}

export async function reserveInventory(
  productId: string, 
  quantity: number, 
  orderId: string
): Promise<boolean> {
  const { available } = await checkInventory(productId, quantity);
  
  if (!available) return false;
  
  await db.update(products)
    .set({ inventory: sql`inventory - ${quantity}` })
    .where(eq(products.id, productId));
  
  await db.insert(inventoryReservations).values({
    id: generateId(),
    productId,
    quantity,
    orderId,
    createdAt: new Date(),
  });
  
  return true;
}
```

---

# Wishlist

## Wishlist Implementation

```typescript
// src/lib/wishlist.ts
export async function getWishlist(customerId: string): Promise<string[]> {
  const data = await KV.get(`wishlist:${customerId}`);
  return data ? JSON.parse(data) : [];
}

export async function addToWishlist(customerId: string, productId: string): Promise<void> {
  const wishlist = await getWishlist(customerId);
  
  if (!wishlist.includes(productId)) {
    wishlist.push(productId);
    await KV.set(`wishlist:${customerId}`, JSON.stringify(wishlist));
  }
}

export async function removeFromWishlist(customerId: string, productId: string): Promise<void> {
  const wishlist = await getWishlist(customerId);
  const filtered = wishlist.filter(id => id !== productId);
  await KV.set(`wishlist:${customerId}`, JSON.stringify(filtered));
}
```

---

# SEO for E-commerce

## Product Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": ["image1.jpg", "image2.jpg"],
  "sku": "SKU123",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "price": "29.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "89"
  }
}
```

## Breadcrumbs

```html
<nav aria-label="Breadcrumb">
  <ol itemscope itemtype="https://schema.org/BreadcrumbList">
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a itemprop="item" href="/">
        <span itemprop="name">Home</span>
      </a>
      <meta itemprop="position" content="1" />
    </li>
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a itemprop="item" href="/products">
        <span itemprop="name">Products</span>
      </a>
      <meta itemprop="position" content="2" />
    </li>
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <span itemprop="name">Current Product</span>
      <meta itemprop="position" content="3" />
    </li>
  </ol>
</nav>
```

---

# Performance Considerations

## Image Optimization

- WebP format with fallbacks
- Lazy loading for below-fold images
- Responsive images with srcset
- CDN for image delivery

## Caching Strategy

- Static product pages (SSG)
- Dynamic cart and checkout (SSR)
- Edge caching for product catalog
- Stale-while-revalidate for inventory

---

# Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| No inventory check | Overselling | Reserve on add to cart |
| Sync payment | Double charges | Webhook confirmation |
| Large page size | Slow load | Lazy load images |
| No cart persistence | Lost carts | Cookie/session storage |
| Missing stock display | Poor UX | Show availability |

---

# Security Considerations

## PCI Compliance

- Use Stripe Elements for card input
- Never store card numbers
- Use HTTPS everywhere
- Implement fraud detection

## Input Validation

```typescript
// Validate all inputs
const checkoutSchema = z.object({
  email: z.string().email(),
  shippingAddress: z.object({
    line1: z.string().min(1),
    city: z.string().min(1),
    country: z.string().length(2),
    postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  }),
});
```

---

# Deployment

## Recommended Setup

| Component | Service | Reason |
|-----------|---------|--------|
| Frontend | Cloudflare Pages | Fast, global |
| Database | Turso/LibSQL | Edge-compatible |
| Payments | Stripe | PCI compliant |
| Search | Algolia | Fast search |
| CDN | Cloudflare | Global delivery |