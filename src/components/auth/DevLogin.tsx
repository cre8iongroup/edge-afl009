'use client';

import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { getDevCredentials } from "@/lib/actions/dev-auth";

const DevLogin = () => {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const handleLogin = async (role: 'admin' | 'user' | 'client') => {
    if (!auth || !firestore) {
      setError("Firebase services not available");
      return;
    }

    setLoading(role);
    setError(null);
    console.log(`DevLogin: Fetching ${role} credentials...`);

    try {
      const credentials = await getDevCredentials(role);

      if (!credentials || !credentials.email || !credentials.password) {
        throw new Error(`${role} credentials are not found in .env.local on the server.`);
      }

      console.log(`DevLogin: Attempting ${role} login...`);
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      const uid = userCredential.user.uid;

      console.log(`DevLogin: ${role} login successful. Syncing Firestore role...`);

      // Automatically create/update the Firestore document for this test user
      const userRef = doc(firestore, 'users', uid);
      const userSnap = await getDoc(userRef);

      const targetRole = role === 'admin' ? 'admin' : role === 'client' ? 'client' : 'regular';
      const displayName = role === 'admin' ? 'Dev Admin' : role === 'client' ? 'Dev Client' : 'Dev User';

      if (userSnap.exists()) {
        await updateDoc(userRef, { role: targetRole });
      } else {
        await setDoc(userRef, {
          email: credentials.email,
          name: displayName,
          role: targetRole,
          avatar: '',
        });
      }

      console.log(`DevLogin: Firestore role synced to ${targetRole}.`);

    } catch (err) {
      console.error(`DevLogin: ${role} login failed.`, err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      alignItems: "flex-end"
    }}>
      {user ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
          <div style={{ backgroundColor: "#1e1e1e", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", color: "#aaa" }}>
            Logged in as: {user.email}
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            Clear Dev Session
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={() => handleLogin('user')}
            disabled={!!loading}
            style={{
              padding: "8px 14px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              opacity: loading && loading !== 'user' ? 0.5 : 1,
            }}
          >
            {loading === 'user' ? "Logging in..." : "Log In as User (Dev)"}
          </button>
          <button
            onClick={() => handleLogin('client')}
            disabled={!!loading}
            style={{
              padding: "8px 14px",
              backgroundColor: "#9C27B0",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              opacity: loading && loading !== 'client' ? 0.5 : 1,
            }}
          >
            {loading === 'client' ? "Logging in..." : "Log In as Client (Dev)"}
          </button>
          <button
            onClick={() => handleLogin('admin')}
            disabled={!!loading}
            style={{
              padding: "8px 14px",
              backgroundColor: "#FFC107",
              color: "black",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              opacity: loading && loading !== 'admin' ? 0.5 : 1,
            }}
          >
            {loading === 'admin' ? "Logging in..." : "Log In as Admin (Dev)"}
          </button>
        </div>
      )}
      {error && (
        <div style={{
          backgroundColor: "#fff",
          padding: "8px 12px",
          borderRadius: "4px",
          border: "1px solid #f44336",
          color: "#f44336",
          fontSize: "12px",
          maxWidth: "250px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default DevLogin;
