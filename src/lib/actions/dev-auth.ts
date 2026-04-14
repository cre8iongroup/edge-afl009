'use server';

export async function getDevCredentials(role: 'admin' | 'user') {
  // Triple check: only allow this in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const credentials = {
    admin: {
      email: process.env.DEV_ADMIN_EMAIL,
      password: process.env.DEV_ADMIN_PASSWORD,
    },
    user: {
      email: process.env.DEV_USER_EMAIL,
      password: process.env.DEV_USER_PASSWORD,
    }
  };

  return credentials[role];
}
