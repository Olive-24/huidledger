"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { DEMO_USERS } from "@/lib/constants";
import { Spinner } from "@/components/Spinner";

export default function LoginPage() {
  const { login, loginDemo } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const profile = await login(email.trim(), password);
      const target =
        profile.role === "jeweller"
          ? "/dashboard/jeweller"
          : profile.role === "operator"
          ? "/dashboard/operator"
          : "/dashboard/auditor";
      window.location.href = target;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      setError(msg);
      setLoading(false);
    }
  }

  function demoLogin(d: (typeof DEMO_USERS)[number]) {
    setError(null);
    setLoading(true);
    try {
      const demo = loginDemo(d.email);
      if (demo) {
        const target =
          d.role === "jeweller"
            ? "/dashboard/jeweller"
            : d.role === "operator"
            ? "/dashboard/operator"
            : "/dashboard/auditor";
        window.location.href = target;
        return;
      }
      setError("Demo sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-1">
            <span className="text-2xl font-bold text-[#C9A227]">HUID</span>
            <span className="text-2xl font-bold text-[#F5F0E8]">Ledger</span>
          </Link>
          <p className="mt-2 text-sm text-[#A09880]">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-6 space-y-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#A09880] mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2.5 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#A09880] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2.5 pr-10 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B6355] hover:text-[#A09880]"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#C9A227] py-2.5 font-semibold text-sm text-black transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Spinner size="sm" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <p className="text-center text-sm text-[#6B6355]">
            No account?{" "}
            <Link href="/signup" className="text-[#C9A227] hover:underline">
              Sign up
            </Link>
          </p>
        </form>

        {/* Demo login buttons */}
        <div className="mt-6 rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-4">
          <p className="text-xs text-[#6B6355] mb-3 text-center">
            🎓 Instant Demo Logins (Click to explore)
          </p>
          <div className="space-y-2">
            {DEMO_USERS.map((d) => (
              <button
                type="button"
                key={d.email}
                onClick={() => demoLogin(d)}
                disabled={loading}
                className="w-full rounded-lg border border-[#3A3A3A] px-3 py-2 text-xs text-left text-[#A09880] hover:border-[#C9A227]/40 hover:text-[#F5F0E8] transition-colors disabled:opacity-50"
              >
                <span className="text-[#C9A227] font-mono mr-2">→</span>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
