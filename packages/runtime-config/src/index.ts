import { optionalLogLevel, optionalPort } from '@business-os/shared-validation';

export interface RuntimeConfig {
  readonly serviceName: string;
  readonly version: string;
  readonly port: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export function loadRuntimeConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): RuntimeConfig {
  return {
    serviceName: env['SERVICE_NAME']?.trim() || 'business-os',
    version: env['APP_VERSION']?.trim() || '0.1.0',
    port: optionalPort('PORT', env['PORT'], 3000),
    logLevel: optionalLogLevel(env['LOG_LEVEL']),
  };
}
