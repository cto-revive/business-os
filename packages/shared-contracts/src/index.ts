export type HealthStatus = 'ok';

export interface HealthSnapshot {
  readonly status: HealthStatus;
  readonly service: string;
  readonly version: string;
  readonly checkedAt: string;
}

export interface Logger {
  info(message: string, fields?: Readonly<Record<string, string | number | boolean>>): void;
  error(message: string, fields?: Readonly<Record<string, string | number | boolean>>): void;
}
