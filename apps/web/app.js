/* global document, fetch, FormData, URLSearchParams, window */
const API = '';
let csrfToken;
let session;
let affiliate = { partners: [], links: [], rules: [], referrals: [], commissions: [] };
const $ = (id) => document.getElementById(id);
const money = (value, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value ?? 0));
function setStatus(message, kind = '') {
  const el = $('status');
  el.textContent = message;
  el.className = `status ${kind}`;
}
async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.message ?? 'Request failed');
    error.code = body.error?.code;
    error.status = response.status;
    throw error;
  }
  return body;
}
function showApp() {
  $('login').hidden = true;
  $('app-shell').hidden = false;
  $('logout').hidden = false;
}
function showLogin() {
  $('login').hidden = false;
  $('app-shell').hidden = true;
  $('logout').hidden = true;
}
async function loadProviders() {
  try {
    const providers = await request('/api/v1/auth/providers');
    $('google-login-button').hidden = !providers.google;
    $('login-button').hidden = !providers.development;
    $('login-copy').textContent = providers.google
      ? 'Use your Google Workspace identity to access your organization.'
      : providers.development
        ? 'Use the deterministic local identity fixture to explore the internal workspace.'
        : 'No authentication provider is configured for this environment.';
  } catch (error) {
    setStatus(error.message, 'error');
  }
}
function renderOrganizations(organizations, currentId) {
  const select = $('organization-select');
  select.replaceChildren(
    ...organizations.map((org) => {
      const option = document.createElement('option');
      option.value = org.id;
      option.textContent = `${org.name} · ${org.role}`;
      option.selected = org.id === currentId;
      return option;
    }),
  );
}
function renderHome(data) {
  $('organization-name').textContent = data.organization.name;
  $('viewer-summary').textContent = `${data.viewer.displayName} · ${data.viewer.role}`;
  $('item-count').textContent =
    `${data.workspace.itemCount} item${data.workspace.itemCount === 1 ? '' : 's'}`;
  const items = $('items');
  if (!data.workspace.items.length) {
    items.innerHTML = '<div class="empty">Your workspace is ready for its first item.</div>';
    return;
  }
  items.replaceChildren(
    ...data.workspace.items.map((item) => {
      const el = document.createElement('div');
      el.className = 'item';
      el.textContent = item.title;
      return el;
    }),
  );
}
function setPage(page) {
  const home = page === 'home';
  $('home').hidden = !home;
  $('affiliate').hidden = home;
  $('home-nav').classList.toggle('active', home);
  $('affiliate-nav').classList.toggle('active', !home);
  if (!home) void loadAffiliate();
}
function cell(row, value, className = '') {
  const el = document.createElement('td');
  el.textContent = value;
  if (className) el.className = className;
  row.append(el);
}
function emptyTable(target, message, colspan = 3) {
  const table = document.createElement('table');
  table.innerHTML = `<tbody><tr><td class="empty" colspan="${colspan}"></td></tr></tbody>`;
  table.querySelector('.empty').textContent = message;
  $(target).replaceChildren(table);
}
function table(target, headers, rows) {
  if (!rows.length) return emptyTable(target, 'Nothing here yet.', headers.length);
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach((header) => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.append(th);
  });
  head.append(headerRow);
  table.append(head);
  const body = document.createElement('tbody');
  rows.forEach((values) => {
    const row = document.createElement('tr');
    values.forEach((value) => cell(row, value));
    body.append(row);
  });
  table.append(body);
  $(target).replaceChildren(table);
}
function options(target, items, label, empty = 'No records') {
  const select = $(target);
  select.replaceChildren();
  if (!items.length) {
    const option = document.createElement('option');
    option.textContent = empty;
    option.disabled = true;
    option.selected = true;
    select.append(option);
    return;
  }
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = label(item);
    select.append(option);
  });
}
function renderAffiliate() {
  const { partners, links, rules, referrals, commissions } = affiliate;
  $('affiliate-role').textContent =
    `${session.organizations.find((org) => org.id === session.organizationId)?.role ?? 'member'} access`;
  $('partner-count').textContent = partners.length;
  $('referral-count').textContent = referrals.filter(
    (referral) => referral.status === 'lead',
  ).length;
  const pending = commissions.filter((commission) => commission.status === 'pending');
  $('pending-commission-count').textContent = pending.length;
  $('pending-commission-value').textContent = pending.length
    ? money(
        pending.reduce((sum, item) => sum + Number(item.amount), 0),
        pending[0].currency,
      )
    : '$0.00';
  const manager = ['owner', 'admin'].includes(
    session.organizations.find((org) => org.id === session.organizationId)?.role,
  );
  $('manager-tools').hidden = !manager;
  table(
    'partners-table',
    ['Partner', 'Code', 'Status'],
    partners.map((item) => [item.name, item.code, item.status]),
  );
  table(
    'rules-table',
    ['Rule', 'Model', 'Value'],
    rules.map((item) => [
      item.name,
      item.model,
      item.model === 'percentage' ? `${item.value}%` : money(item.value, item.currency),
    ]),
  );
  table(
    'referrals-table',
    ['Customer', 'Partner', 'Status', 'Revenue'],
    referrals.map((item) => [
      item.referredName,
      partners.find((partner) => partner.partnerId === item.partnerId)?.name ?? 'Unknown',
      item.status,
      money(item.revenueAmount, item.currency),
    ]),
  );
  table(
    'commissions-table',
    ['Referral', 'Amount', 'Currency', 'Status'],
    commissions.map((item) => [
      referrals.find((referral) => referral.referralId === item.referralId)?.referredName ??
        item.referralId.slice(0, 8),
      money(item.amount, item.currency),
      item.currency,
      item.status,
    ]),
  );
  options('link-partner', partners, (item) => item.name);
  options('referral-partner', partners, (item) => item.name);
  options(
    'referral-rule',
    rules.filter((item) => item.active),
    (item) =>
      `${item.name} · ${item.model === 'percentage' ? `${item.value}%` : money(item.value, item.currency)}`,
  );
  options('referral-link', links, (item) => item.code, 'No links');
  options(
    'conversion-referral',
    referrals.filter((item) => item.status === 'lead'),
    (item) => item.referredName,
  );
  options(
    'status-commission',
    commissions,
    (item) => `${money(item.amount, item.currency)} · ${item.status}`,
  );
}
async function loadAffiliate() {
  try {
    const [partners, links, rules, referrals, commissions] = await Promise.all(
      ['/partners', '/links', '/rules', '/referrals', '/commissions'].map((path) =>
        request(`/api/v1/crm/affiliates${path}`),
      ),
    );
    affiliate = {
      partners: partners.partners,
      links: links.links,
      rules: rules.rules,
      referrals: referrals.referrals,
      commissions: commissions.commissions,
    };
    renderAffiliate();
  } catch (error) {
    setStatus(error.message, 'error');
  }
}
async function loadSession() {
  try {
    session = await request('/api/v1/session');
    csrfToken = session.csrfToken;
    renderOrganizations(session.organizations, session.organizationId);
    renderHome(await request('/api/v1/home'));
    showApp();
    setPage('home');
  } catch (error) {
    if (error.status === 401 || error.status === 403) showLogin();
    else setStatus(error.message, 'error');
  }
}
async function submit(path, form, success) {
  const body = Object.fromEntries(new FormData(form));
  try {
    await request(path, { method: 'POST', body: JSON.stringify(body) });
    form.reset();
    setStatus(success, 'success');
    await loadAffiliate();
  } catch (error) {
    setStatus(error.message, 'error');
  }
}
$('login-button').addEventListener('click', async () => {
  try {
    setStatus('Signing in…');
    const result = await request('/api/v1/dev/login', {
      method: 'POST',
      body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000001' }),
    });
    csrfToken = result.csrfToken;
    await loadSession();
    setStatus('Signed in to local preview', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
});
$('google-login-button').addEventListener('click', () => {
  window.location.href = '/api/v1/auth/google/login';
});
$('home-nav').addEventListener('click', () => setPage('home'));
$('affiliate-nav').addEventListener('click', () => setPage('affiliate'));
$('organization-select').addEventListener('change', async (event) => {
  try {
    const result = await request('/api/v1/session/organization', {
      method: 'POST',
      body: JSON.stringify({ organizationId: event.target.value }),
    });
    csrfToken = result.csrfToken;
    await loadSession();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});
$('logout').addEventListener('click', async () => {
  try {
    await request('/api/v1/logout', { method: 'POST' });
    csrfToken = undefined;
    session = undefined;
    showLogin();
    setStatus('Signed out', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
});
$('partner-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void submit('/api/v1/crm/affiliates/partners', event.target, 'Partner added');
});
$('rule-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void submit('/api/v1/crm/affiliates/rules', event.target, 'Commission rule added');
});
$('link-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void submit('/api/v1/crm/affiliates/links', event.target, 'Referral link created');
});
$('referral-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void submit('/api/v1/crm/affiliates/referrals', event.target, 'Referral recorded');
});
$('conversion-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  try {
    await request(`/api/v1/crm/affiliates/referrals/${body.referralId}/convert`, {
      method: 'POST',
      body: JSON.stringify({ revenueAmount: body.revenueAmount }),
    });
    event.target.reset();
    setStatus('Referral converted and commission calculated', 'success');
    await loadAffiliate();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});
$('status-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  try {
    await request(`/api/v1/crm/affiliates/commissions/${body.commissionId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: body.status }),
    });
    setStatus('Commission status updated', 'success');
    await loadAffiliate();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});
document.querySelector('[data-refresh]').addEventListener('click', () => void loadAffiliate());
void loadProviders();
if (new URLSearchParams(window.location.search).has('auth_error'))
  setStatus('Sign-in was not completed. Contact your Business OS administrator.', 'error');
void loadSession();
