"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/lib/types";
import { PageSpinner } from "./Spinner";

interface Props {
  allowedRoles: Role[];
  children: React.ReactNode;
}

/** Protects a client component. Redirects to /login if not authenticated. */
export default function RoleGuard({ allowedRoles, children }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) return <PageSpinner />;
  if (!user) return <PageSpinner />;

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-5xl" aria-hidden="true">🔒</div>
        <h1 className="text-xl font-semibold text-[#F5F0E8]">Access Denied</h1>
        <p className="text-[#A09880] max-w-sm">
          You do not have permission to view this page.
          {user.role && ` You are signed in as a ${user.role}.`}
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-lg bg-[#C9A227] px-4 py-2 text-sm font-medium text-black hover:opacity-90"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
