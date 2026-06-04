export class RegistryValidationError extends Error {
  constructor(
    public readonly registry: string,
    public readonly issues: readonly string[],
  ) {
    super(`[${registry}] ${issues.length} validation issue(s):\n  - ${issues.join('\n  - ')}`);
  }
}

export class RegistryLoadError extends Error {
  constructor(
    public readonly path: string,
    public override readonly cause: unknown,
  ) {
    super(`Failed to load registry from ${path}: ${(cause as Error)?.message ?? cause}`);
  }
}
