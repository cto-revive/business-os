exports.up = (pgm) => {
  pgm.createTable(
    'audit_events',
    {
      event_id: { type: 'uuid', primaryKey: true },
      occurred_at: { type: 'timestamptz', notNull: true },
      organization_id: { type: 'uuid', notNull: false },
      actor_id: { type: 'uuid', notNull: true },
      actor_kind: { type: 'text', notNull: true },
      action: { type: 'text', notNull: true },
      resource_type: { type: 'text', notNull: true },
      target_id: { type: 'uuid', notNull: false },
      authorization_outcome: { type: 'text', notNull: true },
      policy_basis: { type: 'text', notNull: true },
      outcome: { type: 'text', notNull: true },
      error_category: { type: 'text', notNull: false },
      correlation_id: { type: 'text', notNull: true },
      causation_id: { type: 'text', notNull: false },
      payload: { type: 'jsonb', notNull: false },
    },
    { ifNotExists: true },
  );
  pgm.sql(
    "ALTER TABLE audit_events ADD CONSTRAINT audit_events_actor_kind_check CHECK (actor_kind IN ('human', 'service', 'integration', 'automation', 'ai-agent'))",
  );
  pgm.sql(
    "ALTER TABLE audit_events ADD CONSTRAINT audit_events_authorization_outcome_check CHECK (authorization_outcome IN ('allow', 'deny', 'requires_approval'))",
  );
  pgm.sql(
    "ALTER TABLE audit_events ADD CONSTRAINT audit_events_scope_check CHECK (organization_id IS NOT NULL OR current_setting('app.platform_access', true) = 'true')",
  );
  pgm.createIndex('audit_events', ['organization_id', 'occurred_at'], {
    name: 'audit_events_organization_time_idx',
  });
  pgm.createIndex('audit_events', ['actor_id', 'occurred_at'], {
    name: 'audit_events_actor_time_idx',
  });
  pgm.createIndex('audit_events', ['correlation_id'], { name: 'audit_events_correlation_idx' });
  pgm.sql('ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY');
  pgm.sql('ALTER TABLE audit_events FORCE ROW LEVEL SECURITY');
  pgm.sql(
    "CREATE POLICY audit_events_tenant_select ON audit_events FOR SELECT USING (current_setting('app.platform_access', true) = 'false' AND organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)",
  );
  pgm.sql(
    "CREATE POLICY audit_events_tenant_insert ON audit_events FOR INSERT WITH CHECK (current_setting('app.platform_access', true) = 'false' AND organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)",
  );
  pgm.sql(
    "CREATE POLICY audit_events_platform_select ON audit_events FOR SELECT USING (current_setting('app.platform_access', true) = 'true' AND organization_id IS NULL)",
  );
  pgm.sql(
    "CREATE POLICY audit_events_platform_insert ON audit_events FOR INSERT WITH CHECK (current_setting('app.platform_access', true) = 'true' AND organization_id IS NULL)",
  );
  pgm.sql('REVOKE UPDATE, DELETE ON audit_events FROM PUBLIC');
};

exports.down = (pgm) => {
  pgm.sql('DROP POLICY IF EXISTS audit_events_tenant_select ON audit_events');
  pgm.sql('DROP POLICY IF EXISTS audit_events_tenant_insert ON audit_events');
  pgm.sql('DROP POLICY IF EXISTS audit_events_platform_select ON audit_events');
  pgm.sql('DROP POLICY IF EXISTS audit_events_platform_insert ON audit_events');
  pgm.dropTable('audit_events', { ifExists: true });
};
