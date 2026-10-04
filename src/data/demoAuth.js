const USERS_KEY = 'filme_demo_users';
const SESSION_KEY = 'filme_demo_session';

function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function publicUser({ id, name, email, role }) {
  return { id, name, email, role };
}

async function hashPassword(password, salt) {
  const input = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getCurrentUser() {
  try {
    const id = localStorage.getItem(SESSION_KEY);
    const user = readUsers().find((candidate) => candidate.id === id);
    return user ? publicUser(user) : null;
  } catch {
    return null;
  }
}

export async function registerDemoUser(name, email, password) {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedName || !normalizedEmail || password.length < 6) {
    throw new Error('Enter a name, email, and password of at least 6 characters');
  }

  const users = readUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error('Email already registered in this browser');
  }

  const salt = crypto.randomUUID();
  const user = {
    id: crypto.randomUUID(),
    name: normalizedName,
    email: normalizedEmail,
    role: 'user',
    salt,
    passwordHash: await hashPassword(password, salt),
  };
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  localStorage.setItem(SESSION_KEY, user.id);
  return publicUser(user);
}

export async function loginDemoUser(email, password) {
  const user = readUsers().find((candidate) => candidate.email === email.trim().toLowerCase());
  if (!user || await hashPassword(password, user.salt) !== user.passwordHash) {
    throw new Error('Invalid credentials');
  }
  localStorage.setItem(SESSION_KEY, user.id);
  return publicUser(user);
}

export function logoutDemoUser() {
  localStorage.removeItem(SESSION_KEY);
}
