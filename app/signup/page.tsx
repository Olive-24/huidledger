"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";
import { Spinner } from "@/components/Spinner";

const ROLES: Role[] = ["jeweller", "operator", "auditor"];

function passwordStrength(pw: string): { label: string; color: string; pct: number } {
  const len = pw.length;
  if (len === 0) return { label: "", color: "", pct: 0 };
  if (len < 6) return { label: "Too short", color: "bg-red-500", pct: 20 };
  if (len < 8) return { label: "Weak", color: "bg-orange-500", pct: 40 };
  if (len < 10 && !/[0-9]/.test(pw)) return { label: "Fair", color: "bg-amber-500", pct: 60 };
  if (len >= 10 && /[0-9]/.test(pw) && /[A-Z]/.test(pw)) return { label: "Strong", color: "bg-green-500", pct: 100 };
  return { label: "Good", color: "bg-blue-500", pct: 80 };
}

export default function SignupPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<Role>("jeweller");
  const [shopName, setShopName] = useState("");
  const [centreName, setCentreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (role === "jeweller" && !shopName.trim()) {
      setError("Shop name is required for jewellers.");
      return;
    }
    if (role === "operator" && !centreName.trim()) {
      setError("Centre name is required for AHC operators.");
      return;
    }

    setLoading(true);
    try {
      const profile = await register({ name, email, password, role, shopName: shopName || undefined, centreName: centreName || undefined });
      const target =
        role === "jeweller"
          ? "/dashboard/jeweller"
          : role === "operator"
            ? "/dashboard/operator"
            : "/dashboard/auditor";
      window.location.href = target;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-1">
            <span className="text-2xl font-bold text-[#C9A227]">HUID</span>
            <span className="text-2xl font-bold text-[#F5F0E8]">Ledger</span>
          </Link>
          <p className="mt-2 text-sm text-[#A09880]">Create your account</p>
        </div>

        {/* NOTE: Letting users self-select their role is only for this college demo.
            In production, roles would be assigned by an admin through a secure backend. */}
        <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-6 space-y-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#A09880] mb-1">Full name</label>
            <input
              id="name" type="text" required autoComplete="name"
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2.5 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
              placeholder="Rajesh Kumar"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#A09880] mb-1">Email address</label>
            <input
              id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2.5 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#A09880] mb-1">Password</label>
            <div className="relative">
              <input
                id="password" type={showPw ? "text" : "password"} required minLength={6}
                autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2.5 pr-10 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
                placeholder="Min. 6 characters"
              />
              <button
                type="button" onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B6355] hover:text-[#A09880]"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            {/* Strength bar */}
            {password && (
              <div className="mt-1.5">
                <div className="h-1 w-full rounded-full bg-[#3A3A3A] overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                </div>
                <p className="text-xs text-[#6B6355] mt-0.5">{strength.label}</p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-[#A09880] mb-1">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2.5 text-sm text-[#F5F0E8] focus:border-[#C9A227] focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[#6B6355]">
              🎓 Self-selection is for demo purposes only. Production would require admin assignment.
            </p>
          </div>

          {role === "jeweller" && (
            <div>
              <label htmlFor="shopName" className="block text-sm font-medium text-[#A09880] mb-1">Shop name</label>
              <input
                id="shopName" type="text" required
                value={shopName} onChange={(e) => setShopName(e.target.value)}
                className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2.5 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
                placeholder="e.g. Rajesh Jewellers, Karol Bagh"
              />
            </div>
          )}

          {role === "operator" && (
            <div>
              <label htmlFor="centreName" className="block text-sm font-medium text-[#A09880] mb-1">AHC Centre name</label>
              <input
                id="centreName" type="text" required
                value={centreName} onChange={(e) => setCentreName(e.target.value)}
                className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2.5 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
                placeholder="e.g. Delhi AHC"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#C9A227] py-2.5 font-semibold text-sm text-black transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Spinner size="sm" />}
            {loading ? "Creating account…" : "Create Account"}
          </button>

          <p className="text-center text-sm text-[#6B6355]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#C9A227] hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
