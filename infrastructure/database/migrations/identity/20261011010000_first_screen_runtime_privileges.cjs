exports.up = (pgm) => {
  pgm.sql('DROP POLICY IF EXISTS users_platform ON users');
  pgm.sql("CREATE POLICY users_platform_select ON users FOR SELECT USING (current_setting('app.platform_access', true) = 'true')");
  pgm.sql('DROP POLICY IF EXISTS external_identities_platform ON external_identities');
  pgm.sql("CREATE POLICY external_identities_platform_select ON external_identities FOR SELECT USING (current_setting('app.platform_access', true) = 'true')");
  pgm.sql('DROP POLICY IF EXISTS organizations_platform ON organizations');
  pgm.sql("CREATE POLICY organizations_platform_select ON organizations FOR SELECT USING (current_setting('app.platform_access', true) = 'true')");
  pgm.sql('DROP POLICY IF EXISTS sessions_platform ON sessions');
  pgm.sql("CREATE POLICY sessions_platform_select ON sessions FOR SELECT USING (current_setting('app.platform_access', true) = 'true')");
  pgm.sql("CREATE POLICY sessions_platform_insert ON sessions FOR INSERT WITH CHECK (current_setting('app.platform_access', true) = 'true')");
  pgm.sql("CREATE POLICY sessions_platform_update ON sessions FOR UPDATE USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true')");
  pgm.sql('DROP POLICY IF EXISTS memberships_platform_write ON organization_memberships');
};

exports.down = (pgm) => {
  pgm.sql('DROP POLICY IF EXISTS users_platform_select ON users');
  pgm.sql("CREATE POLICY users_platform ON users FOR ALL USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true')");
  pgm.sql('DROP POLICY IF EXISTS external_identities_platform_select ON external_identities');
  pgm.sql("CREATE POLICY external_identities_platform ON external_identities FOR ALL USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true')");
  pgm.sql('DROP POLICY IF EXISTS organizations_platform_select ON organizations');
  pgm.sql("CREATE POLICY organizations_platform ON organizations FOR ALL USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true')");
  pgm.sql('DROP POLICY IF EXISTS sessions_platform_select ON sessions');
  pgm.sql('DROP POLICY IF EXISTS sessions_platform_insert ON sessions');
  pgm.sql('DROP POLICY IF EXISTS sessions_platform_update ON sessions');
  pgm.sql("CREATE POLICY sessions_platform ON sessions FOR ALL USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true')");
  pgm.sql("CREATE POLICY memberships_platform_write ON organization_memberships FOR ALL USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true')");
};
