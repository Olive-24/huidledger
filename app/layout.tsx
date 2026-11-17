import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ToastContainer } from "@/components/Toast";

export const metadata: Metadata = {
  title: "HUIDLedger – One secure, real-time ledger for every hallmarking batch",
  description:
    "HUIDLedger helps Indian gold jewellers track hallmarking batches, record HUIDs, and reconcile invoices in real time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#141414] text-[#F5F0E8] antialiased">
        <AuthProvider>
          {/* Navbar uses usePathname + useAuth — wrap in Suspense for cacheComponents compatibility */}
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
