import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 sm:py-32">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-[#C9A227]/5 blur-3xl" aria-hidden="true" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Logo mark */}
          <div className="mb-6 inline-flex items-center gap-2">
            <span className="text-4xl font-bold text-[#C9A227] tracking-tight sm:text-5xl">HUID</span>
            <span className="text-4xl font-bold text-[#F5F0E8] tracking-tight sm:text-5xl">Ledger</span>
          </div>

          <h1 className="mt-2 text-2xl font-semibold text-[#F5F0E8] sm:text-3xl">
            One secure, real-time ledger for every hallmarking batch.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#A09880] sm:text-lg">
            End the chaos of WhatsApp and paper. HUIDLedger gives jewellers, AHC operators, and auditors
            a shared live view of every batch — from submission to return.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="w-full sm:w-auto rounded-xl bg-[#C9A227] px-6 py-3 font-semibold text-black transition-opacity hover:opacity-90 focus-visible:outline-[#C9A227] text-center"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto rounded-xl border border-[#3A3A3A] px-6 py-3 font-semibold text-[#F5F0E8] transition-colors hover:border-[#C9A227]/50 focus-visible:outline-[#C9A227] text-center"
            >
              Sign In
            </Link>
            <Link
              href="/verify"
              className="w-full sm:w-auto rounded-xl px-6 py-3 text-sm text-[#A09880] underline-offset-2 hover:text-[#C9A227] focus-visible:outline-[#C9A227] text-center"
            >
              Verify a HUID →
            </Link>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-[#3A3A3A] px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-lg font-semibold text-[#A09880] mb-10 uppercase tracking-widest text-sm">
            Why HUIDLedger
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: "🔗",
                title: "Real-Time Shared View",
                desc: "Jewellers and AHC operators see the same live data simultaneously. No more status calls or WhatsApp chains. Know instantly when a batch is received, tested, or stuck.",
              },
              {
                icon: "🏅",
                title: "HUID Tracking & Reconciliation",
                desc: "Every hallmarked article's HUID is recorded against the item. Jewellers can link invoice numbers directly — making billing checks a one-click affair.",
              },
              {
                icon: "📊",
                title: "Fee Visibility & Audit Trails",
                desc: "Every batch shows an estimated hallmarking fee (configurable per article). A full status history with timestamps is kept for every batch — auditor-ready.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-6">
                <div className="text-3xl mb-3" aria-hidden="true">{f.icon}</div>
                <h3 className="font-semibold text-[#F5F0E8] mb-2">{f.title}</h3>
                <p className="text-sm text-[#A09880] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#3A3A3A] px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-sm font-semibold text-[#A09880] mb-10 uppercase tracking-widest">
            The hallmarking journey
          </h2>
          <div className="flex flex-col sm:flex-row items-start gap-0">
            {[
              { step: "1", label: "Jeweller submits", desc: "Creates a batch, adds articles with weight, purity, and optional photos." },
              { step: "2", label: "Operator claims", desc: "An AHC operator claims the batch and moves it through testing." },
              { step: "3", label: "HUID recorded", desc: "Each hallmarked article gets its 6-character HUID. Rejections get a reason." },
              { step: "4", label: "Returned & reconciled", desc: "Jeweller matches HUIDs to invoices and sees the total fee." },
            ].map((s, i) => (
              <div key={s.step} className="flex flex-row sm:flex-col flex-1 items-start gap-3">
                {/* connector line */}
                {i > 0 && (
                  <div className="sm:hidden h-6 w-0.5 bg-[#3A3A3A] ml-4 flex-shrink-0 self-start mt-0" />
                )}
                <div className="flex items-center sm:w-full">
                  {i > 0 && <div className="hidden sm:block h-0.5 flex-1 bg-[#3A3A3A]" />}
                  <span className="flex-shrink-0 h-9 w-9 rounded-full bg-[#C9A22722] border border-[#C9A227]/40 flex items-center justify-center text-sm font-bold text-[#C9A227]">
                    {s.step}
                  </span>
                  {i < 3 && <div className="hidden sm:block h-0.5 flex-1 bg-[#3A3A3A]" />}
                </div>
                <div className="flex-1 sm:text-center sm:mt-3 pb-6 sm:pb-0">
                  <p className="font-semibold text-[#F5F0E8] text-sm">{s.label}</p>
                  <p className="text-xs text-[#6B6355] mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#3A3A3A] px-4 py-16 text-center">
        <p className="text-xs text-[#6B6355] mb-6">
          ⚠️ This is a college demonstration project. All data shown is simulated.
        </p>
        <Link
          href="/login"
          className="inline-flex rounded-xl bg-[#C9A227] px-8 py-3 font-semibold text-black transition-opacity hover:opacity-90 focus-visible:outline-[#C9A227]"
        >
          Try the Demo →
        </Link>
      </section>
    </div>
  );
}
