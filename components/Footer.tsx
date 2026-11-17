import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#3A3A3A] bg-[#141414] px-4 py-6 mt-auto">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#6B6355]">
        <span>© 2026 HUIDLedger. College demonstration project.</span>
        <div className="flex gap-4">
          <Link href="/verify" className="hover:text-[#C9A227] transition-colors">Verify HUID</Link>
          <Link href="/login" className="hover:text-[#C9A227] transition-colors">Login</Link>
        </div>
      </div>
    </footer>
  );
}
