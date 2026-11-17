import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-7xl font-bold text-[#C9A227] opacity-30">404</div>
      <div>
        <h1 className="text-2xl font-bold text-[#F5F0E8]">Page not found</h1>
        <p className="mt-2 text-[#A09880]">
          Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-[#C9A227] px-5 py-2.5 font-semibold text-sm text-black hover:opacity-90"
        >
          Go Home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-[#3A3A3A] px-5 py-2.5 text-sm text-[#A09880] hover:border-[#C9A227]/40 transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
