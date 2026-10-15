exports.up = (pgm) => {
  for (const table of [
    'affiliate_partners',
    'affiliate_links',
    'affiliate_commission_rules',
    'affiliate_referrals',
    'affiliate_commissions',
  ]) {
    pgm.sql(`GRANT SELECT, INSERT, UPDATE ON ${table} TO business_os_app`);
    pgm.sql(`REVOKE DELETE ON ${table} FROM business_os_app`);
  }
};

exports.down = (pgm) => {
  for (const table of [
    'affiliate_partners',
    'affiliate_links',
    'affiliate_commission_rules',
    'affiliate_referrals',
    'affiliate_commissions',
  ])
    pgm.sql(`REVOKE SELECT, INSERT, UPDATE ON ${table} FROM business_os_app`);
};
