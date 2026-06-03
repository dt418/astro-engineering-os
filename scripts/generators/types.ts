/**
 * Shared Types for Generators
 * 
 * Type definitions used across generators.
 */

/**
 * Write result from file write operation
 */
export interface WriteResult {
  success: boolean;
  skipped: boolean;
  error?: string;
}

/**
 * Generator configuration
 */
export interface GeneratorConfig {
  skipExisting: boolean;
  verbose: boolean;
  dryRun: boolean;
}

/**
 * Generator context
 */
export interface GenerationContext {
  root: string;
  config: GeneratorConfig;
  writeFile: (path: string, content: string) => WriteResult;
}

/**
 * Generator output
 */
export interface GeneratorOutput {
  errors: string[];
  warnings?: string[];
  created?: string[];
  skipped?: string[];
}

/**
 * Manifest types
 */
export interface Manifest {
  name: string;
  version: string;
  layers: {
    layer1: { name: string; components: string[] };
    layer2: { name: string; components: string[] };
    layer3: { name: string; components: string[] };
  };
  skills: {
    core: {
      name: string;
      file: string;
      description: string;
      modules: string[];
    };
    packs: Array<{
      name: string;
      file: string;
      extends: string;
      domain: string;
    }>;
  };
  governance: Array<{ name: string; file: string }>;
  reviewers: Array<{ name: string; file: string }>;
  workflows: Array<{ name: string; file: string }>;
  adr: Array<{ id: string; name: string; file: string }>;
  github: {
    workflows: string[];
    templates: string[];
  };
}