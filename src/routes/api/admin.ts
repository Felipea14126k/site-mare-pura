/**
 * ==============================================================================
 * ENDPOINT DO PAINEL ADMINISTRATIVO: /api/admin (src/routes/api/admin.ts)
 * ==============================================================================
 * 
 * Este arquivo processa as requisições privadas do painel administrativo.
 * TODAS as operações aqui exigem que o administrador esteja autenticado.
 * 
 * - GET  /api/admin → Retorna todos os dados do banco (pratos, shows, reservas)
 * - POST /api/admin → Executa uma ação de modificação nos dados (ex: addPrato, deleteShow)
 * 
 * ⚠️ SEGURANÇA: Qualquer tentativa sem token de sessão válido é rejeitada com HTTP 401.
 * ==============================================================================
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      /**
       * GET /api/admin
       * Retorna todos os pratos, shows e reservas salvos no banco JSON.
       * Usado pelo painel para exibir e listar tudo na tela do admin.
       */
      GET: async ({ request }) => {
        // Carrega o módulo de segurança dinamicamente (roda no servidor)
        const s = await import("../../../servidor/seguranca.server");

        // Bloqueia qualquer requisição que não tenha um token de sessão válido
        if (!s.autenticado(request)) {
          return s.json({ erro: "Não autorizado." }, 401);
        }

        // Carrega e retorna todo o banco de dados
        const db = await import("../../../servidor/banco.server");
        return s.json(await db.ler());
      },

      /**
       * POST /api/admin
       * Executa ações de alteração nos dados do restaurante.
       * O campo "acao" no corpo da requisição define o que será feito.
       * 
       * Ações disponíveis:
       *  - addPrato    → Adiciona um novo prato ao cardápio
       *  - editPrato   → Edita os dados de um prato existente (por ID)
       *  - deletePrato → Remove um prato do cardápio (por ID)
       *  - addShow     → Adiciona um novo show à agenda
       *  - deleteShow  → Remove um show da agenda (por ID)
       *  - statusReserva → Altera o status de uma reserva (Pendente/Confirmada/Cancelada)
       */
      POST: async ({ request }) => {
        const s = await import("../../../servidor/seguranca.server");

        // Rejeita sem token de sessão válido
        if (!s.autenticado(request)) {
          return s.json({ erro: "Não autorizado." }, 401);
        }

        const db = await import("../../../servidor/banco.server");

        // Lê o corpo da requisição (ou retorna null se vier corrompido)
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

        // ⚠️ VULNERABILIDADE PENDENTE (Lição 3):
        // Aqui está sendo usado um token CSRF estático ("mock-token-xyz").
        // O correto é usar s.validarTokenCSRF(body?.["csrf_token"]) com tokens dinâmicos.
        if (!body || body["csrf_token"] !== "mock-token-xyz") {
          return s.json({ erro: "Token inválido." }, 403);
        }

        // Schema Zod para validar que o ID recebido é um UUID válido
        const id = z.string().uuid();

        try {
          // Executa a ação correspondente ao campo "acao" do corpo da requisição
          switch (body["acao"]) {
            case "addPrato": {
              // Valida os dados do prato com o Zod e insere no início da lista
              const p = s.pratoSchema.parse(body["dados"]);
              await db.alterar((b) => {
                b.pratos.unshift({ ...p, id: db.uid() } as never);
              });
              break;
            }

            case "editPrato": {
              // Encontra o prato pelo ID e substitui pelos novos dados
              const pid = id.parse(body["id"]);
              const p = s.pratoSchema.parse(body["dados"]);
              await db.alterar((b) => {
                b.pratos = b.pratos.map((x) => (x.id === pid ? ({ ...p, id: pid } as never) : x));
              });
              break;
            }

            case "deletePrato": {
              // Remove o prato da lista filtrando pelo ID
              const pid = id.parse(body["id"]);
              await db.alterar((b) => {
                b.pratos = b.pratos.filter((x) => x.id !== pid);
              });
              break;
            }

            case "addShow": {
              // Valida e adiciona o show, mantendo a agenda ordenada por data
              const sh = s.showSchema.parse(body["dados"]);
              await db.alterar((b) => {
                b.shows.push({ ...sh, id: db.uid() });
                b.shows.sort((a, c) => a.data.localeCompare(c.data));
              });
              break;
            }

            case "deleteShow": {
              // Remove o show da agenda pelo ID
              const sid = id.parse(body["id"]);
              await db.alterar((b) => {
                b.shows = b.shows.filter((x) => x.id !== sid);
              });
              break;
            }

            case "statusReserva": {
              // Atualiza o status de uma reserva específica pelo ID
              const rid = id.parse(body["id"]);
              const st = z.enum(["Pendente", "Confirmada", "Cancelada"]).parse(body["status"]);
              await db.alterar((b) => {
                b.reservas = b.reservas.map((x) => (x.id === rid ? { ...x, status: st } : x));
              });
              break;
            }

            default:
              return s.json({ erro: "Ação desconhecida." }, 400);
          }
        } catch {
          // Captura erros de validação Zod e retorna resposta amigável
          return s.json({ erro: "Dados inválidos." }, 400);
        }

        // Retorna o banco atualizado para o painel sincronizar a tela
        return s.json(await db.ler());
      },
    },
  },
});
