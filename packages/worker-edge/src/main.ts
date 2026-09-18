import { loadRuntimeConfig } from '@business-os/runtime-config';
import {
  DurableExecutionRuntime,
  type ExecutionRuntimeDependencies,
} from '@business-os/execution-runtime';

export function createWorkerExecutionRuntime(
  dependencies: ExecutionRuntimeDependencies,
): DurableExecutionRuntime {
  return new DurableExecutionRuntime(dependencies);
}

export function startWorkerProcess(): void {
  const config = loadRuntimeConfig();
  console.info(
    JSON.stringify({
      event: 'worker_process_started',
      service: config.serviceName,
      version: config.version,
    }),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWorkerProcess();
}
