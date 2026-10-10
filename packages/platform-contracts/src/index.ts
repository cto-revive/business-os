export type Role = 'owner' | 'admin' | 'member';
export type MembershipState = 'active' | 'suspended' | 'revoked';
export interface UserIdentity {
  readonly userId: string;
  readonly displayName: string;
  readonly state: 'active' | 'disabled';
}
export interface Organization {
  readonly organizationId: string;
  readonly name: string;
}
export interface Membership {
  readonly userId: string;
  readonly organizationId: string;
  readonly role: Role;
  readonly state: MembershipState;
  readonly authorizationEpoch: number;
}
export interface SessionRecord {
  readonly sessionId: string;
  readonly csrfToken: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly expiresAt: Date;
  readonly authorizationEpoch: number;
}
export interface WorkspaceItem {
  readonly id: string;
  readonly title: string;
}
export interface HomeResponse {
  readonly organization: { readonly id: string; readonly name: string };
  readonly viewer: { readonly userId: string; readonly displayName: string; readonly role: Role };
  readonly workspace: { readonly itemCount: number; readonly items: readonly WorkspaceItem[] };
}
export interface ApiErrorBody {
  readonly error: { readonly code: string; readonly message: string };
}
export interface PlatformRepository {
  findUser(userId: string): Promise<UserIdentity | null>;
  findMembership(userId: string, organizationId: string): Promise<Membership | null>;
  listMemberships(userId: string): Promise<readonly Membership[]>;
  findOrganization(organizationId: string): Promise<Organization | null>;
  listWorkspaceItems(organizationId: string): Promise<readonly WorkspaceItem[]>;
  createSession(input: {
    readonly userId: string;
    readonly organizationId: string;
    readonly authorizationEpoch: number;
    readonly expiresAt: Date;
  }): Promise<SessionRecord>;
  findSession(sessionId: string): Promise<SessionRecord | null>;
  rotateSession(
    sessionId: string,
    input: { readonly organizationId: string; readonly authorizationEpoch: number },
  ): Promise<SessionRecord>;
  revokeSession(sessionId: string): Promise<void>;
}
