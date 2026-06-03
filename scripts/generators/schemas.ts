/**
 * Generator for the `schemas/` directory. Produces shared Zod and
 * JSON Schema definitions used across features.
 */
import type { WriteFileOptions } from '../shared/write-file';
import { writeFiles } from '../shared/write-file';

const README = `# Schemas

Shared schemas for cross-cutting use. These schemas are the source of truth for cross-feature data shapes.

## Index

| Schema | Type | Purpose |
| --- | --- | --- |
| \`user.ts\` | Zod | User, Account, Profile |
| \`billing.ts\` | Zod | Subscription, Plan, Invoice |
| \`pagination.ts\` | Zod | Paginated response shape |
| \`api-error.ts\` | Zod | Standard error response |
| \`content-frontmatter.json\` | JSON Schema | Common content collection frontmatter |

## When to Add a Schema

Add a schema to this directory when:

- The data shape is used across more than one feature.
- The data shape is part of the public API.
- The data shape is exchanged with a third party (webhooks, OAuth, etc.).

Do not add a schema that is used only within a single feature. Place that schema in the feature's \`schemas/\` directory.
`;

const USER_SCHEMA = `import { z } from 'zod';

export const userRole = z.enum(['owner', 'admin', 'member', 'guest']);
export type UserRole = z.infer<typeof userRole>;

export const user = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  avatarUrl: z.string().url().optional(),
  role: userRole,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof user>;

export const account = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  provider: z.enum(['email', 'google', 'github', 'microsoft']),
  providerAccountId: z.string(),
  createdAt: z.date(),
});
export type Account = z.infer<typeof account>;

export const profile = user.partial({
  avatarUrl: true,
}).extend({
  bio: z.string().max(500).optional(),
  locale: z.string().length(2).default('en'),
  timezone: z.string().default('UTC'),
});
export type Profile = z.infer<typeof profile>;
`;

const BILLING_SCHEMA = `import { z } from 'zod';

export const money = z.object({
  amount: z.number().int().nonnegative(),
  currency: z.string().length(3),
});
export type Money = z.infer<typeof money>;

export const plan = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  price: money,
  interval: z.enum(['month', 'year']),
  features: z.array(z.string()),
  limits: z.record(z.string(), z.number().int().nonnegative()).default({}),
});
export type Plan = z.infer<typeof plan>;

export const subscriptionStatus = z.enum([
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'trialing',
  'paused',
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatus>;

export const subscription = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  planId: z.string().min(1),
  status: subscriptionStatus,
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Subscription = z.infer<typeof subscription>;

export const invoice = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  subscriptionId: z.string().min(1).optional(),
  amount: money,
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']),
  issuedAt: z.date(),
  paidAt: z.date().optional(),
  hostedInvoiceUrl: z.string().url().optional(),
});
export type Invoice = z.infer<typeof invoice>;
`;

const PAGINATION_SCHEMA = `import { z } from 'zod';

export const pageInfo = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});
export type PageInfo = z.infer<typeof pageInfo>;

export function paginatedResponse<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    pageInfo,
  });
}

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;
`;

const API_ERROR_SCHEMA = `import { z } from 'zod';

export const apiErrorCode = z.enum([
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'validation_error',
  'rate_limited',
  'internal_error',
  'service_unavailable',
]);
export type ApiErrorCode = z.infer<typeof apiErrorCode>;

export const apiError = z.object({
  error: z.object({
    code: apiErrorCode,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
});
export type ApiError = z.infer<typeof apiError>;

export const apiSuccess = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ data });

export const httpStatusForError = (code: ApiErrorCode): number => {
  switch (code) {
    case 'bad_request': return 400;
    case 'unauthorized': return 401;
    case 'forbidden': return 403;
    case 'not_found': return 404;
    case 'conflict': return 409;
    case 'validation_error': return 422;
    case 'rate_limited': return 429;
    case 'internal_error': return 500;
    case 'service_unavailable': return 503;
  }
};
`;

const CONTENT_FRONTMATTER = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ContentFrontmatter",
  "description": "Common frontmatter fields for content collections",
  "type": "object",
  "required": ["title", "description", "pubDate"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "description": {
      "type": "string",
      "minLength": 1,
      "maxLength": 250
    },
    "pubDate": {
      "type": "string",
      "format": "date-time"
    },
    "updatedDate": {
      "type": "string",
      "format": "date-time"
    },
    "draft": {
      "type": "boolean",
      "default": false
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    },
    "author": {
      "type": "string"
    },
    "canonicalURL": {
      "type": "string",
      "format": "uri"
    }
  },
  "additionalProperties": true
}
`;

export function buildSchemaFiles(): ReadonlyArray<WriteFileOptions> {
  return [
    { path: 'schemas/README.md', content: README },
    { path: 'schemas/user.ts', content: USER_SCHEMA },
    { path: 'schemas/billing.ts', content: BILLING_SCHEMA },
    { path: 'schemas/pagination.ts', content: PAGINATION_SCHEMA },
    { path: 'schemas/api-error.ts', content: API_ERROR_SCHEMA },
    { path: 'schemas/content-frontmatter.json', content: CONTENT_FRONTMATTER },
  ];
}

export async function generateSchemas(): Promise<void> {
  const { summary } = await writeFiles(buildSchemaFiles());
  console.log(
    `schemas: ${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await generateSchemas();
}
