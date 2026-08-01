import { ChevronLeft, ChevronRight, FilterX } from 'lucide-react';
import { ReactNode } from 'react';

export function FilterBar({ children, onClear, hasFilters = false }: { children: ReactNode; onClear?: () => void; hasFilters?: boolean }) {
  return <div className="rounded-lg border border-surface-200 bg-white p-3"><div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">{children}{onClear && <button onClick={onClear} disabled={!hasFilters} className="btn-secondary flex items-center justify-center gap-2 disabled:opacity-40"><FilterX size={15}/>Limpar</button>}</div></div>;
}

export function Pagination({ page, pages, total, onChange }: { page: number; pages: number; total?: number; onChange: (page: number) => void }) {
  if (pages <= 1) return total !== undefined ? <p className="text-right text-xs text-surface-400">{total} registro(s)</p> : null;
  const visible = Array.from(new Set([1, pages, page - 1, page, page + 1])).filter((item) => item >= 1 && item <= pages).sort((a, b) => a - b);
  return <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-surface-400">{total !== undefined ? `${total} registro(s) · ` : ''}Página {page} de {pages}</p><div className="flex items-center gap-1"><button className="h-8 w-8 rounded border bg-white disabled:opacity-40" disabled={page === 1} onClick={() => onChange(page - 1)}><ChevronLeft size={15} className="mx-auto"/></button>{visible.map((item, index) => <span key={item} className="flex items-center gap-1">{index > 0 && item - visible[index - 1] > 1 && <span className="px-1 text-surface-400">…</span>}<button onClick={() => onChange(item)} className={`h-8 min-w-8 rounded px-2 text-xs font-medium ${item === page ? 'bg-brand-600 text-white' : 'border bg-white text-surface-600'}`}>{item}</button></span>)}<button className="h-8 w-8 rounded border bg-white disabled:opacity-40" disabled={page === pages} onClick={() => onChange(page + 1)}><ChevronRight size={15} className="mx-auto"/></button></div></div>;
}
