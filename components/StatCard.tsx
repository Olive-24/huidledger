interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  warning?: boolean;
  icon?: React.ReactNode;
}

export default function StatCard({ label, value, sub, accent, warning, icon }: Props) {
  return (
    <div className={`rounded-xl border p-4 ${
      warning
        ? "border-orange-500/40 bg-orange-500/5"
        : accent
        ? "border-[#C9A227]/40 bg-[#C9A22710]"
        : "border-[#3A3A3A] bg-[#1C1C1C]"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm ${warning ? "text-orange-300" : "text-[#A09880]"}`}>{label}</p>
        {icon && <span className={warning ? "text-orange-400" : "text-[#C9A227]"}>{icon}</span>}
      </div>
      <p className={`mt-1 text-2xl font-bold ${
        warning ? "text-orange-200" : accent ? "text-[#C9A227]" : "text-[#F5F0E8]"
      }`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[#6B6355]">{sub}</p>}
    </div>
  );
}
