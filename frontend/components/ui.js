export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function Pill({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200',
    green: 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-100',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
  };
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone] || tones.gray)}>
      {children}
    </span>
  );
}

export function Card({ children, className }) {
  return (
    <div className={cx(
      'rounded-2xl border border-gray-200 bg-white shadow-sm',
      'dark:border-white/10 dark:bg-white/5',
      className
    )}>
      {children}
    </div>
  );
}

export function Button({ children, className, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
    neutral: 'bg-gray-900 text-white hover:bg-black active:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-white/10',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  };
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold',
        'transition disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black',
        variants[variant] || variants.primary,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cx(
        'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm',
        'placeholder:text-gray-400',
        'shadow-sm',
        'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
        'dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40',
        className
      )}
      {...props}
    />
  );
}
