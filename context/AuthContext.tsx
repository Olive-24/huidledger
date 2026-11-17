"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { UserProfile } from "@/lib/types";
import { subscribeToAuth, logIn, logOut, signUp } from "@/lib/services/authService";
import { AppError } from "@/lib/types";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: UserProfile["role"];
    shopName?: string;
    centreName?: string;
  }) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string) {
    setError(null);
    try {
      await logIn(email, password);
    } catch (e) {
      const msg = e instanceof AppError ? e.userMessage : "An unexpected error occurred.";
      setError(msg);
      throw e;
    }
  }

  async function logout() {
    await logOut();
  }

  async function register(data: {
    name: string;
    email: string;
    password: string;
    role: UserProfile["role"];
    shopName?: string;
    centreName?: string;
  }) {
    setError(null);
    try {
      await signUp(data);
    } catch (e) {
      const msg = e instanceof AppError ? e.userMessage : "An unexpected error occurred.";
      setError(msg);
      throw e;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, error, clearError: () => setError(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
