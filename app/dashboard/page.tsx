"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PageSpinner } from "@/components/Spinner";

// Role router — redirects to the appropriate dashboard based on the user's role.
export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    switch (user.role) {
      case "jeweller": router.replace("/dashboard/jeweller"); break;
      case "operator": router.replace("/dashboard/operator"); break;
      case "auditor":  router.replace("/dashboard/auditor");  break;
    }
  }, [user, loading, router]);

  return <PageSpinner />;
}
