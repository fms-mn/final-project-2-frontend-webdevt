// The site remembers, in this browser only, that someone was signed in. When the session then
// ends (it lasts a couple of hours), that is the difference between "you were signed out" and
// "you have not signed in yet", so the sign-in page can say why. It holds a flag, never a secret.
const KEY = 'filme.signedIn';

export const rememberSignedIn = () => { try { localStorage.setItem(KEY, '1'); } catch { /* storage is blocked */ } };
export const forgetSignedIn = () => { try { localStorage.removeItem(KEY); } catch { /* storage is blocked */ } };
export const wasSignedIn = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

// What a person types into the code box: digits only, six at most ("123 456" and "12-34-56" work).
export const cleanCode = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 6);
export const codeComplete = (value) => cleanCode(value).length === 6;
