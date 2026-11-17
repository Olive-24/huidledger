interface Props {
  message: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}

export default function EmptyState({ message, action, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#3A3A3A] bg-[#1C1C1C] px-6 py-12 text-center">
      <div className="text-4xl opacity-40" aria-hidden="true">
        {icon ?? "📦"}
      </div>
      <p className="text-[#A09880] max-w-sm">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-lg bg-[#C9A227] px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 focus-visible:outline-[#C9A227]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
