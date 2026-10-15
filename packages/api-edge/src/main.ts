import 'reflect-metadata';
import {
  Controller,
  Get,
  Module,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  Res,
  Query,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Response } from 'express';
import {
  createPostgresPersistence,
  PostgresPlatformRepository,
  PostgresAffiliateRepository,
} from '@business-os/persistence-postgres';
import { PlatformAccessError, PlatformRuntime } from '@business-os/platform-runtime';
import { AffiliateRuntime } from '@business-os/sales-crm-runtime';
import { AffiliateController } from './affiliate-controller.js';
import { loadRuntimeConfig } from '@business-os/runtime-config';
import type { ApiErrorBody, HomeResponse } from '@business-os/platform-contracts';

const SESSION_COOKIE = 'bos_session';
function cookieValue(header: string | undefined, name: string): string | undefined {
  return header
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
function setSessionCookie(response: Response, sessionId: string): void {
  const crossSite = process.env['COOKIE_CROSS_SITE'] === 'true';
  const secure = crossSite || process.env['NODE_ENV'] !== 'development' ? '; Secure' : '';
  const sameSite = crossSite ? 'None' : 'Lax';
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=${sameSite}${secure}`,
  );
}
function clearSessionCookie(response: Response): void {
  const crossSite = process.env['COOKIE_CROSS_SITE'] === 'true';
  const secure = crossSite || process.env['NODE_ENV'] !== 'development' ? '; Secure' : '';
  const sameSite = crossSite ? 'None' : 'Lax';
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=${sameSite}${secure}; Max-Age=0`,
  );
}
function errorResponse(error: unknown): HttpException {
  if (error instanceof PlatformAccessError) {
    const status =
      error.code === 'AUTHENTICATION_REQUIRED'
        ? HttpStatus.UNAUTHORIZED
        : error.code === 'CSRF_INVALID' ||
            error.code === 'PERMISSION_DENIED' ||
            error.code === 'ORGANIZATION_ACCESS_DENIED' ||
            error.code === 'AUTHORIZATION_STALE'
          ? HttpStatus.FORBIDDEN
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const body: ApiErrorBody = { error: { code: error.code, message: error.message } };
    return new HttpException(body, status);
  }
  console.error('API request failed', error);
  return new HttpException(
    {
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred' },
    } satisfies ApiErrorBody,
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
@Controller()
class RuntimeController {
  public constructor(private readonly runtime: PlatformRuntime) {}
  @Get('/api/v1/auth/providers')
  authProviders(): { readonly development: boolean; readonly google: boolean } {
    return {
      development: process.env['NODE_ENV'] === 'development',
      google: Boolean(process.env['OIDC_CLIENT_ID'] && process.env['OIDC_CLIENT_SECRET']),
    };
  }
  @Get('/api/v1/auth/google/login')
  async googleLogin(@Res() response: Response): Promise<void> {
    try {
      response.redirect(await this.runtime.beginGoogleLogin());
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Get('/api/v1/auth/google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const session = await this.runtime.completeGoogleLogin(code, state);
      setSessionCookie(response, session.sessionId);
      response.redirect('/');
    } catch (error) {
      console.error('Google authentication failed', error);
      response.redirect('/?auth_error=authentication_failed');
    }
  }
  @Post('/api/v1/dev/login')
  async developmentLogin(
    @Body() body: { userId?: string; organizationId?: string },
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ csrfToken: string }> {
    if (process.env['NODE_ENV'] !== 'development')
      throw new HttpException(
        { error: { code: 'NOT_AVAILABLE', message: 'Development login is not available' } },
        HttpStatus.NOT_FOUND,
      );
    try {
      const session = await this.runtime.loginDevelopment(
        body.userId ?? '00000000-0000-0000-0000-000000000001',
        body.organizationId,
      );
      setSessionCookie(response, session.sessionId);
      return { csrfToken: session.csrfToken };
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Get('/api/v1/session')
  async session(@Headers('cookie') cookie: string | undefined): Promise<{
    csrfToken: string;
    organizationId: string;
    organizations: readonly { id: string; name: string; role: string }[];
  }> {
    try {
      const session = await this.runtime.getSession(cookieValue(cookie, SESSION_COOKIE));
      return {
        csrfToken: session.csrfToken,
        organizationId: session.organizationId,
        organizations: await this.runtime.listOrganizations(session.sessionId),
      };
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Post('/api/v1/session/organization')
  async switchOrganization(
    @Headers('cookie') cookie: string | undefined,
    @Headers('x-csrf-token') csrfToken: string | undefined,
    @Body() body: { organizationId?: string },
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ csrfToken: string; organizationId: string }> {
    try {
      const session = await this.runtime.switchOrganization(
        cookieValue(cookie, SESSION_COOKIE),
        csrfToken,
        body.organizationId ?? '',
      );
      setSessionCookie(response, session.sessionId);
      return { csrfToken: session.csrfToken, organizationId: session.organizationId };
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Post('/api/v1/logout')
  async logout(
    @Headers('cookie') cookie: string | undefined,
    @Headers('x-csrf-token') csrfToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ ok: true }> {
    try {
      await this.runtime.logout(cookieValue(cookie, SESSION_COOKIE), csrfToken);
      clearSessionCookie(response);
      return { ok: true };
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Get('/api/v1/home')
  async home(@Headers('cookie') cookie: string | undefined): Promise<HomeResponse> {
    try {
      return await this.runtime.home(cookieValue(cookie, SESSION_COOKIE));
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Get('/health')
  health() {
    const config = loadRuntimeConfig();
    return {
      status: 'ok' as const,
      service: config.serviceName,
      version: config.version,
      checkedAt: new Date().toISOString(),
    };
  }
}
let runtimeInstance: PlatformRuntime | undefined;
let affiliateRuntimeInstance: AffiliateRuntime | undefined;
@Module({
  controllers: [RuntimeController, AffiliateController],
  providers: [
    {
      provide: PlatformRuntime,
      useFactory: () => {
        if (!runtimeInstance) throw new Error('Platform runtime is not initialized');
        return runtimeInstance;
      },
    },
    {
      provide: AffiliateRuntime,
      useFactory: () => {
        if (!affiliateRuntimeInstance) throw new Error('Affiliate runtime is not initialized');
        return affiliateRuntimeInstance;
      },
    },
  ],
})
class RuntimeModule {}
export async function createApiApplication() {
  const config = loadRuntimeConfig();
  const persistence = createPostgresPersistence({
    connectionString:
      process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@127.0.0.1:5432/business_os',
  });
  const repository = new PostgresPlatformRepository(persistence);
  affiliateRuntimeInstance = new AffiliateRuntime(new PostgresAffiliateRepository(persistence));
  runtimeInstance = new PlatformRuntime(repository);
  const app = await NestFactory.create(RuntimeModule, { bufferLogs: true });
  const corsOrigins = (process.env['CORS_ORIGIN'] ?? 'http://localhost:4173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });
  await app.listen(config.port);
  return app;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  void createApiApplication().catch((error: unknown) => {
    console.error('API process failed to start', error);
    process.exitCode = 1;
  });
}
