import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { createOrchestratorV5 } from '../../src/orchestrator-v5.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

const VALIDATION = resolve(__dirname, '../../fixtures/v5/validation');

describe('Cross-reference validation (Guardrail 2)', () => {
  it('rejects intent with missing skill reference', async () => {
    await expect(
      createOrchestratorV5({ basePath: `${VALIDATION}/missing-skill` }),
    ).rejects.toThrow(RegistryValidationError);
  });

  it('rejects intent with missing agent reference', async () => {
    await expect(
      createOrchestratorV5({ basePath: `${VALIDATION}/missing-agent` }),
    ).rejects.toThrow(RegistryValidationError);
  });

  it('rejects intent with missing workflow reference', async () => {
    await expect(
      createOrchestratorV5({ basePath: `${VALIDATION}/missing-workflow` }),
    ).rejects.toThrow(RegistryValidationError);
  });

  it('rejects intent with missing reviewer reference', async () => {
    await expect(
      createOrchestratorV5({ basePath: `${VALIDATION}/missing-reviewer` }),
    ).rejects.toThrow(RegistryValidationError);
  });

  it('lists ALL missing references in a single error (not just the first)', async () => {
    try {
      await createOrchestratorV5({ basePath: `${VALIDATION}/multi-issue` });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RegistryValidationError);
      const issues = (err as RegistryValidationError).issues;
      expect(issues.length).toBeGreaterThan(1);
    }
  });
});
