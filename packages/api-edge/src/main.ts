import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { HealthSnapshot } from '@business-os/shared-contracts';
import { loadRuntimeConfig } from '@business-os/runtime-config';

@Controller()
class RuntimeController {
  @Get('/health')
  health(): HealthSnapshot {
    return {
      status: 'ok',
      service: loadRuntimeConfig().serviceName,
      version: loadRuntimeConfig().version,
      checkedAt: new Date().toISOString(),
    };
  }
}

@Module({ controllers: [RuntimeController] })
class RuntimeModule {}

export async function createApiApplication() {
  const app = await NestFactory.create(RuntimeModule, { bufferLogs: true });
  const config = loadRuntimeConfig();
  await app.listen(config.port);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void createApiApplication().catch((error: unknown) => {
    console.error('API process failed to start', error);
    process.exitCode = 1;
  });
}
