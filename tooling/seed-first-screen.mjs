import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/business_os',
});
await client.connect();
await client.query(
  `insert into users (user_id, display_name, state) values ('00000000-0000-0000-0000-000000000001', 'Alice Morgan', 'active') on conflict (user_id) do update set display_name = excluded.display_name, state = excluded.state`,
);
await client.query(
  `insert into users (user_id, display_name, state) values ('00000000-0000-0000-0000-000000000002', 'Bob Rivera', 'active') on conflict (user_id) do update set display_name = excluded.display_name, state = excluded.state`,
);
await client.query(
  `insert into organizations (organization_id, name) values ('10000000-0000-0000-0000-000000000001', 'Acme Operations') on conflict (organization_id) do update set name = excluded.name`,
);
await client.query(
  `insert into organizations (organization_id, name) values ('10000000-0000-0000-0000-000000000002', 'Northstar Labs') on conflict (organization_id) do update set name = excluded.name`,
);
await client.query(
  `insert into organization_memberships (user_id, organization_id, role, state, authorization_epoch) values ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', 'active', 1), ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'member', 'active', 1), ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'member', 'suspended', 2) on conflict (user_id, organization_id) do update set role = excluded.role, state = excluded.state, authorization_epoch = excluded.authorization_epoch`,
);
await client.query(
  `insert into workspace_items (item_id, organization_id, title) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Welcome to Business OS'), ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Review your workspace'), ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Northstar workspace starter') on conflict (item_id) do update set title = excluded.title, organization_id = excluded.organization_id`,
);
await client.end();
console.log('seeded first-screen development identities and workspace items');
