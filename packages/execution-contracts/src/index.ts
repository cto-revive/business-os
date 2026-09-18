import { createHash } from 'node:crypto';
import { TextEncoder } from 'node:util';
import type {
  PersistenceContext,
  PersistenceId,
  PersistenceScope,
  PrincipalKind,
} from '@business-os/persistence-contracts';

export type ExecutionScope = PersistenceContext;
export type ExecutionState =
  | 'pending'
  | 'leased'
  | 'published'
  | 'retryable_failure'
  | 'dead_lettered'
  | 'acknowledged'
  | 'cancelled';
export type JobState =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'retryable_failure'
  | 'terminal_failure'
  | 'cancelled'
  | 'expired';
export type FailureClass = 'retryable' | 'terminal' | 'operator_repair';

export interface EventEnvelope {
  readonly eventId: PersistenceId;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly occurredAt: Date;
  readonly organizationId: PersistenceId | null;
  readonly actorId: PersistenceId;
  readonly actorKind: PrincipalKind;
  readonly authorizationEpoch?: number;
  readonly aggregateType: string;
  readonly aggregateId: PersistenceId;
  readonly aggregateSequence?: number;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface OutboxRecord {
  readonly event: EventEnvelope;
  readonly state: ExecutionState;
  readonly availableAt: Date;
  readonly attempt: number;
  readonly fencingToken?: number;
}

export interface QueueMessage {
  readonly messageId: PersistenceId;
  readonly jobId: PersistenceId;
  readonly messageType: string;
  readonly messageVersion: number;
  readonly scope: ExecutionScope;
  readonly idempotencyKey: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly attempt: number;
  readonly availableAt: Date;
}

export interface JobRecord {
  readonly jobId: PersistenceId;
  readonly jobType: string;
  readonly jobVersion: number;
  readonly scope: ExecutionScope;
  readonly principalId: PersistenceId;
  readonly principalKind: PrincipalKind;
  readonly authorizationEpoch?: number;
  readonly idempotencyKey: string;
  readonly state: JobState;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly retryPolicy: RetryPolicy;
  readonly correlationId: string;
  readonly causationId?: string;
}

export interface Lease {
  readonly messageId: PersistenceId;
  readonly ownerId: string;
  readonly fencingToken: number;
  readonly expiresAt: Date;
}

export interface RetryPolicy {
  readonly version: number;
  readonly maxAttempts: number;
  readonly maxDelayMs: number;
  readonly baseDelayMs: number;
  readonly jitterRatio: number;
  readonly maxElapsedMs: number;
}

export interface Clock {
  now(): Date;
  monotonicMs(): number;
}

export interface AuthorizationDecision {
  readonly outcome: 'allow' | 'deny' | 'requires_approval';
  readonly policyBasis: string;
  readonly authorizationEpoch: number;
}

export interface AuthorizationPort {
  authorize(input: {
    readonly scope: ExecutionScope;
    readonly actionType: string;
    readonly actionVersion: number;
    readonly targetIds: readonly PersistenceId[];
  }): Promise<AuthorizationDecision>;
}

export interface EventPublisher {
  publish(event: EventEnvelope): Promise<'accepted' | 'ambiguous' | 'rejected'>;
}

export interface OutboxRepository {
  append(scope: PersistenceScope, event: EventEnvelope): Promise<void>;
  claim(
    scope: PersistenceScope,
    ownerId: string,
    now: Date,
    leaseMs: number,
  ): Promise<OutboxRecord | null>;
  markPublished(
    scope: PersistenceScope,
    eventId: PersistenceId,
    ownerId: string,
    fencingToken: number,
  ): Promise<void>;
  markRetryable(
    scope: PersistenceScope,
    eventId: PersistenceId,
    ownerId: string,
    fencingToken: number,
    nextAttemptAt: Date,
    reason: string,
  ): Promise<void>;
}

export interface IdempotencyRepository {
  begin(
    scope: PersistenceScope,
    operationType: string,
    key: string,
    requestHash: string,
    expiresAt: Date,
  ): Promise<'created' | 'completed' | 'in_progress' | 'conflict'>;
  complete(
    scope: PersistenceScope,
    operationType: string,
    key: string,
    requestHash: string,
    result: Readonly<Record<string, unknown>>,
  ): Promise<void>;
}

export interface ApprovalRepository {
  create(
    scope: PersistenceScope,
    request: ApprovalBinding & {
      approvalRequestId: PersistenceId;
      requesterId: PersistenceId;
      expiresAt: Date;
    },
  ): Promise<void>;
  decide(
    scope: PersistenceScope,
    approvalRequestId: PersistenceId,
    approverId: PersistenceId,
    decision: 'approved' | 'rejected',
  ): Promise<void>;
  bindExecution(
    scope: PersistenceScope,
    approvalRequestId: PersistenceId,
    executionId: PersistenceId,
    bindingHash: string,
  ): Promise<void>;
}

export interface ExecutionPersistencePort {
  enqueue(scope: PersistenceScope, message: QueueMessage): Promise<void>;
  claim(
    ownerId: string,
    now: Date,
    leaseMs: number,
  ): Promise<{ message: QueueMessage; lease: Lease } | null>;
  heartbeat(lease: Lease, now: Date, leaseMs: number): Promise<Lease>;
  acknowledge(lease: Lease, now: Date): Promise<void>;
  retry(lease: Lease, failure: FailureClass, nextAttemptAt: Date): Promise<void>;
  deadLetter(lease: Lease, reason: string): Promise<void>;
  requeueExpired(now: Date): Promise<number>;
}

export interface ApprovalBinding {
  readonly actionType: string;
  readonly actionVersion: number;
  readonly organizationId: PersistenceId | null;
  readonly input: Readonly<Record<string, unknown>>;
  readonly targetIds: readonly PersistenceId[];
  readonly resourceVersions: Readonly<Record<string, string>>;
  readonly policyVersion: string;
  readonly authorizationEpoch: number;
}

export function canonicalize(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Canonical JSON rejects non-finite numbers');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(',')}}`;
  }
  throw new Error('Canonical JSON rejects unsupported values');
}

export function sha256Canonical(parts: readonly unknown[]): string {
  const hash = createHash('sha256');
  const encoder = new TextEncoder();
  hash.update('sha256-canonical-json-v1\0');
  for (const part of parts) {
    const encoded = encoder.encode(canonicalize(part));
    hash.update(String(encoded.byteLength));
    hash.update(':');
    hash.update(encoded);
  }
  return hash.digest('hex');
}

export function approvalBindingHash(binding: ApprovalBinding): string {
  return sha256Canonical([
    binding.actionType,
    binding.actionVersion,
    binding.organizationId,
    binding.input,
    binding.targetIds,
    binding.resourceVersions,
    binding.policyVersion,
    binding.authorizationEpoch,
  ]);
}

export function idempotencyRequestHash(input: {
  readonly operationType: string;
  readonly operationVersion: number;
  readonly organizationId: PersistenceId | null;
  readonly targetIds: readonly PersistenceId[];
  readonly request: unknown;
}): string {
  return sha256Canonical([
    input.operationType,
    input.operationVersion,
    input.organizationId,
    input.targetIds,
    input.request,
  ]);
}

export function retryDelayMs(policy: RetryPolicy, attempt: number, jitter: number): number {
  if (attempt < 1) throw new Error('Retry attempt must be positive');
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempt - 1));
  const boundedJitter = Math.max(-1, Math.min(1, jitter)) * policy.jitterRatio * exponential;
  return Math.min(policy.maxDelayMs, Math.max(0, Math.round(exponential + boundedJitter)));
}

export function assertFencingToken(expected: number, actual: number): void {
  if (expected !== actual) throw new Error('Stale or superseded lease fencing token');
}

export function assertApprovalBinding(expected: string, actual: string): void {
  if (expected !== actual)
    throw new Error('Approval binding has changed; a new approval is required');
}
