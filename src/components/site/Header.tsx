import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { to: "/", label: "Home" },
  { to: "/cardapio", label: "Cardápio" },
  { to: "/agenda", label: "Agenda" },
  { to: "/contato", label: "Contato" },
  { to: "/reserva", label: "Reserva" },
] as const;

export function Header() {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const linkCls =
    "font-nav text-soft-shadow tracking-wide transition-colors hover:text-primary";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl shadow-xs transition-colors">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <Link to="/" className="font-display text-2xl text-primary text-soft-shadow md:text-3xl">
          Maré Pura
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={linkCls}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary font-bold" }}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={toggle}
            aria-label="Alternar tema"
            className="rounded-full p-2 transition hover:bg-accent hover:text-primary dark:hover:shadow-glow"
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <button onClick={toggle} aria-label="Alternar tema" className="rounded-full p-2">
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setOpen(!open)} aria-label="Menu" className="p-2">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-4 border-t border-border px-6 py-4 md:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={linkCls}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary font-bold" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
