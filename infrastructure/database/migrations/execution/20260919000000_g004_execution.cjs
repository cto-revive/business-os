exports.up = (pgm) => {
  pgm.createTable('execution_events', {
    event_id: { type: 'uuid', primaryKey: true },
    event_type: { type: 'text', notNull: true },
    event_version: { type: 'integer', notNull: true },
    occurred_at: { type: 'timestamptz', notNull: true },
    organization_id: { type: 'uuid', notNull: false },
    actor_id: { type: 'uuid', notNull: true },
    actor_kind: { type: 'text', notNull: true },
    authorization_epoch: { type: 'integer', notNull: false },
    aggregate_type: { type: 'text', notNull: true },
    aggregate_id: { type: 'uuid', notNull: true },
    aggregate_sequence: { type: 'bigint', notNull: false },
    correlation_id: { type: 'text', notNull: true },
    causation_id: { type: 'uuid', notNull: false },
    payload: { type: 'jsonb', notNull: true },
    state: { type: 'text', notNull: true, default: 'pending' },
    available_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    attempt: { type: 'integer', notNull: true, default: 0 },
    leased_until: { type: 'timestamptz', notNull: false },
    fencing_token: { type: 'bigint', notNull: true, default: 0 },
  });
  pgm.createTable('execution_jobs', {
    job_id: { type: 'uuid', primaryKey: true },
    job_type: { type: 'text', notNull: true },
    job_version: { type: 'integer', notNull: true },
    organization_id: { type: 'uuid', notNull: false },
    principal_id: { type: 'uuid', notNull: true },
    principal_kind: { type: 'text', notNull: true },
    authorization_epoch: { type: 'integer', notNull: false },
    idempotency_key: { type: 'text', notNull: true },
    state: { type: 'text', notNull: true, default: 'pending' },
    payload: { type: 'jsonb', notNull: true },
    retry_policy: { type: 'jsonb', notNull: true },
    correlation_id: { type: 'text', notNull: true },
    causation_id: { type: 'uuid', notNull: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createTable('execution_queue_messages', {
    message_id: { type: 'uuid', primaryKey: true },
    job_id: { type: 'uuid', notNull: true, references: 'execution_jobs', onDelete: 'RESTRICT' },
    message_type: { type: 'text', notNull: true },
    message_version: { type: 'integer', notNull: true },
    organization_id: { type: 'uuid', notNull: false },
    principal_id: { type: 'uuid', notNull: true },
    principal_kind: { type: 'text', notNull: true },
    authorization_epoch: { type: 'integer', notNull: false },
    idempotency_key: { type: 'text', notNull: true },
    payload: { type: 'jsonb', notNull: true },
    state: { type: 'text', notNull: true, default: 'ready' },
    attempt: { type: 'integer', notNull: true, default: 0 },
    available_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    leased_until: { type: 'timestamptz', notNull: false },
    lease_owner: { type: 'text', notNull: false },
    fencing_token: { type: 'bigint', notNull: true, default: 0 },
    correlation_id: { type: 'text', notNull: true },
    causation_id: { type: 'uuid', notNull: false },
    last_error: { type: 'text', notNull: false },
  });
  pgm.createTable('execution_schedules', {
    schedule_id: { type: 'uuid', primaryKey: true },
    organization_id: { type: 'uuid', notNull: false },
    schedule_type: { type: 'text', notNull: true },
    expression: { type: 'text', notNull: true },
    timezone: { type: 'text', notNull: true, default: 'UTC' },
    missed_policy: { type: 'text', notNull: true, default: 'run_once' },
    state: { type: 'text', notNull: true, default: 'active' },
    payload: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createTable('execution_schedule_occurrences', {
    schedule_id: { type: 'uuid', notNull: true, references: 'execution_schedules', onDelete: 'CASCADE' },
    occurrence_id: { type: 'text', notNull: true },
    organization_id: { type: 'uuid', notNull: false },
    scheduled_for: { type: 'timestamptz', notNull: true },
    job_id: { type: 'uuid', notNull: true, references: 'execution_jobs', onDelete: 'RESTRICT' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  }, { constraints: { primaryKey: ['schedule_id', 'occurrence_id'] } });
  pgm.createTable('execution_idempotency', {
    idempotency_key: { type: 'text', notNull: true },
    scope_key: { type: 'text', notNull: true },
    organization_id: { type: 'uuid', notNull: false },
    operation_type: { type: 'text', notNull: true },
    request_hash: { type: 'text', notNull: true },
    state: { type: 'text', notNull: true, default: 'in_progress' },
    result: { type: 'jsonb', notNull: false },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  }, { constraints: { primaryKey: ['idempotency_key', 'scope_key', 'operation_type'] } });
  pgm.createTable('execution_approvals', {
    approval_request_id: { type: 'uuid', primaryKey: true },
    organization_id: { type: 'uuid', notNull: false },
    requester_id: { type: 'uuid', notNull: true },
    action_type: { type: 'text', notNull: true },
    action_version: { type: 'integer', notNull: true },
    binding_hash: { type: 'text', notNull: true },
    input: { type: 'jsonb', notNull: true },
    target_ids: { type: 'jsonb', notNull: true },
    resource_versions: { type: 'jsonb', notNull: true },
    authorization_epoch: { type: 'integer', notNull: true },
    state: { type: 'text', notNull: true, default: 'pending' },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createTable('execution_records', {
    execution_id: { type: 'uuid', primaryKey: true },
    approval_request_id: { type: 'uuid', notNull: false, references: 'execution_approvals', onDelete: 'RESTRICT' },
    organization_id: { type: 'uuid', notNull: false },
    action_type: { type: 'text', notNull: true },
    action_version: { type: 'integer', notNull: true },
    binding_hash: { type: 'text', notNull: true },
    idempotency_key: { type: 'text', notNull: true },
    state: { type: 'text', notNull: true, default: 'pending' },
    result: { type: 'jsonb', notNull: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  for (const table of ['execution_events', 'execution_jobs', 'execution_queue_messages', 'execution_schedules', 'execution_schedule_occurrences', 'execution_idempotency', 'execution_approvals', 'execution_records']) {
    pgm.sql(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    pgm.sql(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    pgm.sql(`CREATE POLICY ${table}_tenant_select ON ${table} FOR SELECT USING (current_setting('app.platform_access', true) = 'false' AND organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)`);
    pgm.sql(`CREATE POLICY ${table}_tenant_insert ON ${table} FOR INSERT WITH CHECK (current_setting('app.platform_access', true) = 'false' AND organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)`);
    pgm.sql(`CREATE POLICY ${table}_tenant_update ON ${table} FOR UPDATE USING (current_setting('app.platform_access', true) = 'false' AND organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid) WITH CHECK (current_setting('app.platform_access', true) = 'false' AND organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)`);
    pgm.sql(`CREATE POLICY ${table}_platform_all ON ${table} FOR ALL USING (current_setting('app.platform_access', true) = 'true' AND organization_id IS NULL) WITH CHECK (current_setting('app.platform_access', true) = 'true' AND organization_id IS NULL)`);
    pgm.sql(`REVOKE DELETE ON ${table} FROM PUBLIC`);
  }
  pgm.sql("ALTER TABLE execution_events ADD CONSTRAINT execution_events_scope_check CHECK (organization_id IS NOT NULL OR current_setting('app.platform_access', true) = 'true')");
  pgm.sql("ALTER TABLE execution_jobs ADD CONSTRAINT execution_jobs_scope_check CHECK (organization_id IS NOT NULL OR current_setting('app.platform_access', true) = 'true')");
  pgm.sql("ALTER TABLE execution_queue_messages ADD CONSTRAINT execution_queue_scope_check CHECK (organization_id IS NOT NULL OR current_setting('app.platform_access', true) = 'true')");
  pgm.createIndex('execution_events', ['organization_id', 'occurred_at', 'aggregate_id'], { name: 'execution_events_scope_order_idx' });
  pgm.createIndex('execution_events', ['state', 'available_at'], { name: 'execution_events_dispatch_idx' });
  pgm.createIndex('execution_queue_messages', ['state', 'available_at'], { name: 'execution_queue_claim_idx' });
  pgm.createIndex('execution_queue_messages', ['organization_id', 'job_id'], { name: 'execution_queue_scope_job_idx' });
  pgm.createIndex('execution_jobs', ['organization_id', 'state'], { name: 'execution_jobs_scope_state_idx' });
  pgm.createIndex('execution_approvals', ['organization_id', 'state'], { name: 'execution_approvals_scope_state_idx' });
};

exports.down = (pgm) => {
  for (const table of ['execution_records', 'execution_approvals', 'execution_idempotency', 'execution_schedule_occurrences', 'execution_schedules', 'execution_queue_messages', 'execution_jobs', 'execution_events']) {
    pgm.dropTable(table, { ifExists: true, cascade: true });
  }
};
