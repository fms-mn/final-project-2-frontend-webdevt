// Frontend-only demo identity. localStorage and role checks provide NO security.
// Replace this module with Express API calls and server authorization later.
const USERS_KEY = 'filme_demo_users';
const SESSION_KEY = 'filme_demo_session';
export const DEMO_ACCOUNTS = [
  { id: 'demo-customer', name: 'Alex Rivera', email: 'customer@filme.example', role: 'customer', password: 'nigga123' },
  { id: 'demo-admin', name: 'Morgan Santos', email: 'admin@filme.example', role: 'admin', password: 'nigga123' },
];
function readUsers() {
  try { const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); return Array.isArray(users) ? users : []; }
  catch { return []; }
}
function publicUser({ id, name, email, role, active = true }) { return { id, name, email, role: role === 'user' ? 'customer' : role, active }; }
async function matchesLegacyPassword(password, user) {
  if (!user.salt || !user.passwordHash) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${user.salt}:${password}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('') === user.passwordHash;
}
export function listDemoUsers() { return [...DEMO_ACCOUNTS, ...readUsers()].map(publicUser); }
export function getCurrentUser() {
  try { return listDemoUsers().find((user) => user.id === localStorage.getItem(SESSION_KEY) && user.active) || null; }
  catch { return null; }
}
export async function registerDemoUser(name, email, password) {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedName || !normalizedEmail || password.length < 6) throw new Error('Enter a name, email, and password of at least 6 characters');
  if (listDemoUsers().some((user) => user.email === normalizedEmail)) throw new Error('Email already registered in this browser');
  const user = { id: crypto.randomUUID(), name: normalizedName, email: normalizedEmail, role: 'customer', password, active: true };
  localStorage.setItem(USERS_KEY, JSON.stringify([...readUsers(), user]));
  localStorage.setItem(SESSION_KEY, user.id);
  return publicUser(user);
}
export async function loginDemoUser(email, password) {
  const user = [...DEMO_ACCOUNTS, ...readUsers()].find((item) => item.email === email.trim().toLowerCase());
  if (!user || user.active === false || (user.password !== password && !await matchesLegacyPassword(password, user))) throw new Error('Invalid credentials or inactive account');
  localStorage.setItem(SESSION_KEY, user.id);
  return publicUser(user);
}
export function setDemoUserActive(id, active) {
  if (DEMO_ACCOUNTS.some((user) => user.id === id)) throw new Error('Demo accounts cannot be disabled');
  const users = readUsers();
  const user = users.find((item) => item.id === id);
  if (!user) throw new Error('User not found');
  user.active = active;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
export function saveDemoUser(draft) {
  if (DEMO_ACCOUNTS.some((user) => user.id === draft.id)) throw new Error('Demo accounts cannot be edited');
  const name = draft.name?.trim();
  const email = draft.email?.trim().toLowerCase();
  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a name and valid email');
  if (!['customer', 'admin'].includes(draft.role)) throw new Error('Choose a role');
  const users = readUsers();
  if (listDemoUsers().some((user) => user.email === email && user.id !== draft.id)) throw new Error('Email already registered in this browser');
  const index = users.findIndex((user) => user.id === draft.id);
  if (index < 0 && (!draft.password || draft.password.length < 6)) throw new Error('Enter a password of at least 6 characters');
  const existing = users[index];
  const entry = { ...existing, ...draft, id: draft.id || crypto.randomUUID(), name, email, active: existing?.active ?? true };
  if (index < 0) users.push(entry); else users[index] = entry;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return publicUser(entry);
}
export function logoutDemoUser() { localStorage.removeItem(SESSION_KEY); }
