'use server';

export async function getDevCredentials(role: 'admin' | 'user' | 'client') {
  // Only allow in development or when explicitly enabled for staging
  const isDevEnvironment = process.env.NODE_ENV === 'development';
  const isStagingEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true';
  if (!isDevEnvironment && !isStagingEnabled) return null;

  const credentials = {
    admin: {
      email: process.env.DEV_ADMIN_EMAIL,
      password: process.env.DEV_ADMIN_PASSWORD,
    },
    user: {
      email: process.env.DEV_USER_EMAIL,
      password: process.env.DEV_USER_PASSWORD,
    },
    client: {
      email: process.env.DEV_CLIENT_EMAIL,
      password: process.env.DEV_CLIENT_PASSWORD,
    },
  };

  return credentials[role];
}
