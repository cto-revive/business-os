import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import type {
  PlatformRepository,
  UserIdentity,
  Membership,
  Organization,
  WorkspaceItem,
  SessionRecord,
  Role,
  MembershipState,
  OidcLoginState,
} from '@business-os/platform-contracts';
import type { OrganizationContext, PlatformContext } from '@business-os/persistence-contracts';
import {
  assertOrganizationContext,
  assertPlatformContext,
} from '@business-os/persistence-contracts';
import type { PostgresPersistence } from './index.js';
import { createUuidV7, withOrganizationDb, withPlatformDb } from './index.js';
const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';
function platformContext(principalId = SYSTEM_USER): PlatformContext {
  return {
    principalId,
    principalKind: 'human',
    correlationId: `platform:${randomUUID()}`,
    scope: ['platform:identity'],
  };
}
function organizationContext(
  organizationId: string,
  principalId = SYSTEM_USER,
): OrganizationContext {
  return {
    organizationId,
    principalId,
    principalKind: 'human',
    membershipOrCredentialId: principalId,
    authorizationEpoch: 0,
    correlationId: `organization:${randomUUID()}`,
    scope: ['platform:home.read'],
  };
}
interface UserRow {
  user_id: string;
  display_name: string;
  email: string | null;
  state: 'active' | 'disabled';
}
interface OrganizationRow {
  organization_id: string;
  name: string;
}
interface MembershipRow {
  user_id: string;
  organization_id: string;
  role: Role;
  state: MembershipState;
  authorization_epoch: number;
}
interface SessionRow {
  session_id: string;
  csrf_token: string;
  user_id: string;
  organization_id: string;
  expires_at: Date;
  authorization_epoch: number;
}
interface ItemRow {
  item_id: string;
  title: string;
}
export class PostgresPlatformRepository implements PlatformRepository {
  public constructor(private readonly persistence: PostgresPersistence) {}
  public async findUser(userId: string): Promise<UserIdentity | null> {
    const result = await withPlatformDb(this.persistence, platformContext(userId), (db) =>
      sql<UserRow>`select user_id, display_name, email, state from users where user_id = ${userId}`.execute(
        db,
      ),
    );
    const row = result.rows[0];
    return row
      ? {
          userId: row.user_id,
          displayName: row.display_name,
          email: row.email ?? undefined,
          state: row.state,
        }
      : null;
  }
  public async findUserByEmail(email: string): Promise<UserIdentity | null> {
    const result = await withPlatformDb(this.persistence, platformContext(), (db) =>
      sql<UserRow>`select user_id, display_name, email, state from users where lower(email) = lower(${email})`.execute(
        db,
      ),
    );
    const row = result.rows[0];
    return row
      ? {
          userId: row.user_id,
          displayName: row.display_name,
          email: row.email ?? undefined,
          state: row.state,
        }
      : null;
  }
  public async findExternalIdentity(
    providerName: string,
    subject: string,
  ): Promise<UserIdentity | null> {
    const result = await withPlatformDb(this.persistence, platformContext(), (db) =>
      sql<UserRow>`select u.user_id, u.display_name, u.email, u.state from external_identities e join users u on u.user_id = e.user_id where e.provider_name = ${providerName} and e.subject = ${subject}`.execute(
        db,
      ),
    );
    const row = result.rows[0];
    return row
      ? {
          userId: row.user_id,
          displayName: row.display_name,
          email: row.email ?? undefined,
          state: row.state,
        }
      : null;
  }
  public async linkExternalIdentity(input: {
    readonly providerName: string;
    readonly subject: string;
    readonly userId: string;
  }): Promise<void> {
    await withPlatformDb(this.persistence, platformContext(input.userId), (db) =>
      sql`insert into external_identities (provider_name, subject, user_id) values (${input.providerName}, ${input.subject}, ${input.userId}) on conflict (provider_name, subject) do nothing`.execute(
        db,
      ),
    );
  }
  public async createOidcLoginState(input: OidcLoginState): Promise<void> {
    await withPlatformDb(this.persistence, platformContext(), (db) =>
      sql`insert into oidc_login_states (state, code_verifier, nonce, redirect_uri, expires_at) values (${input.state}, ${input.codeVerifier}, ${input.nonce}, ${input.redirectUri}, ${input.expiresAt})`.execute(
        db,
      ),
    );
  }
  public async consumeOidcLoginState(state: string): Promise<OidcLoginState | null> {
    const result = await withPlatformDb(this.persistence, platformContext(), (db) =>
      sql<{
        state: string;
        code_verifier: string;
        nonce: string;
        redirect_uri: string;
        expires_at: Date;
      }>`delete from oidc_login_states where state = ${state} returning state, code_verifier, nonce, redirect_uri, expires_at`.execute(
        db,
      ),
    );
    const row = result.rows[0];
    return row
      ? {
          state: row.state,
          codeVerifier: row.code_verifier,
          nonce: row.nonce,
          redirectUri: row.redirect_uri,
          expiresAt: new Date(row.expires_at),
        }
      : null;
  }
  public async findMembership(userId: string, organizationId: string): Promise<Membership | null> {
    const context = assertOrganizationContext(organizationContext(organizationId, userId));
    const result = await withOrganizationDb(this.persistence, context, (db) =>
      sql<MembershipRow>`select user_id, organization_id, role, state, authorization_epoch from organization_memberships where user_id = ${userId} and organization_id = ${organizationId}`.execute(
        db,
      ),
    );
    const row = result.rows[0];
    return row
      ? {
          userId: row.user_id,
          organizationId: row.organization_id,
          role: row.role,
          state: row.state,
          authorizationEpoch: Number(row.authorization_epoch),
        }
      : null;
  }
  public async listMemberships(userId: string): Promise<readonly Membership[]> {
    const result = await withPlatformDb(this.persistence, platformContext(userId), (db) =>
      sql<MembershipRow>`select user_id, organization_id, role, state, authorization_epoch from organization_memberships where user_id = ${userId} order by organization_id`.execute(
        db,
      ),
    );
    return result.rows.map((row) => ({
      userId: row.user_id,
      organizationId: row.organization_id,
      role: row.role,
      state: row.state,
      authorizationEpoch: Number(row.authorization_epoch),
    }));
  }
  public async findOrganization(organizationId: string): Promise<Organization | null> {
    const result = await withPlatformDb(this.persistence, platformContext(), (db) =>
      sql<OrganizationRow>`select organization_id, name from organizations where organization_id = ${organizationId}`.execute(
        db,
      ),
    );
    const row = result.rows[0];
    return row ? { organizationId: row.organization_id, name: row.name } : null;
  }
  public async listWorkspaceItems(organizationId: string): Promise<readonly WorkspaceItem[]> {
    const context = assertOrganizationContext(organizationContext(organizationId));
    const result = await withOrganizationDb(this.persistence, context, (db) =>
      sql<ItemRow>`select item_id, title from workspace_items where organization_id = ${organizationId} order by item_id`.execute(
        db,
      ),
    );
    return result.rows.map((row) => ({ id: row.item_id, title: row.title }));
  }
  public async createSession(input: {
    readonly userId: string;
    readonly organizationId: string;
    readonly authorizationEpoch: number;
    readonly expiresAt: Date;
  }): Promise<SessionRecord> {
    const sessionId = createUuidV7();
    const csrfToken = randomUUID();
    await withPlatformDb(this.persistence, platformContext(input.userId), (db) =>
      sql`insert into sessions (session_id, csrf_token, user_id, organization_id, authorization_epoch, expires_at) values (${sessionId}, ${csrfToken}, ${input.userId}, ${input.organizationId}, ${input.authorizationEpoch}, ${input.expiresAt})`.execute(
        db,
      ),
    );
    return {
      sessionId,
      csrfToken,
      userId: input.userId,
      organizationId: input.organizationId,
      authorizationEpoch: input.authorizationEpoch,
      expiresAt: input.expiresAt,
    };
  }
  public async findSession(sessionId: string): Promise<SessionRecord | null> {
    const result = await withPlatformDb(this.persistence, platformContext(), (db) =>
      sql<SessionRow>`select session_id, csrf_token, user_id, organization_id, expires_at, authorization_epoch from sessions where session_id = ${sessionId} and revoked_at is null`.execute(
        db,
      ),
    );
    const row = result.rows[0];
    return row
      ? {
          sessionId: row.session_id,
          csrfToken: row.csrf_token,
          userId: row.user_id,
          organizationId: row.organization_id,
          expiresAt: new Date(row.expires_at),
          authorizationEpoch: Number(row.authorization_epoch),
        }
      : null;
  }
  public async rotateSession(
    sessionId: string,
    input: { readonly organizationId: string; readonly authorizationEpoch: number },
  ): Promise<SessionRecord> {
    const current = await this.findSession(sessionId);
    if (!current) throw new Error('Session is not active');
    const next = {
      sessionId: createUuidV7(),
      csrfToken: randomUUID(),
      userId: current.userId,
      organizationId: input.organizationId,
      authorizationEpoch: input.authorizationEpoch,
      expiresAt: current.expiresAt,
    };
    await withPlatformDb(this.persistence, platformContext(current.userId), async (db) => {
      await sql`update sessions set revoked_at = CURRENT_TIMESTAMP where session_id = ${sessionId} and revoked_at is null`.execute(
        db,
      );
      await sql`insert into sessions (session_id, csrf_token, user_id, organization_id, authorization_epoch, expires_at) values (${next.sessionId}, ${next.csrfToken}, ${next.userId}, ${next.organizationId}, ${next.authorizationEpoch}, ${next.expiresAt})`.execute(
        db,
      );
    });
    return next;
  }
  public async revokeSession(sessionId: string): Promise<void> {
    await withPlatformDb(this.persistence, platformContext(), (db) =>
      sql`update sessions set revoked_at = CURRENT_TIMESTAMP where session_id = ${sessionId} and revoked_at is null`.execute(
        db,
      ),
    );
  }
}
