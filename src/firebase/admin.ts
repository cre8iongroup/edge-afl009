import * as admin from 'firebase-admin';

// --- README ---
// This file initializes the Firebase Admin SDK for server-side operations.
// It requires a service account key, which is sensitive and must be stored securely.
//
// To complete the setup:
//
// 1. Go to your Firebase project settings in the Firebase Console.
// 2. Navigate to the "Service accounts" tab.
// 3. Click "Generate new private key". This will download a JSON file.
// 4. IMPORTANT: Do NOT commit this file to your repository.
// 5. Copy the contents of the downloaded JSON file.
// 6. Create or open the `.env` file in the root of your project.
// 7. Add a new environment variable named `FIREBASE_SERVICE_ACCOUNT_KEY` and
//    paste the JSON content as its value, ensuring it's enclosed in quotes, like this:
//    FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", ...}'
//
// The code below will automatically use this environment variable to initialize the Admin SDK.

let app: admin.app.App | undefined;

try {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountString) {
    throw new Error("The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. The Admin SDK cannot be initialized.");
  }
  
  const serviceAccount = JSON.parse(serviceAccountString);

  if (admin.apps.length === 0) {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    app = admin.app();
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", (error as Error).message);
  // The `app` variable will remain undefined, and subsequent operations will fail gracefully.
}

export const adminApp = app;
