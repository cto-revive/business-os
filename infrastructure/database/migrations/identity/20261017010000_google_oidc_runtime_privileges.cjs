exports.up = (pgm) => {
  pgm.sql('GRANT SELECT ON users TO business_os_app');
  pgm.sql('GRANT INSERT, UPDATE ON users TO business_os_app');
  pgm.sql('GRANT SELECT, INSERT ON external_identities TO business_os_app');
  pgm.sql('GRANT SELECT, INSERT, DELETE ON oidc_login_states TO business_os_app');
};

exports.down = (pgm) => {
  pgm.sql('REVOKE SELECT, INSERT, UPDATE ON users FROM business_os_app');
  pgm.sql('REVOKE SELECT, INSERT ON external_identities FROM business_os_app');
  pgm.sql('REVOKE SELECT, INSERT, DELETE ON oidc_login_states FROM business_os_app');
};
