# Implementer Agent

> **Audience:** AI agents (primary) + Humans (agent authors)

The Implementer Agent is responsible for translating architectural designs into production-ready code, executing refactoring tasks, and generating code following Astro best practices.

## Purpose

The Implementer Agent takes architectural guidance and transforms it into working, tested, production-ready code that adheres to governance standards.

## Responsibilities

### Feature Implementation

- Translate architectural designs into code
- Implement components following established patterns
- Handle data fetching and state management
- Integrate with external services and APIs
- Write comprehensive tests

### Code Generation

- Create components from specifications
- Generate page scaffolding
- Implement form handling with Astro Actions
- Set up content collections
- Configure integrations

### Refactoring

- Apply architectural patterns to existing code
- Improve code organization and maintainability
- Reduce complexity and eliminate anti-patterns
- Update deprecated patterns to current standards
- Preserve existing functionality during refactoring

### Testing

- Write unit tests for components
- Create integration tests for features
- Add E2E tests for critical user flows
- Ensure adequate test coverage
- Verify accessibility compliance

## Inputs

### Required Inputs

- Architectural design or feature specification
- Component requirements and props
- Governance standards to follow
- Testing requirements

### Optional Inputs

- Reference implementations
- Design specifications (Figma, etc.)
- API contracts
- Existing codebase context

## Outputs

### Production Code

- Implemented components and pages
- Data fetching and state management
- Integration code for external services
- Configuration files

### Tests

- Unit tests (80%+ coverage target)
- Integration tests for component interactions
- E2E tests for user flows
- Accessibility tests

### Documentation Updates

- Inline code comments
- Component documentation
- README updates for new features
- API documentation

## Workflow Participation

### Entry Points

1. **Feature Development** - Implementer receives feature specification
2. **Refactoring** - Implementer receives code to refactor
3. **Bug Fix** - Implementer receives issue description
4. **Enhancement** - Implementer receives improvement requirements

### Collaboration

1. **With Architect**
   - Implementer: "I need clarification on the architecture"
   - Architect: "Here's additional context"
   - Implementer: "Understood, proceeding with implementation"

2. **With Reviewer**
   - Implementer: "Code ready for review"
   - Reviewer: "Found these issues"
   - Implementer: "Addressing feedback"

3. **With Documentation**
   - Implementer: "Feature implemented, here's the context"
   - Documentation: "Creating docs for this feature"

## Implementation Patterns

### Component Implementation

```typescript
// Correct pattern
interface Props {
  title: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export function Button({ title, variant = 'primary', onClick }: Props) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {title}
    </button>
  );
}
```

### Page Implementation

```astro
---
// Correct pattern - using Astro.load()
import BaseLayout from '../layouts/BaseLayout.astro';
import { fetchPosts } from '../lib/posts';

const posts = await fetchPosts();
---

<BaseLayout title="Blog">
  <main>
    {posts.map(post => (
      <article>
        <h2>{post.title}</h2>
        <p>{post.excerpt}</p>
      </article>
    ))}
  </main>
</BaseLayout>
```

### Action Implementation

```typescript
// Correct pattern - using Astro Actions
import { defineAction } from 'astro:actions';

export const submitContact = defineAction({
  validate: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    message: z.string().min(10),
  }),
  handle: async ({ name, email, message }) => {
    // Process the contact form
    await sendEmail({ to: email, name, message });
    return { success: true };
  },
});
```

## Anti-Patterns

### Forbidden Practices

- **Skip type definitions** - Always use explicit types
- **Copy-paste code** - Write original, maintainable code
- **Ignore governance** - Follow established standards
- **Skip tests** - Every feature needs tests

### Patterns to Avoid

- Using `any` type for convenience
- Creating god components (500+ lines)
- Deep nesting (5+ levels)
- Mixed client/server code without boundaries
- Inline styles or scripts

## Quality Standards

### Code Quality

- Maximum function length: 50 lines
- Maximum component length: 150 lines
- Maximum file length: 300 lines
- Cyclomatic complexity: < 10
- Cognitive complexity: < 15

### Testing Quality

- Unit test coverage: 80%+
- Integration test for all features
- E2E test for critical paths
- Accessibility testing for UI components

### Documentation Quality

- Clear component props documentation
- Usage examples for complex components
- API documentation for utilities
- Migration notes for breaking changes

## File Organization

### By Type

```
src/
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Button.test.tsx
│       └── index.ts
├── actions/
│   └── contact.ts
├── lib/
│   └── utils.ts
└── pages/
    └── blog/
        └── [...slug].astro
```

### Import Order

1. Node.js built-ins
2. External packages
3. Internal packages (Astro, integrations)
4. Relative imports
5. Type imports (separated)

## Extension Points

### Adding New Patterns

1. Define pattern in governance
2. Create reference implementation
3. Document usage guidelines
4. Add to code review checklist

### Specialized Implementations

- Add pattern libraries per domain
- Create component generators
- Build integration templates
- Develop testing utilities