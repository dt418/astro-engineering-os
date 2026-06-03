# SEO Reviewer

Automated SEO compliance checking for Astro projects.

## Review Objectives

### Primary Goals

1. **Indexability** - Ensure pages are crawlable
2. **Meta Tags** - Proper Open Graph and meta
3. **Structured Data** - Schema.org implementation
4. **Performance** - Core Web Vitals for SEO
5. **Content Quality** - Semantic HTML

### SEO Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Meta descriptions | Every page | Automated |
| Heading hierarchy | Logical order | Code review |
| Canonical URLs | Set correctly | Automated |
| Structured data | Valid schema | Automated |
| Image alt text | All images | Automated |

---

## Review Categories

### 1. Indexability (25%)

#### Crawlability

| Check | Criteria | Severity |
|-------|----------|----------|
| robots.txt | Proper configuration | Critical |
| No index meta | Proper noindex usage | High |
| Pagination | Link to next/prev | Medium |
| Sitemap | Generated sitemap | High |

#### URL Structure

```bash
# Good: Clean URLs
https://example.com/blog/my-post
https://example.com/docs/getting-started

# Bad: Complex URLs
https://example.com/blog?page=1&category=tech&id=123
```

### 2. Meta Tags (25%)

#### Required Meta

```html
<head>
  <!-- Title: 50-60 characters -->
  <title>Page Title | Brand Name</title>
  
  <!-- Description: 150-160 characters -->
  <meta name="description" content="Page description..." />
  
  <!-- Canonical -->
  <link rel="canonical" href="https://example.com/page" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="Page Title" />
  <meta property="og:description" content="Page description" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://example.com/page" />
  <meta property="og:image" content="https://example.com/image.jpg" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Page Title" />
  <meta name="twitter:description" content="Page description" />
  <meta name="twitter:image" content="https://example.com/image.jpg" />
</head>
```

#### Dynamic Meta Pattern

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string;
  description: string;
  image?: string;
  canonicalUrl?: string;
  type?: 'website' | 'article';
}

const { 
  title, 
  description, 
  image = '/default-og.png',
  canonicalUrl = Astro.url,
  type = 'website'
} = Astro.props;

const fullTitle = `${title} | Brand Name`;
---

<head>
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonicalUrl} />
  
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content={type} />
  <meta property="og:image" content={new URL(image, Astro.site)} />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={new URL(image, Astro.site)} />
</head>
```

### 3. Structured Data (20%)

#### Schema Types

| Content | Schema Type |
|---------|-------------|
| Blog posts | BlogPosting |
| Products | Product |
| Articles | Article |
| Breadcrumbs | BreadcrumbList |
| FAQ | FAQPage |
| Local business | LocalBusiness |
| Organization | Organization |

#### Example: Article Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "description": "Article description",
  "image": "https://example.com/image.jpg",
  "datePublished": "2024-01-01",
  "dateModified": "2024-01-15",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Brand Name",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  }
}
</script>
```

#### Example: Breadcrumbs

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Blog",
      "item": "https://example.com/blog"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Article Title"
    }
  ]
}
</script>
```

### 4. Content Structure (15%)

#### Heading Hierarchy

```html
<!-- Good: Logical hierarchy -->
<h1>Main Topic</h1>
  <h2>Subtopic 1</h2>
    <h3>Detail 1.1</h3>
    <h3>Detail 1.2</h3>
  <h2>Subtopic 2</h2>

<!-- Bad: Skipped levels -->
<h1>Main</h1>
<h3>Detail</h3>
```

#### Semantic HTML

| Element | Use For |
|---------|---------|
| `<header>` | Page or section header |
| `<nav>` | Navigation |
| `<main>` | Main content |
| `<article>` | Self-contained content |
| `<aside>` | Related content |
| `<footer>` | Page or section footer |

### 5. Performance for SEO (15%)

#### Core Web Vitals

| Metric | Target | SEO Impact |
|--------|--------|------------|
| LCP | < 2.5s | High |
| FID | < 100ms | Medium |
| CLS | < 0.1 | High |

#### Image Optimization

```astro
<!-- Good: Optimized images -->
<Image 
  src={image}
  alt={description}
  width={1200}
  height={630}
  format="webp"
/>
```

---

## Review Process

### 1. Meta Tag Check

```bash
# Extract meta tags
curl -s https://example.com | grep -E '<meta|og:|twitter:'
```

### 2. Structured Data Validation

```bash
# Validate JSON-LD
npx jsonlint-cli https://example.com/script.json

# Check with Google
curl -s -X POST 'https://search.google.com/test/rich-results' \
  -H 'Content-Type: application/json' \
  -d @test.json
```

### 3. Sitemap Check

```bash
# Verify sitemap exists and valid
curl -s https://example.com/sitemap.xml | head -100
```

---

## Findings Format

```markdown
## SEO Finding: [Title]

**Category:** [Meta | Structure | Schema | Performance]
**Severity:** [Critical | High | Medium | Low]

### Issue

[What SEO issue exists]

### Location

[URL or file]

### Impact

[SEO impact if not fixed]

### Recommendation

[How to fix]

### Example

[Before/after code]
```

---

## Rejection Criteria

### Critical Issues

- Missing meta description
- Missing canonical URL
- Noindex on important pages
- Broken internal links

### High Priority

- Invalid structured data
- Missing alt on images
- Poor heading hierarchy
- Slow page load

---

## SEO Checklist

### Meta Tags

- [ ] Unique, descriptive title (< 60 chars)
- [ ] Meta description (< 160 chars)
- [ ] Canonical URL on every page
- [ ] Open Graph tags
- [ ] Twitter Card tags

### Structure

- [ ] Single H1 per page
- [ ] Logical heading hierarchy
- [ ] Semantic HTML elements
- [ ] Descriptive link text

### Images

- [ ] Alt text on all images
- [ ] Optimized image formats
- [ ] Appropriate sizing
- [ ] Lazy loading below fold

### Technical

- [ ] Generated sitemap.xml
- [ ] robots.txt configured
- [ ] SSL/HTTPS
- [ ] Fast page load

### Structured Data

- [ ] Valid JSON-LD
- [ ] Appropriate schema types
- [ ] Complete required fields

---

## Common SEO Issues

### Meta Issues

```html
<!-- Bad: Missing description -->
<meta name="description" content="" />

<!-- Bad: Duplicate title -->
<title>Home | Brand</title>
<title>Home | Brand</title>

<!-- Bad: Generic description -->
<meta name="description" content="Welcome to our website" />
```

### Structure Issues

```html
<!-- Bad: Multiple H1 -->
<h1>Title 1</h1>
<h1>Title 2</h1>

<!-- Bad: Hidden content for SEO -->
<div style="display:none">Keyword spam</div>
```

### Schema Issues

```json
// Bad: Invalid type
{
  "@type": "Articlee"  // Wrong
}

// Good: Valid type
{
  "@type": "Article"
}
```

---

## CI Integration

```yaml
# .github/workflows/seo.yml
- name: SEO Check
  run: |
    npm run build
    npx astro check
    
- name: Meta Validation
  run: |
    node scripts/validate-meta.js
```

---

## Usage by AI Agents

### Architect Agent

Request SEO review for:
- Page structure
- Content hierarchy
- Schema requirements

### Implementer Agent

Request SEO review after:
- Creating new pages
- Adding media content
- Implementing features

---

## Tools

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)
- [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/)
- [Ahrefs Webmaster Tools](https://ahrefs.com/webmaster-tools)