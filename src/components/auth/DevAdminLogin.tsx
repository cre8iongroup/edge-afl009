'use client';

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/firebase/provider";

const DevAdminLogin = () => {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const handleAdminLogin = async () => {
    if (!auth) {
      console.error("DevAdminLogin: Auth instance not available.");
      setError("Auth instance not available");
      return;
    }

    setLoading(true);
    setError(null);
    console.log("DevAdminLogin: Attempting admin login...");

    try {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

      console.log("DevAdminLogin: Using email:", adminEmail);

      if (!adminEmail || !adminPassword) {
        console.error("DevAdminLogin: Admin credentials not found in .env.local.");
        throw new Error("Admin credentials are not configured in .env.local");
      }

      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log("DevAdminLogin: Admin login successful.");

    } catch (err) {
      console.error("DevAdminLogin: Login failed.", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      console.log("DevAdminLogin: Resetting loading state.");
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: "10px", right: "10px", zIndex: 9999 }}>
      <button
        onClick={handleAdminLogin}
        disabled={loading || !auth}
        style={{
          padding: "8px 12px",
          backgroundColor: "#FFC107",
          color: "black",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        {loading ? "Logging in..." : "Log In as Admin (Dev Only)"}
      </button>
      {error && <p style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{error}</p>}
    </div>
  );
};

export default DevAdminLogin;
