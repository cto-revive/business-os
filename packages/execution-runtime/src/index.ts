import {
  type AuthorizationPort,
  type Clock,
  type EventPublisher,
  type ExecutionPersistencePort,
  type FailureClass,
  type JobRecord,
  type QueueMessage,
  type RetryPolicy,
  retryDelayMs,
} from '@business-os/execution-contracts';
import type { PersistenceScope } from '@business-os/persistence-contracts';

export interface ExecutionHandler {
  handle(message: QueueMessage): Promise<void>;
}

export interface ExecutionRuntimeDependencies {
  readonly clock: Clock;
  readonly queue: ExecutionPersistencePort;
  readonly publisher: EventPublisher;
  readonly authorization: AuthorizationPort;
  readonly handlers: ReadonlyMap<string, ExecutionHandler>;
}

export class DurableExecutionRuntime {
  public constructor(private readonly dependencies: ExecutionRuntimeDependencies) {}

  public async dispatchEvent(
    event: Parameters<EventPublisher['publish']>[0],
  ): Promise<'accepted' | 'ambiguous' | 'rejected'> {
    return this.dependencies.publisher.publish(event);
  }

  public async claimAndExecute(
    ownerId: string,
    leaseMs: number,
  ): Promise<'idle' | 'succeeded' | 'retryable_failure' | 'terminal_failure'> {
    const now = this.dependencies.clock.now();
    const claimed = await this.dependencies.queue.claim(ownerId, now, leaseMs);
    if (!claimed) return 'idle';
    const { message, lease } = claimed;
    const handler = this.dependencies.handlers.get(message.messageType);
    if (!handler) {
      await this.dependencies.queue.deadLetter(lease, `No handler for ${message.messageType}`);
      return 'terminal_failure';
    }
    try {
      if ('organizationId' in message.scope) {
        const decision = await this.dependencies.authorization.authorize({
          scope: message.scope,
          actionType: message.messageType,
          actionVersion: message.messageVersion,
          targetIds: [],
        });
        if (
          decision.outcome !== 'allow' ||
          decision.authorizationEpoch !== message.scope.authorizationEpoch
        ) {
          await this.dependencies.queue.deadLetter(
            lease,
            'Authorization epoch or policy is no longer valid',
          );
          return 'terminal_failure';
        }
      }
      await handler.handle(message);
      await this.dependencies.queue.acknowledge(lease, this.dependencies.clock.now());
      return 'succeeded';
    } catch (error) {
      const failure = classifyFailure(error);
      if (failure === 'terminal' || failure === 'operator_repair') {
        await this.dependencies.queue.deadLetter(
          lease,
          error instanceof Error ? error.message : String(error),
        );
        return 'terminal_failure';
      }
      const delay = retryDelayMs(defaultRetryPolicy, message.attempt, 0);
      await this.dependencies.queue.retry(
        lease,
        failure,
        new Date(this.dependencies.clock.now().getTime() + delay),
      );
      return 'retryable_failure';
    }
  }
}

export function classifyFailure(error: unknown): FailureClass {
  if (
    error instanceof Error &&
    /authorization|revoked|expired|invalid|unsupported|conflict/i.test(error.message)
  )
    return 'terminal';
  return 'retryable';
}

export const defaultRetryPolicy: RetryPolicy = Object.freeze({
  version: 1,
  maxAttempts: 8,
  maxDelayMs: 15 * 60 * 1000,
  baseDelayMs: 1000,
  jitterRatio: 0.2,
  maxElapsedMs: 24 * 60 * 60 * 1000,
});

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  monotonicMs(): number {
    return Number(process.hrtime.bigint() / 1_000_000n);
  }
}

export type {
  ExecutionPersistencePort,
  EventPublisher,
  AuthorizationPort,
  Clock,
  PersistenceScope,
  JobRecord,
};
