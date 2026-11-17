export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-10 w-10" : "h-6 w-6";
  return (
    <div
      className={`${s} animate-spin rounded-full border-2 border-[#3A3A3A] border-t-[#C9A227]`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-4 animate-pulse">
      <div className="h-3 w-24 rounded bg-[#2E2E2E] mb-3" />
      <div className="h-6 w-16 rounded bg-[#2E2E2E] mb-2" />
      <div className="h-3 w-32 rounded bg-[#2E2E2E]" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-3 items-center border-b border-[#2E2E2E] py-3 animate-pulse">
      <div className="h-4 w-24 rounded bg-[#2E2E2E]" />
      <div className="h-4 flex-1 rounded bg-[#2E2E2E]" />
      <div className="h-4 w-16 rounded bg-[#2E2E2E]" />
    </div>
  );
}
