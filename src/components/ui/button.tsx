import * as React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'outline'|'secondary' }
export function Button({ className = '', variant = 'default', ...rest }: Props) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition border';
  const style = variant === 'outline'
    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
    : variant === 'secondary'
      ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
      : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800';
  return <button className={`${base} ${style} ${className}`} {...rest} />;
}
