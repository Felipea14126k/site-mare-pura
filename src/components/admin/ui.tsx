import type { ReactNode } from "react";
import { X } from "lucide-react";

export const inputCls = "w-full rounded-md border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--admin-primary)]";
export const btnPrimary = "inline-flex items-center gap-2 rounded-md bg-[var(--admin-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--admin-primary-hover)]";
export const btnGhost = "inline-flex items-center gap-2 rounded-md border border-[var(--admin-border)] px-4 py-2 text-sm hover:bg-black/5";

export function Card({ children, className = "" }: { children: ReactNode; className?: string | undefined }) {
  return <div className={`rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] ${className}`}>{children}</div>;
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold">{title}</h1>
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="admin-theme w-full max-w-md rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 text-[var(--admin-text)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]";
export const td = "px-4 py-3 text-sm";
export const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
