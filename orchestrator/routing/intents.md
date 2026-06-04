## intent: blog

version: 1.0.0
status: active
purpose: Build content-first blogs with RSS, MDX, and content collections.
tags: blog, content, rss
skills: astro-blog, astro-core
agents: implementer, documentation
workflows: feature-development
reviewers: blog-reviewer

## intent: docs

version: 1.0.0
status: active
purpose: Build documentation sites with sidebar navigation and search.
tags: docs, documentation, search
skills: astro-docs, astro-core
agents: documentation, implementer
workflows: feature-development
reviewers: docs-reviewer

## intent: saas

version: 1.0.0
status: active
purpose: Build SaaS landing pages with pricing, auth, and dashboard.
tags: saas, landing, pricing
skills: astro-saas, astro-core
agents: implementer, architecture-reviewer
workflows: feature-development
reviewers: code-reviewer

## intent: ecommerce

version: 1.0.0
status: active
purpose: Build ecommerce stores with cart, checkout, and product pages.
tags: ecommerce, shop, cart
skills: astro-ecommerce, astro-core
agents: implementer
workflows: feature-development
reviewers: ecommerce-reviewer

## intent: architecture

version: 1.0.0
status: active
purpose: Design system architecture, make trade-off decisions, write ADRs.
tags: architecture, design, adr
skills: astro-core
agents: architect
workflows: architecture-review
reviewers: architecture-reviewer

## intent: refactor

version: 1.0.0
status: active
purpose: Restructure code without changing external behavior, with regression tests.
tags: refactor, cleanup, restructure
skills: astro-core
agents: implementer, code-reviewer
workflows: refactoring
reviewers: code-reviewer

## intent: migration

version: 1.0.0
status: active
purpose: Move code, data, or dependencies from one version or platform to another.
tags: migration, upgrade, move
skills: astro-core
agents: implementer
workflows: migration
reviewers: code-reviewer

## intent: unknown

version: 1.0.0
status: active
purpose: Fallback intent for unclassifiable inputs.
tags: fallback
skills: astro-core
agents: implementer
workflows: feature-development
reviewers: code-reviewer
