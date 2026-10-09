/**
 * ==============================================================================
 * STORE DO PAINEL ADMINISTRATIVO (src/lib/admin-store.ts)
 * ==============================================================================
 *
 * Este arquivo é o "gerente de dados" do lado do CLIENTE (navegador).
 * Ele faz a ponte entre o que o admin vê na tela e o que está salvo no servidor.
 *
 * Como funciona:
 *  - O token de sessão (recebido após o login) fica guardado no sessionStorage do navegador.
 *  - Uma cópia dos dados (pratos, shows, reservas) fica na memória do navegador para exibir na tela.
 *  - Toda ação do admin (adicionar prato, confirmar reserva) dispara uma requisição ao servidor.
 *  - O servidor valida, salva, e devolve o banco atualizado para sincronizar a tela.
 *
 * ⚠️ SEGURANÇA: As constantes MOCK_EMAIL, MOCK_PASS e CSRF são temporárias para desenvolvimento.
 *  Em produção, elas devem ser removidas e substituídas por tokens dinâmicos (Lição 3).
 * ==============================================================================
 */

import { useSyncExternalStore } from "react";

// ==============================================================================
// 1. TIPOS DE DADOS (Espelham os tipos do servidor para o TypeScript não reclamar)
// ==============================================================================

export type Prato = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  imagem?: string;
};

export type Show = {
  id: string;
  data: string;
  banda: string;
  estilo: string;
};

export type ReservaStatus = "Pendente" | "Confirmada" | "Cancelada";

export type Reserva = {
  id: string;
  nome: string;
  whatsapp: string;
  data: string;
  horario: string;
  pessoas: number;
  status: ReservaStatus;
  criadaEm?: string;
};

// Estrutura do estado completo mantido em memória no navegador
type State = { pratos: Prato[]; shows: Show[]; reservas: Reserva[] };

// ==============================================================================
// 2. CONSTANTES (⚠️ TEMPORÁRIAS — serão substituídas na Lição 3)
// ==============================================================================

// Lista oficial de categorias do cardápio (deve ser idêntica à do servidor)
export const CATEGORIAS = ["Comidas", "Bebidas", "Lanches", "Sobremesas", "Vinhos", "Combos", "Porções"];

// ⚠️ Token CSRF estático — VULNERÁVEL! Precisa ser substituído por token dinâmico (Lição 3)
export const CSRF = "mock-token-xyz";

// ⚠️ Credenciais mock para facilitar os testes em desenvolvimento — REMOVER antes de produção!
export const MOCK_EMAIL = "admin@marepura.com";
export const MOCK_PASS = "senha123";

// ==============================================================================
// 3. GERENCIAMENTO DE ESTADO EM MEMÓRIA (Cache local no navegador)
// ==============================================================================

// Estado vazio (exibido antes de carregar os dados do servidor)
const vazio: State = { pratos: [], shows: [], reservas: [] };

// Estado atual mantido em memória no navegador
let state: State = vazio;

// Controla se os dados já foram carregados ao menos uma vez na sessão
let carregou = false;

// Lista de funções que o React usa para saber quando a tela precisa ser atualizada
const listeners = new Set<() => void>();

// Atualiza o estado em memória e avisa o React para redesenhar a tela
const set = (s: State) => {
  state = s;
  listeners.forEach((l) => l());
};

// ==============================================================================
// 4. AUTENTICAÇÃO (Token de Sessão no sessionStorage)
// ==============================================================================

// Chave usada para guardar o token no sessionStorage do navegador
const AUTH_KEY = "marepura-admin-token";

// Lê o token salvo no navegador (retorna string vazia se não estiver logado ou no servidor)
const token = () => (typeof window === "undefined" ? "" : sessionStorage.getItem(AUTH_KEY) ?? "");

// ==============================================================================
// 5. COMUNICAÇÃO COM O SERVIDOR (Requisições HTTP para /api/admin)
// ==============================================================================

/**
 * api(method, body)
 * Função central de comunicação com o endpoint /api/admin.
 * Sempre inclui o token de sessão no cabeçalho Authorization.
 * Se receber HTTP 401 (não autorizado), redireciona para a tela de login.
 */
async function api(method: "GET" | "POST", body?: unknown) {
  const res = await fetch("/api/admin", {
    method,
    headers: {
      "Content-Type": "application/json",
      // Envia o token de sessão no formato padrão "Bearer <token>"
      Authorization: `Bearer ${token()}`,
    },
    // Inclui o token CSRF em todas as requisições de modificação (POST)
    body: body ? JSON.stringify({ ...(body as object), csrf_token: CSRF }) : null,
  });

  // Se o servidor devolver 401, a sessão expirou — redireciona para o login
  if (res.status === 401) {
    logoutLocal();
    window.location.href = "/login";
    throw new Error("401");
  }

  const data = await res.json();

  // Se der outro erro, exibe um alerta na tela com a mensagem do servidor
  if (!res.ok) {
    alert(data.erro ?? "Erro no servidor.");
    throw new Error(data.erro);
  }

  // Atualiza o estado local com os dados mais recentes do servidor
  set(data as State);
}

// Recarrega todos os dados do servidor (GET /api/admin)
export const recarregar = () => api("GET").catch(() => undefined);

/**
 * useAdminData()
 * Hook React que entrega os dados do painel para qualquer componente que precisar.
 * Carrega automaticamente os dados do servidor na primeira vez que for usado.
 */
export function useAdminData() {
  if (!carregou && typeof window !== "undefined") {
    carregou = true;
    void recarregar();
  }

  // useSyncExternalStore garante que o React atualize a tela quando o estado mudar
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => vazio,
  );
}

// ==============================================================================
// 6. AÇÕES DO PAINEL (Cada função dispara um POST para /api/admin)
// ==============================================================================

// Atalho interno: dispara um POST de modificação e ignora erros silenciosamente
const run = (b: unknown) => api("POST", b).catch(() => undefined);

/** Adiciona um novo prato ao cardápio */
export const addPrato = (p: Omit<Prato, "id">) => run({ acao: "addPrato", dados: p });

/** Edita um prato existente pelo ID */
export const editPrato = (p: Prato) => {
  const { id, ...dados } = p;
  return run({ acao: "editPrato", id, dados });
};

/** Remove um prato do cardápio pelo ID */
export const deletePrato = (id: string) => run({ acao: "deletePrato", id });

/** Adiciona um novo show à agenda */
export const addShow = (sh: Omit<Show, "id">) => run({ acao: "addShow", dados: sh });

/** Remove um show da agenda pelo ID */
export const deleteShow = (id: string) => run({ acao: "deleteShow", id });

/** Muda o status de uma reserva (Pendente → Confirmada ou Cancelada) */
export const setReservaStatus = (id: string, status: ReservaStatus) =>
  run({ acao: "statusReserva", id, status });

// ==============================================================================
// 7. FORMULÁRIO PÚBLICO DE RESERVA (Acessível sem login)
// ==============================================================================

/**
 * enviarReserva(dados)
 * Envia uma reserva de mesa para o servidor sem exigir autenticação.
 * Retorna null em caso de sucesso, ou a mensagem de erro em caso de falha.
 */
export async function enviarReserva(r: Omit<Reserva, "id" | "status">): Promise<string | null> {
  try {
    // 1. Pega um token CSRF novo e fresco direto do servidor
    const csrfRes = await fetch("/api/csrf").then(res => res.json()).catch(() => null);
    const token = csrfRes?.csrf_token;

    // 2. Envia a reserva com o token legítimo
    const res = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...r, csrf_token: token }),
    });

    if (res.ok) return null; //sucesso

    const d = await res.json().catch(() => ({}));
    return d.erro ?? "Não foi possível enviar a reserva.";
  } catch {
    return "Sem conexão com o servidor.";
  }
}

// ==============================================================================
// 8. SANITIZAÇÃO DE TEXTO NO CLIENTE (Primeira barreira contra XSS)
// ==============================================================================

/**
 * sanitizeInput(texto)
 * Limpa qualquer tentativa de injetar código HTML ou JavaScript nos campos do formulário.
 * ⚠️ O servidor REPETE essa limpeza de forma independente — nunca confie apenas no cliente.
 */
export function sanitizeInput(v: string): string {
  return v
    .replace(/<[^>]*>/g, "")      // Remove tags HTML
    .replace(/javascript:/gi, "") // Remove protocolos javascript:
    .replace(/on\w+\s*=/gi, "")   // Remove eventos como onclick= e onload=
    .replace(/[<>"'`]/g, "")      // Remove caracteres perigosos
    .trim();
}

// Expressões regulares para validação de formato no lado do cliente
export const NAME_REGEX = /^[A-Za-zÀ-ÿ0-9 ]{2,60}$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Retorna a data de hoje no formato ISO (AAAA-MM-DD) */
export const todayISO = () => new Date().toISOString().slice(0, 10);

// ==============================================================================
// 9. FUNÇÕES DE LOGIN E LOGOUT
// ==============================================================================

/**
 * isAuthenticated()
 * Verifica se o navegador possui um token de sessão guardado.
 * Usado pelo painel admin para redirecionar quem não está logado.
 */
export function isAuthenticated() {
  return !!token();
}

/**
 * login(email, senha)
 * Envia as credenciais para o servidor e, se correto, salva o token de sessão.
 * Retorna { ok: true } em sucesso ou { ok: false, erro, espera } em falha.
 */
export async function login(
  email: string,
  senha: string
): Promise<{ ok: boolean; erro?: string; espera?: number }> {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ⚠️ Token CSRF estático — será substituído por token dinâmico na Lição 3
      body: JSON.stringify({ email, senha, csrf_token: CSRF }),
    });

    const d = await res.json();

    if (res.ok) {
      // Salva o token de sessão no sessionStorage (some ao fechar o navegador)
      sessionStorage.setItem(AUTH_KEY, d.token);
      carregou = false; // Força recarregar os dados do banco na próxima renderização
      return { ok: true };
    }

    return { ok: false, erro: d.erro, espera: d.espera ?? 0 };
  } catch {
    return { ok: false, erro: "Sem conexão com o servidor." };
  }
}

/**
 * logoutLocal()
 * Remove o token de sessão do navegador e limpa o estado em memória.
 * Função interna usada pelo logout completo e pelo tratamento de 401.
 */
function logoutLocal() {
  sessionStorage.removeItem(AUTH_KEY);
  set(vazio);
  carregou = false;
}

/**
 * logout()
 * Realiza o logout completo:
 *  1. Remove o token do navegador
 *  2. Avisa o servidor para invalidar a sessão (DELETE /api/login)
 */
export function logout() {
  const t = token();
  logoutLocal();
  // Avisa o servidor para destruir o token na memória dele também
  void fetch("/api/login", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${t}` },
  }).catch(() => undefined);
}
