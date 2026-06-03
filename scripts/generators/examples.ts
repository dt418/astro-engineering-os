/**
 * Generator for the `examples/` directory. Produces minimal,
 * runnable examples that demonstrate the patterns from the skills.
 */
import type { WriteFileOptions } from '../shared/write-file';
import { writeFiles } from '../shared/write-file';

const README = `# Examples

Runnable examples that demonstrate the patterns from the skills.

## Index

| Example | Skill | Description |
| --- | --- | --- |
| \`astro-core-hello/\` | astro-core | A minimal Astro site with SSG, content collections, and an `.astro` page |
| \`astro-blog-example/\` | astro-blog | A blog with RSS, sitemap, structured data |
| \`astro-cloudflare-binding/\` | astro-cloudflare | A site that reads from a Cloudflare KV binding |

## Running an Example

\`\`\`bash
cd examples/<example-name>
pnpm install
pnpm dev
\`\`\`

## Adding an Example

Create a new directory under \`examples/\` with a README, a minimal \`package.json\`, and the source files. The example should be minimal and runnable; it should not be a full application.
`;

const HELLO_README = `# astro-core-hello

A minimal Astro site demonstrating the patterns from \`skills/astro-core\`.

## What It Shows

- Static (SSG) rendering with \`output: "static"\`.
- An \`.astro\` page that imports a content collection.
- A Zod-validated content collection schema.
- Strict TypeScript with path aliases.

## Run

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

Visit http://localhost:4321.

## Files

- \`astro.config.mjs\` — Astro configuration
- \`tsconfig.json\` — TypeScript configuration
- \`src/content/config.ts\` — Content collection schema
- \`src/content/greetings/hello.md\` — A sample content entry
- \`src/pages/index.astro\` — A page that reads the content collection
- \`src/layouts/Base.astro\` — A shared layout
`;

const HELLO_PACKAGE = `{
  "name": "astro-core-hello",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "typecheck": "astro check"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0"
  }
}
`;

const HELLO_CONFIG = `import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://example.com',
});
`;

const HELLO_TSCONFIG = `{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strict": true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
`;

const HELLO_CONTENT_CONFIG = `import { defineCollection, z } from 'astro:content';

const greetings = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    language: z.string(),
  }),
});

export const collections = { greetings };
`;

const HELLO_CONTENT_ENTRY = `---
title: Hello, world!
language: English
---

This is a sample entry in the greetings collection.

Edit this file to add your own greeting.
`;

const HELLO_LAYOUT = `---
interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <main>
      <slot />
    </main>
  </body>
</html>
`;

const HELLO_PAGE = `---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';

const greetings = await getCollection('greetings');
---
<Base title="Hello, world!">
  <h1>Greetings</h1>
  <ul>
    {greetings.map((greeting) => (
      <li>
        <h2>{greeting.data.title}</h2>
        <p>Language: {greeting.data.language}</p>
        <p>{greeting.body}</p>
      </li>
    ))}
  </ul>
</Base>
`;

const CLOUDFLARE_README = `# astro-cloudflare-binding

A minimal Astro site that reads from a Cloudflare KV binding.

## What It Shows

- \`@astrojs/cloudflare\` adapter with \`mode: "directory"\`.
- \`Astro.locals.runtime.env\` access to KV bindings.
- \`wrangler.jsonc\` for binding configuration.
- \`pnpm exec wrangler dev\` for local development with bindings.

## Run Locally

\`\`\`bash
pnpm install
pnpm wrangler kv:namespace create MY_KV
# Copy the id into wrangler.jsonc
pnpm dev
\`\`\`

Visit http://localhost:4321.

## Files

- \`astro.config.mjs\` — Astro configuration with Cloudflare adapter
- \`wrangler.jsonc\` — Cloudflare configuration with KV binding
- \`src/pages/index.astro\` — A page that reads from the KV binding
- \`src/env.d.ts\` — Type definitions for the binding
`;

const CLOUDFLARE_PACKAGE = `{
  "name": "astro-cloudflare-binding",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "wrangler dev ./dist",
    "deploy": "wrangler deploy",
    "typecheck": "astro check"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/cloudflare": "^11.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0",
    "wrangler": "^3.80.0"
  }
}
`;

const CLOUDFLARE_CONFIG = `import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static',
  adapter: cloudflare({ mode: 'directory' }),
});
`;

const CLOUDFLARE_WRANGLER = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "astro-cloudflare-binding",
  "compatibility_date": "2024-09-23",
  "main": "./dist/_worker.js/index.js",
  "assets": { "directory": "./dist", "binding": "ASSETS" },
  "kv_namespaces": [
    { "binding": "MY_KV", "id": "<your-kv-namespace-id>" }
  ]
}
`;

const CLOUDFLARE_ENV_TYPES = `interface Env {
  MY_KV: KVNamespace;
  ASSETS: Fetcher;
}
`;

const CLOUDFLARE_PAGE = `---
export const prerender = false;
const env = Astro.locals.runtime.env as Env;
const value = (await env.MY_KV.get('hello')) ?? 'world';
---
<!doctype html>
<html lang="en">
  <head><title>KV Demo</title></head>
  <body><h1>Hello, {value}!</h1></body>
</html>
`;

export function buildExampleFiles(): ReadonlyArray<WriteFileOptions> {
  return [
    { path: 'examples/README.md', content: README },
    { path: 'examples/astro-core-hello/README.md', content: HELLO_README },
    { path: 'examples/astro-core-hello/package.json', content: HELLO_PACKAGE },
    { path: 'examples/astro-core-hello/astro.config.mjs', content: HELLO_CONFIG },
    { path: 'examples/astro-core-hello/tsconfig.json', content: HELLO_TSCONFIG },
    { path: 'examples/astro-core-hello/src/content/config.ts', content: HELLO_CONTENT_CONFIG },
    { path: 'examples/astro-core-hello/src/content/greetings/hello.md', content: HELLO_CONTENT_ENTRY },
    { path: 'examples/astro-core-hello/src/layouts/Base.astro', content: HELLO_LAYOUT },
    { path: 'examples/astro-core-hello/src/pages/index.astro', content: HELLO_PAGE },
    { path: 'examples/astro-cloudflare-binding/README.md', content: CLOUDFLARE_README },
    { path: 'examples/astro-cloudflare-binding/package.json', content: CLOUDFLARE_PACKAGE },
    { path: 'examples/astro-cloudflare-binding/astro.config.mjs', content: CLOUDFLARE_CONFIG },
    { path: 'examples/astro-cloudflare-binding/wrangler.jsonc', content: CLOUDFLARE_WRANGLER },
    { path: 'examples/astro-cloudflare-binding/src/env.d.ts', content: CLOUDFLARE_ENV_TYPES },
    { path: 'examples/astro-cloudflare-binding/src/pages/index.astro', content: CLOUDFLARE_PAGE },
  ];
}

export async function generateExamples(): Promise<void> {
  const { summary } = await writeFiles(buildExampleFiles());
  console.log(
    `examples: ${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await generateExamples();
}
