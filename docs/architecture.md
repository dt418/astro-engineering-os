# Architecture Guide

Deep dive into Astro Engineering OS architecture.

## Three-Layer Architecture

### Layer 1: Engineering OS

The foundational layer providing governance and standards:

```
governance/
├── architecture.md    # Architectural rules
├── components.md      # Component standards
├── files.md          # File organization
├── dependencies.md    # Dependency management
├── design-system.md  # Design tokens
├── features.md        # Feature architecture
└── naming.md         # Naming conventions
```

### Layer 2: Agent Orchestration

AI agent coordination layer:

```
agents/
├── architect.md       # Architecture design
├── implementer.md    # Code implementation
├── reviewer.md        # Reviews
├── documentation.md  # Documentation
└── orchestrator/    # Coordination
```

### Layer 3: Engineering Harness

Future automation layer (reserved):

```
validators/   # Automated validation
auditors/     # Automated auditing
policies/     # Policy enforcement
```

## Design Principles

### 1. Feature-First Architecture

Organize code by feature, not by technical layer:

```
src/features/
├── auth/
│   ├── components/
│   ├── actions/
│   ├── lib/
│   └── types/
└── products/
    ├── components/
    ├── actions/
    └── lib/
```

### 2. Explicit Dependencies

All dependencies are declared and traceable:

- No circular dependencies
- Clear module boundaries
- Explicit imports
- No hidden coupling

### 3. Separation of Concerns

Each module has a single responsibility:

| Module | Responsibility |
|--------|---------------|
| pages/ | Route handling |
| components/ | UI rendering |
| actions/ | Business logic |
| lib/ | Utilities |
| layouts/ | Page structure |

## Rendering Architecture

### Strategy Selection

| Content Type | Strategy | Rationale |
|--------------|----------|-----------|
| Blog posts | SSG | Maximum performance |
| Dashboards | SSR | User-specific content |
| Product pages | Hybrid | Static + dynamic sections |
| Shopping cart | Islands | Interactive but isolated |

### Hydration Strategy

| Component | Directive | JavaScript |
|-----------|------------|------------|
| Header | client:load | Immediate |
| Search | client:visible | On scroll |
| Analytics | client:idle | When idle |

## Data Architecture

### Data Flow

```
Page → Loader → Data → Component
          ↓
      Action → Validation → Handler → Response
```

### State Management

| State Type | Storage | When to Use |
|-----------|---------|--------------|
| URL State | Astro.url | Shareable filters |
| Component State | useState | Local UI |
| Server State | Loaders | Data from server |
| Global State | Context | Cross-component |

## Component Architecture

### Hierarchy

```
layouts/           # Page wrappers
    ↓
feature-components/   # Feature-specific
    ↓
ui/                 # Reusable primitives
```

### Patterns

1. **Compound Components**
   ```astro
   <Card>
     <Card.Header />
     <Card.Body />
     <Card.Footer />
   </Card>
   ```

2. **Controlled Components**
   ```typescript
   interface InputProps {
     value: string;
     onChange: (value: string) => void;
   }
   ```

3. **Polymorphic Components**
   ```typescript
   interface LinkProps {
     as?: 'a' | 'button';
     href?: string;
   }
   ```

## Integration Patterns

### API Design

| Pattern | Use Case |
|---------|----------|
| REST | Standard CRUD |
| Actions | Form submission |
| Server Functions | Type-safe calls |

### External Services

```typescript
// External API wrapper
import { createApiClient } from '../lib/api';

export const api = createApiClient({
  baseUrl: import.meta.env.API_URL,
  headers: { Authorization: `Bearer ${token}` },
});
```

## Performance Architecture

### Bundle Strategy

1. **Code splitting** by route
2. **Lazy loading** for below-fold
3. **Tree shaking** for unused code
4. **Preloading** for critical paths

### Image Strategy

```astro
<Image
  src={image}
  width={800}
  height={600}
  format="webp"
  loading={isAboveFold ? 'eager' : 'lazy'}
/>
```

## Security Architecture

### Auth Flow

```
Request → Middleware → Session Check → Route Handler
                     ↓
              Unauthorized → Redirect
```

### Data Protection

1. **Input Validation** - Zod schemas
2. **Output Encoding** - Template escaping
3. **SQL Injection** - Parameterized queries
4. **XSS** - Content sanitization

## Scalability

### File Limits

| Type | Maximum Lines |
|------|---------------|
| Components | 150 |
| Pages | 200 |
| Actions | 100 |
| Utilities | 80 |

### Component Limits

| Metric | Maximum |
|--------|---------|
| Props | 10 |
| Nesting | 5 levels |
| Variants | 8 |

## Extension Points

### Adding Skills

1. Create skill in `skills/`
2. Define patterns and anti-patterns
3. Add to repository manifest
4. Update orchestrator routing

### Adding Reviewers

1. Create reviewer in `reviewers/`
2. Define scoring criteria
3. Add to review workflow
4. Configure thresholds

### Adding Workflows

1. Create workflow in `workflows/`
2. Define phases and steps
3. Add to orchestrator
4. Configure integration