# Naming Governance

## Purpose

This document defines consistent naming conventions across all code, files, and identifiers in Astro Engineering OS projects.

---

# General Principles

1. **Consistency** - Same patterns throughout
2. **Clarity** - Names convey purpose
3. **Brevity** - Short but meaningful
4. **Convention** - Follow language idioms

---

# File Naming

## File Name Conventions

| File Type | Convention | Example |
|-----------|------------|---------|
| Astro pages | kebab-case | `user-profile.astro` |
| Astro components | PascalCase | `UserCard.astro` |
| TypeScript files | kebab-case | `user-service.ts` |
| React/Preact components | PascalCase | `UserProfile.tsx` |
| CSS modules | kebab-case | `button-styles.module.css` |
| Test files | Same + `.test` | `button.test.ts` |
| Config files | kebab-case | `astro.config.mjs` |

## Special Files

| File | Name | Reason |
|------|------|--------|
| Entry point | `index.ts` | Convention |
| Types | `types.ts` or `*.types.ts` | Clarity |
| Constants | `constants.ts` | Convention |
| Utils | `utils.ts` or `*.util.ts` | Clarity |
| Config | `config.ts` or `*.config.ts` | Clarity |

---

# Component Naming

## Component File Names

```typescript
// Astro components
UserProfile.astro      // Component
ProductCard.astro     // Component
ActionButton.astro     // Component with action

// React/Preact components
UserProfile.tsx       // Component
ProductCard.tsx       // Component
ActionButton.tsx      // Component with action
```

## Component Function Names

```typescript
// Component names: PascalCase
export function UserProfile() { ... }
export function ProductCard() { ... }

// Hook names: camelCase with 'use' prefix
export function useUser() { ... }
export function useCart() { ... }

// Utility names: camelCase
export function formatDate() { ... }
export function validateEmail() { ... }

// Action names: camelCase
export const submitForm = defineAction({ ... });
export const deleteUser = defineAction({ ... });
```

---

# Type Naming

## Type Interfaces

```typescript
// Props: PascalCase + Props suffix
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
}

interface UserProfileProps {
  userId: string;
  showAvatar?: boolean;
}

// Type aliases: PascalCase
type UserId = string;
type ProductList = Product[];
type Status = 'pending' | 'active' | 'completed';

// Event types
type ButtonClickEvent = MouseEvent<HTMLButtonElement>;
type FormSubmitEvent = FormEvent<HTMLFormElement>;
```

## Enum and Union Types

```typescript
// Enums: PascalCase
enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}

// Union types for variants
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type CardSize = 'sm' | 'md' | 'lg' | 'xl';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
```

---

# Variable Naming

## Variable Names

```typescript
// Variables: camelCase
const userName = 'John';
const isActive = true;
const userList = [];
const userMap = new Map();

// Constants: UPPER_SNAKE for true constants
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// Boolean: is/has/can prefix
const isLoading = false;
const hasPermission = true;
const canEdit = false;

// Arrays: Plural nouns
const users = [];
const products = [];
const cartItems = [];

// Objects: Nouns or noun phrases
const userProfile = { ... };
const productDetails = { ... };
```

## Naming Patterns

| Pattern | Use | Example |
|---------|-----|---------|
| `is*` | Boolean state | `isLoading`, `isValid` |
| `has*` | Boolean possession | `hasPermission`, `hasAccess` |
| `can*` | Boolean ability | `canEdit`, `canDelete` |
| `should*` | Boolean recommendation | `shouldRedirect`, `shouldShow` |
| `handle*` | Event handlers | `handleClick`, `handleSubmit` |
| `on*` | Event listeners | `onClick`, `onChange` |
| `set*` | State setters | `setUser`, `setLoading` |
| `get*` | Getters | `getUser`, `getProducts` |
| `fetch*` | Async operations | `fetchUser`, `fetchProducts` |
| `format*` | Formatting | `formatDate`, `formatCurrency` |
| `validate*` | Validation | `validateEmail`, `validatePassword` |

---

# CSS Naming (BEM)

## BEM Convention

```
Block__Element--Modifier
```

## Examples

```css
/* Block */
.button { ... }

/* Element */
.button__icon { ... }
.button__text { ... }

/* Modifier */
.button--primary { ... }
.button--secondary { ... }

/* With size */
.button--lg { ... }
.button--sm { ... }
```

## Tailwind Classes

```html
<!-- Use semantic classes, not arbitrary -->
<div class="card card--elevated">
  <h2 class="card__title">Title</h2>
  <p class="card__body">Content</p>
</div>

<!-- Instead of -->
<div class="p-4 bg-white shadow-lg rounded-lg">
  <h2 class="text-xl font-bold">Title</h2>
  <p class="text-gray-700">Content</p>
</div>
```

---

# Import Naming

## Import Aliases

```typescript
// Named imports: Keep as-is
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/date';

// Renamed imports: Use clear names
import { Button as ButtonComponent } from '../components/ui/Button';
import { formatDate as formatUserDate } from '../lib/date';

// Type imports: Use 'type' prefix for clarity
import type { User } from '../types/user';
import type { Product } from '../types/product';
```

## Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@lib/*": ["./src/lib/*"],
      "@features/*": ["./src/features/*"],
      "@types/*": ["./src/types/*"]
    }
  }
}
```

---

# Directory Naming

## Directory Names

| Directory | Convention | Example |
|-----------|------------|---------|
| Pages | kebab-case | `user-profile/` |
| Components | PascalCase | `UserCard/` |
| Features | kebab-case | `user-auth/` |
| Lib/Utils | kebab-case | `date-utils/` |
| Hooks | camelCase | `useUser.ts` |

## Nested Structure

```
src/
├── components/
│   ├── ui/
│   │   └── Button/
│   │       ├── Button.astro
│   │       └── index.ts
│   └── layout/
└── features/
    └── auth/
        └── components/
            └── LoginForm.astro
```

---

# Route Naming

## Page Routes

```astro
// Static routes: kebab-case
about.astro           → /about
pricing.astro         → /pricing
contact-us.astro       → /contact-us

// Dynamic routes: kebab-case with brackets
[slug].astro           → /:slug
[category].astro      → /:category
user-[id].astro        → /user-:id

// Nested: kebab-case
blog/
├── index.astro       → /blog
├── [slug].astro       → /blog/:slug
└── [category]/
    └── index.astro    → /blog/:category

// Catch-all: brackets with dots
[...path].astro        → /*
[...slug].astro         → /:slug/*
```

## API Routes

```typescript
// RESTful naming
api/
├── users.ts           → GET/POST /api/users
├── users/
│   └── [id].ts        → GET/PUT/DELETE /api/users/:id
├── products.ts        → GET/POST /api/products
├── auth/
│   ├── login.ts       → POST /api/auth/login
│   └── logout.ts      → POST /api/auth/logout
└── webhooks/
    └── stripe.ts      → POST /api/webhooks/stripe
```

---

# Function Naming

## Function Names

```typescript
// Verbs for actions
async function fetchUser(id: string): Promise<User>
async function createUser(data: UserInput): Promise<User>
async function updateUser(id: string, data: UserInput): Promise<User>
async function deleteUser(id: string): Promise<void>

// Nouns for getters
function getUserById(id: string): User | undefined
function getActiveUsers(): User[]
function getUserPreferences(): Preferences

// Boolean functions
function isUserActive(user: User): boolean
function canAccessResource(user: User, resource: Resource): boolean
function hasPermission(permissions: string[], required: string): boolean
```

## Async Function Naming

```typescript
// Prefix with operation type
async function fetchUserData(id: string): Promise<User>
async function submitFormData(formData: FormData): Promise<Result>
async function loadProductImages(ids: string[]): Promise<string[]>

// Use 'load' for data fetching
async function loadUserProfile(id: string): Promise<Profile>
async function loadDashboardData(): Promise<DashboardData>

// Use 'save' for data persistence
async function saveUserPreferences(prefs: Preferences): Promise<void>
async function saveProductData(product: Product): Promise<void>
```

---

# Database Naming

## Schema Naming

```typescript
// Table names: plural, snake_case
const users = sqliteTable('users', { ... });
const products = sqliteTable('products', { ... });
const orderItems = sqliteTable('order_items', { ... });

// Column names: snake_case
columns: {
  userId: text('user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }),
}
```

---

# Event Naming

## Custom Events

```typescript
// Use kebab-case with namespace
const Events = {
  CART_UPDATED: 'cart:updated',
  USER_LOGGED_IN: 'user:logged-in',
  THEME_CHANGED: 'theme:changed',
  MODAL_OPENED: 'modal:opened',
  FORM_SUBMITTED: 'form:submitted',
} as const;
```

## Event Handlers

```typescript
// on* prefix for handlers
onClick: () => void
onSubmit: (data: FormData) => void
onChange: (value: string) => void
onFocus: () => void
onBlur: () => void

// handle* for actual handlers
function handleClick(event: MouseEvent) { ... }
function handleSubmit(event: FormEvent) { ... }
function handleChange(value: string) { ... }
```

---

# Anti-Patterns

## Bad Naming

```typescript
// Unclear names
const d = new Date();
const data = fetchData();
const temp = processSomething();

// Hungarian notation (avoid)
let strName = 'John';
let intCount = 5;
let boolIsActive = true;

// Overly verbose
const userObjectContainingAllUserData = getUser();
const listOfAllProductsFromDatabase = getAllProducts();

// Single letter (except counters)
for (let i = 0; i < 10; i++) { ... } // OK for counters
const x = getX(); // Bad

// Inconsistent casing
const userID = '123';       // Should be userId
const URL_STRING = '...';   // Should be urlString
```

## Good Naming

```typescript
// Clear and consistent
const currentDate = new Date();
const userData = await fetchUser();
const tempValue = calculateSomething();

// Consistent casing
const userId = '123';
const pageUrl = 'https://example.com';

// Descriptive
const usersWhoHaveNotLoggedIn = getInactiveUsers();
const productsOnSale = getSaleProducts();
const pendingOrders = getPendingOrders();
```

---

# Documentation Naming

## File Documentation

```markdown
<!-- At top of file -->
# UserProfile Component

Component for displaying user information.

## Props

| Prop | Type | Description |
|------|------|-------------|
| userId | string | User identifier |
| size | 'sm' | 'md' | 'lg' | Display size |

## Usage

```tsx
<UserProfile userId="123" size="md" />
```

## Example

See [docs/components.md](docs/components.md)
```

---

# Validation

## Linting Rules

```json
{
  "rules": {
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "variable",
        "format": ["camelCase", "UPPER_CASE"]
      },
      {
        "selector": "function",
        "format": ["camelCase", "PascalCase"]
      },
      {
        "selector": "type",
        "format": ["PascalCase"]
      },
      {
        "selector": "interface",
        "format": ["PascalCase"],
        "prefix": ["I"] // Optional, can be disabled
      }
    ]
  }
}
```

---

# Consistency Check

Use this checklist:

- [ ] All files follow naming conventions
- [ ] All components use PascalCase
- [ ] All variables use camelCase
- [ ] All constants use UPPER_SNAKE
- [ ] All types use PascalCase
- [ ] All events use kebab-case with colon
- [ ] CSS classes follow BEM
- [ ] Imports use path aliases
- [ ] Routes use kebab-case