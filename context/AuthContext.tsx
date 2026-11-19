"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { UserProfile } from "@/lib/types";
import {
  subscribeToAuth,
  logIn,
  logOut,
  signUp,
  loginAsDemoUser,
  getMockStoredUser,
} from "@/lib/services/authService";
import { AppError } from "@/lib/types";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: UserProfile["role"];
    shopName?: string;
    centreName?: string;
  }) => Promise<UserProfile>;
  loginDemo: (email: string) => UserProfile | null;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Eagerly initialize from local storage to prevent any redirect race condition
  const [user, setUser] = useState<UserProfile | null>(() => getMockStoredUser());
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !getMockStoredUser();
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string): Promise<UserProfile> {
    setError(null);
    try {
      const profile = await logIn(email, password);
      setUser(profile);
      setLoading(false);
      return profile;
    } catch (e) {
      const msg = e instanceof AppError ? e.userMessage : "An unexpected error occurred.";
      setError(msg);
      throw e;
    }
  }

  async function logout() {
    setUser(null);
    await logOut();
  }

  async function register(data: {
    name: string;
    email: string;
    password: string;
    role: UserProfile["role"];
    shopName?: string;
    centreName?: string;
  }): Promise<UserProfile> {
    setError(null);
    try {
      const profile = await signUp(data);
      setUser(profile);
      setLoading(false);
      return profile;
    } catch (e) {
      const msg = e instanceof AppError ? e.userMessage : "An unexpected error occurred.";
      setError(msg);
      throw e;
    }
  }

  function loginDemo(email: string): UserProfile | null {
    setError(null);
    const profile = loginAsDemoUser(email);
    if (profile) {
      setUser(profile);
      setLoading(false);
    }
    return profile;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        loginDemo,
        error,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
