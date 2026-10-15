exports.up = (pgm) => {
  pgm.addColumn('users', {
    email: { type: 'text' },
  });
  pgm.createIndex('users', ['email'], { unique: true, where: 'email IS NOT NULL' });
  pgm.createTable('oidc_login_states', {
    state: { type: 'text', primaryKey: true },
    code_verifier: { type: 'text', notNull: true },
    nonce: { type: 'text', notNull: true },
    redirect_uri: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.sql('ALTER TABLE oidc_login_states ENABLE ROW LEVEL SECURITY');
  pgm.sql('ALTER TABLE oidc_login_states FORCE ROW LEVEL SECURITY');
  pgm.sql(
    "CREATE POLICY oidc_login_states_platform ON oidc_login_states FOR ALL USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true')",
  );
};

exports.down = (pgm) => {
  pgm.dropTable('oidc_login_states', { ifExists: true, cascade: true });
  pgm.dropIndex('users', ['email'], { ifExists: true });
  pgm.dropColumn('users', 'email', { ifExists: true });
};
