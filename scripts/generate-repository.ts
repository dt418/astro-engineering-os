#!/usr/bin/env node
/**
 * Astro Engineering OS Bootstrap Generator
 * 
 * Generates a complete Astro Engineering OS repository from the manifest.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load manifest
const manifestPath = join(ROOT, 'repository.manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

// Generator modules
import * as skills from './generators/skills.ts';
import * as governance from './generators/governance.ts';
import * as reviewers from './generators/reviewers.ts';
import * as workflows from './generators/workflows.ts';
import * as adr from './generators/adr.ts';
import * as github from './generators/github.ts';
import * as docs from './generators/docs.ts';
import * as agents from './generators/agents.ts';
import * as orchestrator from './generators/orchestrator.ts';

const generators = {
  skills,
  governance,
  reviewers,
  workflows,
  adr,
  github,
  docs,
  agents,
  orchestrator,
};

/**
 * Configuration for generation
 */
interface GenerationConfig {
  skipExisting: boolean;
  verbose: boolean;
  dryRun: boolean;
}

/**
 * Generation result
 */
interface GenerationResult {
  created: string[];
  skipped: string[];
  errors: string[];
  totalFiles: number;
  success: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): { config: GenerationConfig; targets: string[] } {
  const args = process.argv.slice(2);
  const targets: string[] = [];
  const config: GenerationConfig = {
    skipExisting: true,
    verbose: false,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === '--force' || arg === '-f') {
      config.skipExisting = false;
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (arg === '--dry-run' || arg === '-n') {
      config.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith('--')) {
      console.warn(`Unknown option: ${arg}`);
    } else {
      targets.push(arg);
    }
  }

  return { config, targets };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Astro Engineering OS Bootstrap Generator

Usage: npx tsx scripts/generate-repository.ts [options] [targets...]

Targets:
  all           Generate everything (default)
  skills        Generate skills (astro-core + packs + specializations)
  governance    Generate governance documents
  reviewers     Generate reviewers
  workflows     Generate workflows
  adr           Generate ADRs
  github        Generate GitHub templates
  docs          Generate documentation
  agents        Generate agent specifications (architect, implementer, reviewer, documentation)
  orchestrator  Generate orchestrator specification
  templates     Generate ADR/RFC/spec/refactor templates
  examples      Generate example projects
  hooks         Generate git hooks and install script
  schemas       Generate Zod/JSON schema definitions

Options:
  --force, -f     Overwrite existing files
  --verbose, -v   Verbose output
  --dry-run, -n   Show what would be generated
  --help, -h      Show this help message
`);
}

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  const fullPath = join(ROOT, dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }
}

/**
 * Write file with optional skipping
 */
function writeFile(filePath: string, content: string, config: GenerationConfig): { success: boolean; skipped: boolean; error?: string } {
  const fullPath = join(ROOT, filePath);
  
  if (existsSync(fullPath) && config.skipExisting) {
    return { success: true, skipped: true };
  }
  
  if (config.dryRun) {
    return { success: true, skipped: false };
  }
  
  try {
    ensureDir(dirname(fullPath));
    writeFileSync(fullPath, content, 'utf-8');
    return { success: true, skipped: false };
  } catch (error) {
    return { success: false, skipped: false, error: String(error) };
  }
}

/**
 * Generate all components
 */
async function generate(targets: string[], config: GenerationConfig): Promise<GenerationResult> {
  const result: GenerationResult = {
    created: [],
    skipped: [],
    errors: [],
    totalFiles: 0,
    success: true,
  };

  const targetSet = new Set(targets.length > 0 ? targets : ['all']);
  const startTime = Date.now();

  // Load manifest
  const manifestData = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  for (const target of targetSet) {
    const generator = generators[target as keyof typeof generators];
    
    if (!generator && target !== 'all') {
      console.warn(`Unknown target: ${target}`);
      continue;
    }

    if (config.verbose) {
      console.log(`\nGenerating ${target}...`);
    }

    const output = generator.generate({
      root: ROOT,
      config,
      writeFile: (path, content) => {
        const res = writeFile(path, content, config);
        result.totalFiles++;
        if (res.success && !res.skipped) {
          result.created.push(path);
        } else if (res.skipped) {
          result.skipped.push(path);
        }
        if (res.error) {
          result.errors.push(`${path}: ${res.error}`);
        }
        return res;
      },
      manifest: manifestData,
    });

    if (output.errors.length > 0) {
      result.errors.push(...output.errors);
    }
  }

  result.success = result.errors.length === 0;

  return result;
}

/**
 * Print generation report
 */
function printReport(result: GenerationResult, duration: number): void {
  console.log('\n========================================');
  console.log('Generation Report');
  console.log('========================================');
  console.log(`Duration: ${duration}ms`);
  console.log(`Total files processed: ${result.totalFiles}`);
  console.log(`Created: ${result.created.length}`);
  console.log(`Skipped: ${result.skipped.length}`);
  console.log(`Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log('\n========================================');
  console.log(result.success ? '✓ Generation completed successfully' : '✗ Generation completed with errors');
  console.log('========================================');
}

// Main execution
const { config, targets } = parseArgs();
const startTime = Date.now();

generate(targets.length > 0 ? targets : ['all'], config)
  .then(result => {
    printReport(result, Date.now() - startTime);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Generation failed:', error);
    process.exit(1);
  });