// Mock for next-auth — ESM package that Jest CJS can't parse.
// Client tests don't need real auth; this stub prevents parse errors
// when components transitively import server actions → auth.

// Default export works for both NextAuth() and provider imports
// (next-auth/providers/google, /github, /credentials all map here).
function stub() {
  return { auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn(), handlers: {} };
}
export default stub;
export const auth = jest.fn();
export const signIn = jest.fn();
export const signOut = jest.fn();
export const handlers = {};
