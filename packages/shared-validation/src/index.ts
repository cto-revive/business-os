export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export function requiredString(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new ConfigurationError(`${name} is required`);
  }
  return value.trim();
}

export function optionalPort(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigurationError(`${name} must be an integer between 1 and 65535`);
  }
  return port;
}

export function optionalLogLevel(value: string | undefined): 'debug' | 'info' | 'warn' | 'error' {
  const level = value?.trim() || 'info';
  if (!['debug', 'info', 'warn', 'error'].includes(level)) {
    throw new ConfigurationError('LOG_LEVEL must be one of debug, info, warn, or error');
  }
  return level as 'debug' | 'info' | 'warn' | 'error';
}
