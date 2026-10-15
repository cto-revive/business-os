import type {
  HomeResponse,
  PlatformRepository,
  SessionRecord,
  Membership,
} from '@business-os/platform-contracts';
export class PlatformAccessError extends Error {
  public constructor(
    public readonly code:
      | 'AUTHENTICATION_REQUIRED'
      | 'ORGANIZATION_ACCESS_DENIED'
      | 'PERMISSION_DENIED'
      | 'AUTHORIZATION_STALE'
      | 'CSRF_INVALID',
    message: string,
  ) {
    super(message);
    this.name = 'PlatformAccessError';
  }
}
export class PlatformRuntime {
  public constructor(
    private readonly repository: PlatformRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}
  public async loginDevelopment(userId: string, organizationId?: string): Promise<SessionRecord> {
    const user = await this.repository.findUser(userId);
    if (!user || user.state !== 'active')
      throw new PlatformAccessError('AUTHENTICATION_REQUIRED', 'Authentication is required');
    const memberships = await this.repository.listMemberships(userId);
    const membership = memberships.find(
      (item) =>
        item.state === 'active' && (!organizationId || item.organizationId === organizationId),
    );
    if (!membership)
      throw new PlatformAccessError('ORGANIZATION_ACCESS_DENIED', 'Organization access is denied');
    return this.repository.createSession({
      userId,
      organizationId: membership.organizationId,
      authorizationEpoch: membership.authorizationEpoch,
      expiresAt: new Date(this.now().getTime() + 8 * 60 * 60 * 1000),
    });
  }
  public async getSession(sessionId: string | undefined): Promise<SessionRecord> {
    if (!sessionId)
      throw new PlatformAccessError('AUTHENTICATION_REQUIRED', 'Authentication is required');
    const session = await this.repository.findSession(sessionId);
    if (!session || session.expiresAt <= this.now())
      throw new PlatformAccessError('AUTHENTICATION_REQUIRED', 'Authentication is required');
    const membership = await this.repository.findMembership(session.userId, session.organizationId);
    if (!membership || membership.state !== 'active')
      throw new PlatformAccessError('ORGANIZATION_ACCESS_DENIED', 'Organization access is denied');
    if (membership.authorizationEpoch !== session.authorizationEpoch)
      throw new PlatformAccessError('AUTHORIZATION_STALE', 'Authorization is no longer current');
    return session;
  }
  public async getAuthenticatedContext(sessionId: string | undefined): Promise<{
    readonly session: SessionRecord;
    readonly membership: Membership;
  }> {
    const session = await this.getSession(sessionId);
    const membership = await this.repository.findMembership(session.userId, session.organizationId);
    if (!membership || membership.state !== 'active')
      throw new PlatformAccessError('ORGANIZATION_ACCESS_DENIED', 'Organization access is denied');
    return { session, membership };
  }
  public async listOrganizations(
    sessionId: string | undefined,
  ): Promise<readonly { id: string; name: string; role: string }[]> {
    const session = await this.getSession(sessionId);
    const memberships = await this.repository.listMemberships(session.userId);
    const result: { id: string; name: string; role: string }[] = [];
    for (const membership of memberships)
      if (membership.state === 'active') {
        const organization = await this.repository.findOrganization(membership.organizationId);
        if (organization)
          result.push({
            id: organization.organizationId,
            name: organization.name,
            role: membership.role,
          });
      }
    return result;
  }
  public async switchOrganization(
    sessionId: string | undefined,
    csrfToken: string | undefined,
    organizationId: string,
  ): Promise<SessionRecord> {
    const session = await this.getSession(sessionId);
    if (!csrfToken || csrfToken !== session.csrfToken)
      throw new PlatformAccessError('CSRF_INVALID', 'CSRF validation failed');
    const membership = await this.repository.findMembership(session.userId, organizationId);
    if (!membership || membership.state !== 'active')
      throw new PlatformAccessError('ORGANIZATION_ACCESS_DENIED', 'Organization access is denied');
    return this.repository.rotateSession(session.sessionId, {
      organizationId,
      authorizationEpoch: membership.authorizationEpoch,
    });
  }
  public async logout(sessionId: string | undefined, csrfToken: string | undefined): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!csrfToken || csrfToken !== session.csrfToken)
      throw new PlatformAccessError('CSRF_INVALID', 'CSRF validation failed');
    await this.repository.revokeSession(session.sessionId);
  }
  public async home(sessionId: string | undefined): Promise<HomeResponse> {
    const session = await this.getSession(sessionId);
    const user = await this.repository.findUser(session.userId);
    const membership = await this.repository.findMembership(session.userId, session.organizationId);
    const organization = await this.repository.findOrganization(session.organizationId);
    if (!user || !membership || membership.state !== 'active' || !organization)
      throw new PlatformAccessError('ORGANIZATION_ACCESS_DENIED', 'Organization access is denied');
    const items = await this.repository.listWorkspaceItems(organization.organizationId);
    return {
      organization: { id: organization.organizationId, name: organization.name },
      viewer: { userId: user.userId, displayName: user.displayName, role: membership.role },
      workspace: { itemCount: items.length, items },
    };
  }
}
