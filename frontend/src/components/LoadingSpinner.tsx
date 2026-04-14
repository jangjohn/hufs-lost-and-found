interface LoadingSpinnerProps {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner({
  label = 'Loading',
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 text-slate-500',
        fullScreen ? 'min-h-[40vh]' : 'py-8',
        className,
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-sky-500 border-r-cyan-400" />
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
