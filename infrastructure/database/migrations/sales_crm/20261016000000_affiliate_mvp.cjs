exports.up = (pgm) => {
  pgm.createTable('affiliate_partners', {
    partner_id: { type: 'uuid', primaryKey: true },
    organization_id: {
      type: 'uuid',
      notNull: true,
      references: 'organizations',
      onDelete: 'RESTRICT',
    },
    name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true },
    code: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'pending' },
    created_by: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createTable('affiliate_links', {
    link_id: { type: 'uuid', primaryKey: true },
    organization_id: {
      type: 'uuid',
      notNull: true,
      references: 'organizations',
      onDelete: 'RESTRICT',
    },
    partner_id: {
      type: 'uuid',
      notNull: true,
      references: 'affiliate_partners',
      onDelete: 'RESTRICT',
    },
    code: { type: 'text', notNull: true },
    destination_url: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createTable('affiliate_commission_rules', {
    rule_id: { type: 'uuid', primaryKey: true },
    organization_id: {
      type: 'uuid',
      notNull: true,
      references: 'organizations',
      onDelete: 'RESTRICT',
    },
    name: { type: 'text', notNull: true },
    model: { type: 'text', notNull: true },
    value: { type: 'numeric(18,2)', notNull: true },
    currency: { type: 'char(3)', notNull: true },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createTable('affiliate_referrals', {
    referral_id: { type: 'uuid', primaryKey: true },
    organization_id: {
      type: 'uuid',
      notNull: true,
      references: 'organizations',
      onDelete: 'RESTRICT',
    },
    partner_id: {
      type: 'uuid',
      notNull: true,
      references: 'affiliate_partners',
      onDelete: 'RESTRICT',
    },
    link_id: { type: 'uuid', references: 'affiliate_links', onDelete: 'RESTRICT' },
    rule_id: {
      type: 'uuid',
      notNull: true,
      references: 'affiliate_commission_rules',
      onDelete: 'RESTRICT',
    },
    external_reference: { type: 'text' },
    referred_name: { type: 'text', notNull: true },
    referred_email: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'lead' },
    revenue_amount: { type: 'numeric(18,2)', notNull: true, default: 0 },
    currency: { type: 'char(3)', notNull: true },
    converted_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createTable('affiliate_commissions', {
    commission_id: { type: 'uuid', primaryKey: true },
    organization_id: {
      type: 'uuid',
      notNull: true,
      references: 'organizations',
      onDelete: 'RESTRICT',
    },
    referral_id: {
      type: 'uuid',
      notNull: true,
      references: 'affiliate_referrals',
      onDelete: 'RESTRICT',
    },
    rule_id: {
      type: 'uuid',
      notNull: true,
      references: 'affiliate_commission_rules',
      onDelete: 'RESTRICT',
    },
    amount: { type: 'numeric(18,2)', notNull: true },
    currency: { type: 'char(3)', notNull: true },
    status: { type: 'text', notNull: true, default: 'pending' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.sql(
    "ALTER TABLE affiliate_partners ADD CONSTRAINT affiliate_partner_status_check CHECK (status IN ('pending','active','paused','archived'))",
  );
  pgm.sql(
    "ALTER TABLE affiliate_links ADD CONSTRAINT affiliate_link_status_check CHECK (status IN ('active','paused'))",
  );
  pgm.sql(
    "ALTER TABLE affiliate_commission_rules ADD CONSTRAINT affiliate_rule_model_check CHECK (model IN ('fixed','percentage'))",
  );
  pgm.sql(
    "ALTER TABLE affiliate_commission_rules ADD CONSTRAINT affiliate_rule_value_check CHECK (value > 0 AND (model = 'fixed' OR value <= 100))",
  );
  pgm.sql(
    "ALTER TABLE affiliate_referrals ADD CONSTRAINT affiliate_referral_status_check CHECK (status IN ('lead','converted','rejected'))",
  );
  pgm.sql(
    'ALTER TABLE affiliate_referrals ADD CONSTRAINT affiliate_referral_revenue_check CHECK (revenue_amount >= 0)',
  );
  pgm.sql(
    "ALTER TABLE affiliate_commissions ADD CONSTRAINT affiliate_commission_status_check CHECK (status IN ('pending','approved','rejected','paid'))",
  );
  pgm.createIndex('affiliate_partners', ['organization_id', 'code'], { unique: true });
  pgm.createIndex('affiliate_partners', ['organization_id', 'status']);
  pgm.createIndex('affiliate_links', ['organization_id', 'code'], { unique: true });
  pgm.createIndex('affiliate_links', ['organization_id', 'partner_id']);
  pgm.createIndex('affiliate_commission_rules', ['organization_id', 'active']);
  pgm.createIndex('affiliate_referrals', ['organization_id', 'status', 'created_at']);
  pgm.createIndex('affiliate_referrals', ['organization_id', 'external_reference'], {
    unique: true,
    where: 'external_reference IS NOT NULL',
  });
  pgm.createIndex('affiliate_commissions', ['organization_id', 'status', 'created_at']);
  pgm.createIndex('affiliate_commissions', ['organization_id', 'referral_id'], { unique: true });
  for (const table of [
    'affiliate_partners',
    'affiliate_links',
    'affiliate_commission_rules',
    'affiliate_referrals',
    'affiliate_commissions',
  ]) {
    pgm.sql(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    pgm.sql(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    pgm.sql(
      `CREATE POLICY ${table}_tenant_select ON ${table} FOR SELECT USING (current_setting('app.platform_access', true) = 'false' AND organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)`,
    );
    pgm.sql(
      `CREATE POLICY ${table}_tenant_insert ON ${table} FOR INSERT WITH CHECK (current_setting('app.platform_access', true) = 'false' AND organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)`,
    );
    pgm.sql(
      `CREATE POLICY ${table}_tenant_update ON ${table} FOR UPDATE USING (current_setting('app.platform_access', true) = 'false' AND organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid) WITH CHECK (current_setting('app.platform_access', true) = 'false' AND organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)`,
    );
  }
};

exports.down = (pgm) => {
  for (const table of [
    'affiliate_commissions',
    'affiliate_referrals',
    'affiliate_commission_rules',
    'affiliate_links',
    'affiliate_partners',
  ])
    pgm.dropTable(table, { ifExists: true, cascade: true });
};
