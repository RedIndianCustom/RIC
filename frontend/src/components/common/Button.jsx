const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  ghost: 'bg-transparent text-ink hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export default function Button({ variant = 'primary', className = '', loading, children, disabled, icon: Icon, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />}
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}
