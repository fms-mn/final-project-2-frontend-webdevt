const SESSION_KEY = 'filme_preview_user';

const demoUser = {
  id: 'demo-user',
  name: 'Preview User',
  email: 'demo@filme.local',
  phone: '',
  role: 'user',
  isDemo: true,
};

const demoAdmin = {
  id: 'demo-admin',
  name: 'Cinema Admin',
  email: 'admin@filme.local',
  phone: '',
  role: 'admin',
  isDemo: true,
};

export function getDemoUser() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (!saved || typeof saved !== 'object') return null;
    const account = saved.previewMode === 'admin' ? demoAdmin : demoUser;
    return {
      ...account,
      name: typeof saved.name === 'string' && saved.name.trim() ? saved.name : account.name,
      phone: typeof saved.phone === 'string' ? saved.phone : '',
    };
  } catch {
    return null;
  }
}

export function startDemoSession() {
  const user = demoUser;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, phone: user.phone }));
  return user;
}

export function startDemoAdminSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    name: demoAdmin.name,
    phone: demoAdmin.phone,
    previewMode: 'admin',
  }));
  return demoAdmin;
}

export function updateDemoUser(changes) {
  const current = getDemoUser();
  if (!current) throw new Error('Sign in as the demo user again');
  const name = changes.name.trim();
  if (!name) throw new Error('Name is required');
  const user = { ...current, name, phone: changes.phone.trim() };
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    name: user.name,
    phone: user.phone,
    ...(user.role === 'admin' ? { previewMode: 'admin' } : {}),
  }));
  return user;
}

export function endDemoSession() {
  localStorage.removeItem(SESSION_KEY);
}
