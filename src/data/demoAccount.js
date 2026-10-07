const SESSION_KEY = 'filme_preview_user';

const demoUsers = {
  user: {
    id: 'demo-user',
    name: 'Preview User',
    email: 'demo@filme.local',
    phone: '',
    role: 'user',
    isDemo: true,
  },
  admin: {
    id: 'demo-admin',
    name: 'Preview Admin',
    email: 'admin@filme.local',
    phone: '',
    role: 'admin',
    isDemo: true,
  },
};

export function getDemoUser() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (!saved || typeof saved !== 'object') return null;
    const demoUser = demoUsers[saved.account] || demoUsers.user;
    return {
      ...demoUser,
      name: typeof saved.name === 'string' && saved.name.trim() ? saved.name : demoUser.name,
      phone: typeof saved.phone === 'string' ? saved.phone : '',
    };
  } catch {
    return null;
  }
}

export function startDemoSession(role = 'user') {
  const user = demoUsers[role];
  if (!user) throw new Error('Unknown demo account');
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, phone: user.phone, account: user.role }));
  return user;
}

export function updateDemoUser(changes) {
  const current = getDemoUser();
  if (!current) throw new Error('Sign in as the demo user again');
  const name = changes.name.trim();
  if (!name) throw new Error('Name is required');
  const user = { ...current, name, phone: changes.phone.trim() };
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, phone: user.phone, account: user.role }));
  return user;
}

export function endDemoSession() {
  localStorage.removeItem(SESSION_KEY);
}
