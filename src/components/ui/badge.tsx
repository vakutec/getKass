import * as React from 'react'
export function Badge({ children, className = '', variant = 'secondary' as 'secondary'|'default' }) {
  const style = variant === 'secondary' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900 text-white border-slate-900'
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${style} ${className}`}>{children}</span>
}
