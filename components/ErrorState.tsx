interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-500/30 bg-red-500/5 px-6 py-12 text-center">
      <div className="text-3xl" aria-hidden="true">⚠️</div>
      <p className="text-red-300 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10 focus-visible:outline-red-400"
        >
          Try again
        </button>
      )}
    </div>
  );
}
