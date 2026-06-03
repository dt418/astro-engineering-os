# ADR-001: Rendering Strategy Selection

**Status:** Accepted
**Date:** 2024-01-15
**Deciders:** Astro Engineering OS Team

## Context

Astro supports multiple rendering strategies: Static Site Generation (SSG), Server-Side Rendering (SSR), Hybrid rendering, Islands architecture, and Server Islands. Each strategy has different performance characteristics, infrastructure requirements, and use cases.

When building an Astro project, the choice of rendering strategy affects:
- Performance characteristics
- Infrastructure costs
- Development complexity
- User experience
- SEO capabilities

### Decision Drivers

1. **Content update frequency** - How often does content change?
2. **User personalization** - Is content customized per user?
3. **Real-time requirements** - Is live data required?
4. **SEO importance** - Is search engine ranking critical?
5. **Infrastructure budget** - What hosting costs are acceptable?
6. **Performance targets** - What are the Core Web Vitals goals?

## Decision

We adopt a **layered rendering strategy** with clear decision criteria:

### Primary Strategy: SSG

Default to Static Site Generation for all pages that can be pre-rendered.

**Criteria for SSG:**
- Content updates less frequently than build frequency
- No user-specific content
- SEO is important
- Performance is critical

**Implementation:**
```javascript
// astro.config.mjs
export default defineConfig({
  output: 'static', // Default
});
```

### Secondary Strategy: Islands

Use the Islands architecture for interactive components within static pages.

**Criteria for Islands:**
- Interactive UI elements (forms, carts, search)
- Components with client-side JavaScript requirements
- Partial hydration is feasible

**Implementation:**
```astro
<CartDrawer client:visible>
  <ShoppingCart />
</CartDrawer>
```

### Tertiary Strategy: SSR/Hybrid

Use Server-Side Rendering for pages requiring dynamic content.

**Criteria for SSR:**
- User-specific content (dashboards, profiles)
- Real-time data requirements
- Content updates more frequently than desired build frequency
- Authentication-gated content

**Implementation:**
```javascript
// astro.config.mjs
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

**Per-page control (Hybrid):**
```astro
---
export const prerender = false; // SSR this page
---
```

### Progressive Enhancement

Use Server Islands for progressive enhancement of static pages with dynamic sections.

**Criteria for Server Islands:**
- Large dynamic sections
- Server-only rendering is appropriate
- Client JavaScript should be minimized

## Alternatives Considered

### Option 1: Pure SSR

**Description:** Server-render all pages

**Pros:**
- Maximum flexibility
- Always fresh content
- Single rendering approach

**Cons:**
- Higher infrastructure costs
- Slower page loads
- Server maintenance required
- More complex deployment

**Verdict:** Rejected. Pure SSR is unnecessary for content-heavy sites and adds unnecessary complexity and cost.

### Option 2: Pure SSG

**Description:** Static-generate all pages, client-side hydration for interactivity

**Pros:**
- Maximum performance
- CDN-only hosting
- Simple deployment
- Best SEO

**Cons:**
- No real-time content
- Rebuild required for updates
- Complex client state management

**Verdict:** Rejected. Many applications require dynamic content that pure SSG cannot provide.

### Option 3: Islands + Hybrid

**Chosen Option:** Our current decision

**Pros:**
- Best of all worlds
- Per-page optimization
- Performance + flexibility
- Gradual complexity

**Cons:**
- Multiple rendering strategies to manage
- Infrastructure complexity (for SSR parts)
- Developer learning curve

**Verdict:** Accepted. This provides the right balance of performance, flexibility, and simplicity.

## Tradeoffs

### Performance vs. Flexibility

| Strategy | Performance | Flexibility |
|----------|-------------|--------------|
| SSG | Best | Low |
| Islands | Good | Medium |
| SSR | Good | Best |

**Our choice:** Optimize for performance first, add flexibility only where needed.

### Complexity vs. Capability

| Approach | Complexity | Capability |
|----------|------------|------------|
| Single strategy | Low | Limited |
| Multi-strategy | Medium | Full |
| Over-engineered | High | Overkill |

**Our choice:** Multi-strategy but with clear guidelines for when to use each.

## Consequences

### Positive

1. **Maximum performance** for static content
2. **Optimal user experience** through appropriate rendering
3. **Cost optimization** - only pay for server rendering when needed
4. **Scalability** - CDN handles static, server handles dynamic
5. **Developer clarity** - clear decision criteria

### Negative

1. **Multiple rendering paths** to understand and maintain
2. **Infrastructure variation** - static CDN vs. server deployment
3. **Caching complexity** - different strategies have different cache behaviors
4. **Migration complexity** - switching strategies may require code changes

### Neutral

1. **Learning curve** for team members new to Islands architecture
2. **Monitoring requirements** - different metrics for different strategies
3. **Documentation needs** - each strategy requires documentation

## Future Considerations

### Revisit Triggers

1. **New rendering strategy** in Astro (e.g., partial pre-rendering)
2. **Significant price changes** in hosting providers
3. **Performance benchmark changes** in Core Web Vitals

### Potential Extensions

1. **Automated strategy selection** based on content analysis
2. **Strategy migration tooling** for switching approaches
3. **Performance monitoring** per strategy with alerts

## Implementation Guidance

### Decision Tree

```
Is content user-specific?
├── Yes → Is real-time required?
│   ├── Yes → SSR with Server Islands
│   └── No → SSR or Hybrid
└── No → Is content static?
    ├── Yes → SSG with Islands as needed
    └── No → Hybrid (SSG + SSR for dynamic sections)
```

### Configuration Examples

```javascript
// Static blog (SSG + Islands)
export default defineConfig({
  output: 'static',
});

// SaaS dashboard (SSR)
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});

// Hybrid e-commerce
export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    staticRoutes: ['/products/*', '/blog/*'],
  }),
});
```

## Related ADRs

- [ADR-005: Caching Strategy](./ADR-005-caching.md) - Related to rendering performance
- [ADR-006: Deployment](./ADR-006-deployment.md) - Related to infrastructure