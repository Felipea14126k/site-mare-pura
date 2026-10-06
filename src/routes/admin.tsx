import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, LayoutDashboard, LogOut, Menu, Moon, X, Sun, UtensilsCrossed } from "lucide-react";
import { useEffect, useState } from "react";
import { isAuthenticated, logout, MOCK_EMAIL } from "@/lib/admin-store";

/**
 * ProtectedRoute — rota de layout que protege TODO o /admin.
 *
 * Como funciona:
 * 1. `ssr: false` — a checagem roda só no navegador, onde está a sessão mock.
 * 2. `beforeLoad` executa ANTES de qualquer rota filha renderizar. Se não houver
 *    estado de autenticação ativo, lança `redirect` para /login — nenhum
 *    conteúdo protegido chega a aparecer na tela (sem "flash").
 * 3. Todas as rotas admin.*.tsx são filhas desta, então herdam a proteção.
 *
 * ATENÇÃO: isto protege apenas a interface. Com um backend real, cada
 * endpoint de dados também precisa validar a sessão no servidor.
 */
export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const links = [
  { to: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/cardapio", label: "Cardápio", icon: UtensilsCrossed, exact: false },
  { to: "/admin/agenda", label: "Agenda de Shows", icon: CalendarDays, exact: false },
  { to: "/admin/reservas", label: "Reservas", icon: ClipboardList, exact: false },
] as const;

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
    <div onClick={onClose} aria-hidden className={`fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[var(--admin-sidebar)] text-[var(--admin-sidebar-text)] transition-transform duration-300 md:w-60 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between px-6 py-5 text-lg font-bold text-white">
        <span>Maré Pura <span className="text-[var(--admin-primary)]">CMS</span></span>
        <button onClick={onClose} aria-label="Fechar menu" className="rounded p-1 hover:bg-white/10 md:hidden"><X size={20} /></button>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {links.map((l) => (
          <Link key={l.to} to={l.to} onClick={onClose} activeOptions={{ exact: l.exact }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-white/5"
            activeProps={{ className: "bg-white/10 text-white" }}>
            <l.icon size={18} /> {l.label}
          </Link>
        ))}
      </nav>
      <Link to="/" onClick={onClose} className="mt-auto px-6 py-4 text-xs hover:text-white">← Ver site público</Link>
    </aside>
    </>
  );
}

function Topbar({ dark, toggle, onMenu }: { dark: boolean; toggle: () => void; onMenu: () => void }) {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-2 border-b border-[var(--admin-border)] bg-[var(--admin-card)] px-3 sm:gap-4 sm:px-6">
      <button onClick={onMenu} aria-label="Abrir menu" className="mr-auto rounded-md p-2 hover:bg-black/5 md:hidden"><Menu size={22} /></button>
      <button onClick={toggle} aria-label="Alternar tema" className="rounded-md p-2 text-[var(--admin-muted)] hover:bg-black/5">
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="hidden min-w-0 text-right sm:block">
        <p className="text-sm font-semibold">Administrador</p>
        <p className="text-xs text-[var(--admin-muted)]">{MOCK_EMAIL}</p>
      </div>
      <button onClick={() => { logout(); nav({ to: "/login", replace: true }); }}
        className="flex items-center gap-2 rounded-md border border-[var(--admin-border)] px-3 py-1.5 text-sm hover:bg-black/5">
        <LogOut size={16} /> Sair
      </button>
    </header>
  );
}

function AdminLayout() {
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const d = !dark;
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    localStorage.setItem("theme", d ? "dark" : "light");
  };
  return (
    <div className="admin-theme min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)]">
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="md:pl-60">
        <Topbar dark={dark} toggle={toggle} onMenu={() => setMenu(true)} />
        <main className="p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
