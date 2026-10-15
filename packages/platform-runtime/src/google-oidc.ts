/* global AbortSignal, Buffer, URLSearchParams, fetch */

import { createHash, createPublicKey, createVerify, randomBytes } from 'node:crypto';
import type {
  OidcLoginState,
  PlatformRepository,
  SessionRecord,
} from '@business-os/platform-contracts';
import { PlatformAccessError } from './index.js';

type Discovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
};
type Jwk = { kty: string; n: string; e: string; kid?: string; alg?: string };
type Claims = {
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce: string;
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  hd?: string;
};
const PROVIDER = 'google-workspace';
const discoveryCache = new Map<string, { value: Discovery; expiresAt: number }>();
const keyCache = new Map<string, { value: readonly Jwk[]; expiresAt: number }>();
function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}
function requiredConfig(name: string): string {
  const value = env(name);
  if (!value)
    throw new PlatformAccessError(
      'AUTHENTICATION_REQUIRED',
      `Authentication is not configured: ${name}`,
    );
  return value;
}
function encode(value: Uint8Array): string {
  return Buffer.from(value).toString('base64url');
}
function decode(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}
function parseJson<T>(value: string): T {
  return JSON.parse(decode(value).toString('utf8')) as T;
}
async function json<T>(
  url: string,
  init?: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: string | URLSearchParams;
  },
): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!response.ok)
    throw new PlatformAccessError(
      'AUTHENTICATION_REQUIRED',
      'Authentication provider request failed',
    );
  return (await response.json()) as T;
}
async function discovery(issuer: string): Promise<Discovery> {
  const cached = discoveryCache.get(issuer);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await json<Discovery>(
    `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`,
  );
  discoveryCache.set(issuer, { value, expiresAt: Date.now() + 60 * 60 * 1000 });
  return value;
}
async function keys(uri: string): Promise<readonly Jwk[]> {
  const cached = keyCache.get(uri);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = (await json<{ keys: Jwk[] }>(uri)).keys;
  keyCache.set(uri, { value, expiresAt: Date.now() + 60 * 60 * 1000 });
  return value;
}
function config() {
  return {
    issuer: env('OIDC_ISSUER') ?? 'https://accounts.google.com',
    clientId: requiredConfig('OIDC_CLIENT_ID'),
    clientSecret: requiredConfig('OIDC_CLIENT_SECRET'),
    redirectUri:
      env('OIDC_REDIRECT_URI') ??
      `http://localhost:${env('PORT') ?? '3000'}/api/v1/auth/google/callback`,
    hostedDomain: env('OIDC_HOSTED_DOMAIN'),
  };
}
function claimsFromToken(token: string): {
  header: { alg?: string; kid?: string };
  claims: Claims;
  signingInput: string;
  signature: Buffer;
} {
  const [encodedHeader, encodedClaims, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedClaims || !encodedSignature)
    throw new PlatformAccessError('AUTHENTICATION_REQUIRED', 'Authentication token is malformed');
  return {
    header: parseJson(encodedHeader),
    claims: parseJson(encodedClaims),
    signingInput: `${encodedHeader}.${encodedClaims}`,
    signature: decode(encodedSignature),
  };
}
async function verifyIdToken(
  token: string,
  expected: {
    issuer: string;
    clientId: string;
    nonce: string;
    jwksUri: string;
    hostedDomain?: string | undefined;
  },
): Promise<Claims> {
  const parsed = claimsFromToken(token);
  if (parsed.header.alg !== 'RS256')
    throw new PlatformAccessError(
      'AUTHENTICATION_REQUIRED',
      'Unsupported authentication token algorithm',
    );
  const key = (await keys(expected.jwksUri)).find((item) => item.kid === parsed.header.kid);
  if (!key)
    throw new PlatformAccessError(
      'AUTHENTICATION_REQUIRED',
      'Authentication signing key is unavailable',
    );
  const publicKey = createPublicKey({ key: { kty: key.kty, n: key.n, e: key.e }, format: 'jwk' });
  const verifier = createVerify('RSA-SHA256');
  verifier.update(parsed.signingInput);
  verifier.end();
  if (!verifier.verify(publicKey, parsed.signature))
    throw new PlatformAccessError(
      'AUTHENTICATION_REQUIRED',
      'Authentication token signature is invalid',
    );
  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(parsed.claims.aud) ? parsed.claims.aud : [parsed.claims.aud];
  if (
    parsed.claims.iss !== expected.issuer ||
    !audience.includes(expected.clientId) ||
    parsed.claims.exp <= now ||
    parsed.claims.iat > now + 60 ||
    parsed.claims.nonce !== expected.nonce
  )
    throw new PlatformAccessError(
      'AUTHENTICATION_REQUIRED',
      'Authentication token claims are invalid',
    );
  if (!parsed.claims.sub || !parsed.claims.email || parsed.claims.email_verified !== true)
    throw new PlatformAccessError(
      'AUTHENTICATION_REQUIRED',
      'A verified Google Workspace email is required',
    );
  if (expected.hostedDomain && parsed.claims.hd !== expected.hostedDomain)
    throw new PlatformAccessError(
      'AUTHENTICATION_REQUIRED',
      'This Google Workspace domain is not allowed',
    );
  return parsed.claims;
}

export class GoogleOidcService {
  public constructor(
    private readonly repository: PlatformRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}
  public async begin(): Promise<string> {
    const settings = config();
    const provider = await discovery(settings.issuer);
    const state = encode(randomBytes(32));
    const nonce = encode(randomBytes(32));
    const codeVerifier = encode(randomBytes(32));
    const challenge = encode(createHash('sha256').update(codeVerifier).digest());
    const stateRecord: OidcLoginState = {
      state,
      codeVerifier,
      nonce,
      redirectUri: settings.redirectUri,
      expiresAt: new Date(this.now().getTime() + 10 * 60 * 1000),
    };
    await this.repository.createOidcLoginState(stateRecord);
    const url = new URL(provider.authorization_endpoint);
    url.searchParams.set('client_id', settings.clientId);
    url.searchParams.set('redirect_uri', settings.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    if (settings.hostedDomain) url.searchParams.set('hd', settings.hostedDomain);
    return url.toString();
  }
  public async complete(
    code: string | undefined,
    state: string | undefined,
  ): Promise<SessionRecord> {
    if (!code || !state)
      throw new PlatformAccessError(
        'AUTHENTICATION_REQUIRED',
        'Authentication callback is incomplete',
      );
    const settings = config();
    const stored = await this.repository.consumeOidcLoginState(state);
    if (!stored || stored.expiresAt <= this.now())
      throw new PlatformAccessError(
        'AUTHENTICATION_REQUIRED',
        'Authentication login state is invalid or expired',
      );
    const provider = await discovery(settings.issuer);
    const form = new URLSearchParams({
      code,
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      redirect_uri: stored.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: stored.codeVerifier,
    });
    const token = await json<{ id_token?: string }>(provider.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!token.id_token)
      throw new PlatformAccessError(
        'AUTHENTICATION_REQUIRED',
        'Authentication provider did not return an identity token',
      );
    const claims = await verifyIdToken(token.id_token, {
      issuer: provider.issuer,
      clientId: settings.clientId,
      nonce: stored.nonce,
      jwksUri: provider.jwks_uri,
      hostedDomain: settings.hostedDomain,
    });
    let user = await this.repository.findExternalIdentity(PROVIDER, claims.sub);
    if (!user) {
      user = await this.repository.findUserByEmail(claims.email!);
      if (!user)
        throw new PlatformAccessError(
          'ORGANIZATION_ACCESS_DENIED',
          'Your Google Workspace identity is not provisioned in Business OS',
        );
      await this.repository.linkExternalIdentity({
        providerName: PROVIDER,
        subject: claims.sub,
        userId: user.userId,
      });
    }
    if (user.state !== 'active')
      throw new PlatformAccessError(
        'AUTHENTICATION_REQUIRED',
        'This Business OS identity is disabled',
      );
    const membership = (await this.repository.listMemberships(user.userId)).find(
      (item) => item.state === 'active',
    );
    if (!membership)
      throw new PlatformAccessError(
        'ORGANIZATION_ACCESS_DENIED',
        'Your Business OS identity has no active organization membership',
      );
    return this.repository.createSession({
      userId: user.userId,
      organizationId: membership.organizationId,
      authorizationEpoch: membership.authorizationEpoch,
      expiresAt: new Date(this.now().getTime() + 8 * 60 * 60 * 1000),
    });
  }
}
