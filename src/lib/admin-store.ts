/**
 * Cliente do painel admin — conversa com o servidor (pasta /servidor).
 * Os dados ficam gravados no servidor; aqui só guardamos uma cópia em memória
 * para mostrar na tela. O token de login fica no sessionStorage.
 */
import { useSyncExternalStore } from "react";

export type Prato = { id: string; nome: string; categoria: string; descricao: string; imagem?: string };
export type Show = { id: string; data: string; banda: string; estilo: string };
export type ReservaStatus = "Pendente" | "Confirmada" | "Cancelada";
export type Reserva = { id: string; nome: string; whatsapp: string; data: string; horario: string; pessoas: number; status: ReservaStatus; criadaEm?: string };

type State = { pratos: Prato[]; shows: Show[]; reservas: Reserva[] };

export const CATEGORIAS = ["Comidas", "Bebidas", "Lanches", "Sobremesas", "Vinhos", "Combos", "Porções"];
export const CSRF = "mock-token-xyz";

const vazio: State = { pratos: [], shows: [], reservas: [] };
let state: State = vazio;
let carregou = false;
const listeners = new Set<() => void>();
const set = (s: State) => { state = s; listeners.forEach((l) => l()); };

const AUTH_KEY = "marepura-admin-token";
const token = () => (typeof window === "undefined" ? "" : sessionStorage.getItem(AUTH_KEY) ?? "");

async function api(method: "GET" | "POST", body?: unknown) {
  const res = await fetch("/api/admin", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
    body: body ? JSON.stringify({ ...(body as object), csrf_token: CSRF }) : null,
  });
  if (res.status === 401) { logoutLocal(); window.location.href = "/login"; throw new Error("401"); }
  const data = await res.json();
  if (!res.ok) { alert(data.erro ?? "Erro no servidor."); throw new Error(data.erro); }
  set(data as State);
}

export const recarregar = () => api("GET").catch(() => undefined);

export function useAdminData() {
  if (!carregou && typeof window !== "undefined") { carregou = true; void recarregar(); }
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => vazio,
  );
}

const run = (b: unknown) => api("POST", b).catch(() => undefined);
export const addPrato = (p: Omit<Prato, "id">) => run({ acao: "addPrato", dados: p });
export const editPrato = (p: Prato) => { const { id, ...dados } = p; return run({ acao: "editPrato", id, dados }); };
export const deletePrato = (id: string) => run({ acao: "deletePrato", id });
export const addShow = (sh: Omit<Show, "id">) => run({ acao: "addShow", dados: sh });
export const deleteShow = (id: string) => run({ acao: "deleteShow", id });
export const setReservaStatus = (id: string, status: ReservaStatus) => run({ acao: "statusReserva", id, status });

/** Envia uma reserva pública ao servidor. Retorna mensagem de erro ou null. */
export async function enviarReserva(r: Omit<Reserva, "id" | "status">): Promise<string | null> {
  try {
    const res = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...r, csrf_token: CSRF }),
    });
    if (res.ok) return null;
    const d = await res.json().catch(() => ({}));
    return d.erro ?? "Não foi possível enviar a reserva.";
  } catch {
    return "Sem conexão com o servidor.";
  }
}

/**
 * sanitizeInput() — limpeza preventiva contra XSS no navegador.
 * O servidor repete essa limpeza, pois o navegador pode ser burlado.
 */
export function sanitizeInput(v: string): string {
  return v
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/[<>"'`]/g, "")
    .trim();
}

export const NAME_REGEX = /^[A-Za-zÀ-ÿ0-9 ]{2,60}$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------------- Autenticação (validada no servidor) ---------------- */
export const MOCK_EMAIL = "admin@marepura.com";
export const MOCK_PASS = "senha123";

export function isAuthenticated() {
  return !!token();
}

/** Retorna { ok } ou { ok:false, erro, espera(segundos de bloqueio) }. */
export async function login(email: string, senha: string): Promise<{ ok: boolean; erro?: string; espera?: number }> {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha, csrf_token: CSRF }),
    });
    const d = await res.json();
    if (res.ok) { sessionStorage.setItem(AUTH_KEY, d.token); carregou = false; return { ok: true }; }
    return { ok: false, erro: d.erro, espera: d.espera ?? 0 };
  } catch {
    return { ok: false, erro: "Sem conexão com o servidor." };
  }
}

function logoutLocal() { sessionStorage.removeItem(AUTH_KEY); set(vazio); carregou = false; }
export function logout() {
  const t = token();
  logoutLocal();
  void fetch("/api/login", { method: "DELETE", headers: { Authorization: `Bearer ${t}` } }).catch(() => undefined);
}
