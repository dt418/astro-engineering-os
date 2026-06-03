# Accessibility Reviewer

Automated accessibility compliance checking for Astro projects.

## Review Objectives

### Primary Goals

1. **WCAG 2.1 AA Compliance** - Meet accessibility standards
2. **Keyboard Navigation** - Full keyboard support
3. **Screen Reader Support** - Proper ARIA usage
4. **Color Contrast** - Visible contrast ratios
5. **Focus Management** - Clear focus indicators

### Accessibility Targets

| Requirement | Standard | Measurement |
|-------------|----------|-------------|
| Color Contrast | 4.5:1 (text), 3:1 (UI) | WCAG AA |
| Keyboard Navigation | 100% functional | Manual testing |
| Focus Indicators | Visible | Visual inspection |
| ARIA Labels | Required on interactive | Code review |
| Page Titles | Unique, descriptive | Automated |

---

## WCAG 2.1 Requirements

### Perceivable (Principle 1)

#### 1.1 Text Alternatives

| Check | Criteria | Severity |
|-------|----------|----------|
| Images | alt text or aria-label | Critical |
| Icons | Text alternative | High |
| Decorative | Empty alt or role="presentation" | Medium |

#### 1.3 Adaptable

| Check | Criteria | Severity |
|-------|----------|----------|
| Structure | Proper heading hierarchy | Critical |
| Lists | Use semantic lists | High |
| Tables | Proper headers | High |

#### 1.4 Distinguishable

| Check | Criteria | Severity |
|-------|----------|----------|
| Contrast | 4.5:1 for text | Critical |
| Large text | 3:1 for 18pt+ | High |
| Resize | No horizontal scroll at 200% | Medium |

### Operable (Principle 2)

#### 2.1 Keyboard Accessible

| Check | Criteria | Severity |
|-------|----------|----------|
| All functionality | Keyboard accessible | Critical |
| Focus order | Logical sequence | High |
| Focus visible | Clear indicator | Critical |
| No keyboard trap | Can exit all interactions | Critical |

#### 2.4 Navigable

| Check | Criteria | Severity |
|-------|----------|----------|
| Page titles | Unique, descriptive | High |
| Headings | Proper hierarchy | High |
| Skip links | Link to main content | Medium |
| Focus order | Logical progression | Medium |

#### 2.5 Input Modalities

| Check | Criteria | Severity |
|-------|----------|----------|
| Touch targets | 44x44px minimum | High |
| Pointer gestures | Alternatives for gestures | Medium |

### Understandable (Principle 3)

#### 3.1 Readable

| Check | Criteria | Severity |
|-------|----------|----------|
| Language | html lang attribute | High |
| Abbreviations | Expanded on first use | Medium |

#### 3.2 Predictable

| Check | Criteria | Severity |
|-------|----------|----------|
| Focus | No unexpected focus change | High |
| Input | Clear labels and instructions | High |

#### 3.3 Input Assistance

| Check | Criteria | Severity |
|-------|----------|----------|
| Errors | Identify and describe | High |
| Labels | Visible and associated | Critical |
| Suggestions | Error correction help | Medium |

### Robust (Principle 4)

#### 4.1 Compatible

| Check | Criteria | Severity |
|-------|----------|----------|
| Valid HTML | Proper nesting, closing | High |
| ARIA | Valid usage | High |
| Status messages | aria-live regions | High |

---

## Review Categories

### 1. Structure & Semantics (25%)

#### Headings

```html
<!-- Good: Proper hierarchy -->
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>

<!-- Bad: Skipped levels -->
<h1>Page Title</h1>
<h3>Subsection</h3>
```

#### Landmarks

```html
<!-- Good: Proper landmarks -->
<header role="banner">
<nav role="navigation">
<main role="main">
<aside role="complementary">
<footer role="contentinfo">
```

### 2. Images & Media (15%)

#### Alt Text

```astro
<!-- Good: Descriptive alt -->
<img src="cat.jpg" alt="Orange tabby cat sitting on a windowsill" />

<!-- Bad: No alt or unhelpful -->
<img src="cat.jpg" alt="cat" />
<img src="cat.jpg" alt="" /> <!-- Only if decorative -->
```

#### Images of Text

```html
<!-- Bad: Text in images -->
<img src="button.png" alt="Submit" />

<!-- Good: Use CSS/HTML -->
<button type="submit">Submit</button>
```

### 3. Forms & Inputs (25%)

#### Labels

```astro
<!-- Good: Associated label -->
<label for="email">Email</label>
<input id="email" type="email" />

<!-- Bad: No label -->
<input type="email" placeholder="Email" />

<!-- Acceptable: aria-label -->
<input type="email" aria-label="Email address" />
```

#### Error Handling

```astro
<!-- Good: Descriptive errors -->
<input 
  id="email"
  type="email"
  aria-describedby="email-error"
  aria-invalid="true"
/>
<span id="email-error" role="alert">
  Please enter a valid email address
</span>
```

### 4. Navigation (20%)

#### Focus Management

```typescript
// Good: Focus management
function openModal() {
  modal.removeAttribute('hidden');
  modal.querySelector('button')?.focus();
}

function closeModal() {
  trigger.focus(); // Return focus
  modal.setAttribute('hidden', '');
}
```

#### Skip Links

```html
<!-- Good: Skip link -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<main id="main-content" tabindex="-1">
  <!-- content -->
</main>
```

### 5. Interactive Elements (15%)

#### Buttons & Links

```html
<!-- Good: Descriptive text -->
<button type="button">Submit application</button>

<!-- Bad: Vague -->
<button type="button">Click here</button>
<button type="button">...</button>
```

#### Interactive States

```css
/* Good: Visible focus */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Bad: No visible focus */
:focus { outline: none; }
```

---

## Testing Approach

### Automated Testing

```bash
# Install and run
npm install -D @axe-core/cli
npx axe http://localhost:4321

# In Playwright
await page.addAccessibilityChecks();
```

### Manual Testing

| Test | Method | Frequency |
|------|--------|-----------|
| Keyboard navigation | Tab through page | Every PR |
| Screen reader | VoiceOver/NVDA | Major changes |
| Color contrast | Contrast checker | Every PR |
| Focus visibility | Visual inspection | Every PR |

---

## Findings Format

```markdown
## Accessibility Finding: [Title]

**WCAG Criterion:** [Number and description]
**Severity:** [Critical | High | Medium | Low]
**Element:** [Selector or location]

### Description

[What accessibility issue exists]

### Current Code

```html
[current code]
```

### Issue

[Why this fails accessibility]

### Recommended Fix

```html
[fixed code]
```

### Impact

[Who is affected and how]

### Testing Instructions

1. [Steps to verify]
```

---

## Rejection Criteria

### Critical (Must Fix)

- Missing alt on informational images
- No keyboard access to interactive elements
- Color contrast below 3:1
- Missing form labels
- Focus traps

### High (Should Fix)

- Heading hierarchy violations
- Missing skip links
- Non-descriptive link text
- Missing ARIA where needed

### Medium (Should Fix)

- Touch targets < 44px
- Missing language attribute
- Decorative images without empty alt

---

## Checklist

### Images

- [ ] All images have alt text
- [ ] Decorative images have empty alt
- [ ] Complex images have long descriptions
- [ ] Icons have text alternatives

### Forms

- [ ] All inputs have visible labels
- [ ] Labels are associated with inputs
- [ ] Errors are announced
- [ ] Required fields are marked

### Navigation

- [ ] Page has unique title
- [ ] Headings in logical order
- [ ] Skip link provided
- [ ] Focus visible on all elements

### Interactive

- [ ] All functions keyboard accessible
- [ ] Focus managed in modals
- [ ] Buttons have descriptive text
- [ ] Links make sense out of context

### Color

- [ ] Text contrast ≥ 4.5:1
- [ ] Large text contrast ≥ 3:1
- [ ] UI components contrast ≥ 3:1
- [ ] Color not sole indicator

---

## ARIA Patterns

### Common Patterns

| Pattern | ARIA | Notes |
|---------|------|-------|
| Button | role="button" | Or use <button> |
| Modal | role="dialog", aria-modal | Focus trap, escape |
| Menu | role="menu", role="menuitem" | Arrow navigation |
| Tabs | role="tablist", role="tab" | Arrow + Enter |
| Accordion | role="region", aria-expanded | Content visibility |

### Live Regions

```html
<!-- Polite: Announced when idle -->
<div aria-live="polite">
  Your changes have been saved
</div>

<!-- Assertive: Announced immediately -->
<div aria-live="assertive" role="alert">
  Error: Invalid email address
</div>
```

---

## Screen Reader Testing

### Testing Checklist

1. Navigate with Tab key
2. Check reading order
3. Verify images announced
4. Check form error announcements
5. Verify modal focus management

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Missing labels | No for/id | Add labels |
| Wrong order | DOM order | Fix DOM |
| Announced twice | Duplicate IDs | Fix IDs |
| Not announced | aria-hidden | Remove |

---

## CI Integration

```yaml
# .github/workflows/a11y.yml
- name: Accessibility Check
  run: |
    npm run build
    npx axe http://localhost:4321 --exit

- name: Lighthouse Accessibility
  run: |
    npx lighthouse http://localhost:4321 \
      --only-categories=accessibility \
      --preset=desktop
```

---

## Usage by AI Agents

### Architect Agent

Request accessibility review for:
- Form architecture
- Navigation structure
- Component patterns

### Implementer Agent

Request accessibility review after:
- Creating form components
- Adding interactive elements
- Building modals/dialogs

---

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Axe DevTools](https://www.deque.com/axe/)