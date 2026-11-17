"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/lib/constants";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Don't show navbar on public pages
  const isPublic = pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname === "/verify";
  if (isPublic) return null;

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#3A3A3A] bg-[#141414]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <span className="text-xl font-bold text-[#C9A227] tracking-tight">HUID</span>
          <span className="text-xl font-bold text-[#F5F0E8] tracking-tight">Ledger</span>
        </Link>

        {/* Right side */}
        {!loading && user && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-[#F5F0E8]">{user.name}</span>
              <span className="text-xs text-[#A09880]">{ROLE_LABELS[user.role]}</span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[#3A3A3A] px-3 py-1.5 text-sm text-[#A09880] transition-colors hover:border-[#C9A227] hover:text-[#C9A227] focus-visible:outline-[#C9A227]"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
