export type PersistenceId = string;

export type PrincipalKind = 'human' | 'service' | 'integration' | 'automation' | 'ai-agent';

export interface OrganizationContext {
  readonly organizationId: PersistenceId;
  readonly principalId: PersistenceId;
  readonly principalKind: PrincipalKind;
  readonly membershipOrCredentialId: PersistenceId;
  readonly authorizationEpoch: number;
  readonly correlationId: string;
  readonly scope: readonly string[];
}

export interface PlatformContext {
  readonly principalId: PersistenceId;
  readonly principalKind: PrincipalKind;
  readonly correlationId: string;
  readonly scope: readonly string[];
}

export type PersistenceContext = OrganizationContext | PlatformContext;

export interface PersistenceScope<TContext extends PersistenceContext = PersistenceContext> {
  readonly context: TContext;
  readonly transactionId: PersistenceId;
}

export interface PersistenceUnitOfWork<TContext extends PersistenceContext = PersistenceContext> {
  run<T>(
    context: TContext,
    operation: (scope: PersistenceScope<TContext>) => Promise<T>,
  ): Promise<T>;
}

export interface AuditEvent {
  readonly eventId: PersistenceId;
  readonly occurredAt: Date;
  readonly organizationId: PersistenceId | null;
  readonly actorId: PersistenceId;
  readonly actorKind: PrincipalKind;
  readonly action: string;
  readonly resourceType: string;
  readonly targetId: PersistenceId | null;
  readonly authorizationOutcome: 'allow' | 'deny' | 'requires_approval';
  readonly policyBasis: string;
  readonly outcome: string;
  readonly errorCategory?: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface TransactionHandle {
  readonly organizationContext: OrganizationContext | null;
  readonly platformContext: PlatformContext | null;
  readonly scope?: PersistenceScope;
}

export interface PersistenceTransaction {
  readonly handle: TransactionHandle;
  run<T>(operation: (transaction: TransactionHandle) => Promise<T>): Promise<T>;
}

export interface OrganizationScopedRepository<TRecord> {
  findById(context: OrganizationContext, id: PersistenceId): Promise<TRecord | null>;
}

export interface AuditRepository {
  append(context: PersistenceContext, event: AuditEvent): Promise<void>;
  appendInScope?(scope: PersistenceScope, event: AuditEvent): Promise<void>;
}

export function assertOrganizationContext(context: OrganizationContext): OrganizationContext {
  if (
    !context.organizationId ||
    !context.principalId ||
    !context.membershipOrCredentialId ||
    !context.correlationId
  ) {
    throw new Error('A complete organization context is required for tenant persistence');
  }
  if (!Number.isInteger(context.authorizationEpoch) || context.authorizationEpoch < 0) {
    throw new Error('Authorization epoch must be a non-negative integer');
  }
  if (context.scope.length === 0) {
    throw new Error('Organization context requires at least one scope');
  }
  return Object.freeze({ ...context, scope: Object.freeze([...context.scope]) });
}

export function assertPlatformContext(context: PlatformContext): PlatformContext {
  if (!context.principalId || !context.correlationId || context.scope.length === 0) {
    throw new Error('A complete platform context is required for global persistence');
  }
  return Object.freeze({ ...context, scope: Object.freeze([...context.scope]) });
}

export function assertPersistenceContext(context: PersistenceContext): PersistenceContext {
  return 'organizationId' in context
    ? assertOrganizationContext(context)
    : assertPlatformContext(context);
}
