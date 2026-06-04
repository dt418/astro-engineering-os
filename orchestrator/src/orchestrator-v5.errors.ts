export class UnknownIntentError extends Error {
  constructor(public readonly input: string) {
    super(`No intent mapping for input: "${input}"`);
  }
}

export class UnresolvedCapabilityError extends Error {
  constructor(
    public readonly kind: 'skill' | 'agent' | 'workflow' | 'reviewer',
    public readonly id: string,
    public readonly referencedBy: string,
  ) {
    super(`Intent "${referencedBy}" references unknown ${kind} "${id}"`);
  }
}
