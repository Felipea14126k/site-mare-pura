import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { login, MOCK_EMAIL, MOCK_PASS, sanitizeInput } from "@/lib/admin-store";


export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login do Painel — Maré Pura" },
      { name: "description", content: "Acesso restrito ao painel administrativo do Maré Pura." },
      { property: "og:title", content: "Login do Painel — Maré Pura" },
      { property: "og:description", content: "Acesso restrito à equipe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

const MAX_TRIES = 3;
const LOCK_SECONDS = 15;

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState(MOCK_EMAIL);
  const [pass, setPass] = useState(MOCK_PASS);
  const [fails, setFails] = useState(0);
  const [lock, setLock] = useState(0);
  const [err, setErr] = useState("");

  // Contagem regressiva do "rate limiting" simulado.
  useEffect(() => {
    if (lock <= 0) return;
    const t = setTimeout(() => setLock((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [lock]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (lock > 0) return;
    // O servidor confere a senha e também faz o bloqueio após 3 erros.
    const r = await login(sanitizeInput(email), pass);
    if (r.ok) {
      nav({ to: "/admin", replace: true });
      return;
    }
    if (r.espera) {
      setLock(r.espera);
      setFails(0);
      setErr("");
      return;
    }
    const n = Math.min(fails + 1, MAX_TRIES);
    setFails(n);
    setErr(`${r.erro ?? "E-mail ou senha incorretos."} Tentativa ${n} de ${MAX_TRIES}.`);
  };

  return (
    <div className="admin-theme flex min-h-screen items-center justify-center bg-[var(--admin-bg)] px-4 text-[var(--admin-text)]">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-8 shadow-sm">
        <input type="hidden" name="csrf_token" value="mock-token-xyz" />
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-[var(--admin-primary)] p-2 text-white"><Lock size={18} /></div>
          <div>
            <h1 className="text-lg font-bold">Painel Maré Pura</h1>
            <p className="text-xs text-[var(--admin-muted)]">Acesso restrito</p>
          </div>
        </div>
        <label className="mb-1 block text-sm font-medium">E-mail</label>
        <input type="email" required maxLength={100} value={email} onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--admin-primary)]" />
        <label className="mb-1 block text-sm font-medium">Senha</label>
        <input type="password" required maxLength={100} value={pass} onChange={(e) => setPass(e.target.value)}
          className="mb-4 w-full rounded-md border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--admin-primary)]" />
        {err && <p className="mb-3 text-sm text-red-500">{err}</p>}
        {lock > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-500">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            Muitas tentativas. Aguarde {lock}s para tentar novamente.
          </div>
        )}
        <button disabled={lock > 0} className="w-full rounded-md bg-[var(--admin-primary)] py-2 text-sm font-semibold text-white transition hover:bg-[var(--admin-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">
          {lock > 0 ? `Bloqueado (${lock}s)` : "Entrar"}
        </button>
        <p className="mt-4 text-center text-xs text-[var(--admin-muted)]">Demo: {MOCK_EMAIL} / {MOCK_PASS}</p>
      </form>
    </div>
  );
}
