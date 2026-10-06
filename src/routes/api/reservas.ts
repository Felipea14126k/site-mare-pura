<<<<<<< HEAD
/**
 * ==============================================================================
 * ENDPOINT DE RESERVAS PÚBLICAS: /api/reservas (src/routes/api/reservas.ts)
 * ==============================================================================
 * 
 * Este arquivo processa reservas de mesa enviadas por qualquer visitante do site.
 * É uma rota PÚBLICA, então não exige login, mas possui proteções anti-spam:
 * 
 * - POST /api/reservas → Valida e salva uma nova reserva no banco de dados
 * 
 * Proteções ativas:
 *  ✅ Rate limiting: bloqueia se o mesmo IP enviar mais de 5 reservas por minuto
 *  ✅ Validação CSRF: rejeita requisições sem token válido (⚠️ ainda é mock, ver Lição 3)
 *  ✅ Validação Zod: garante que todos os campos estão no formato correto
 * ==============================================================================
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/reservas")({
  server: {
    handlers: {
      /**
       * POST /api/reservas
       * Recebe os dados do formulário de reserva, valida e salva no banco.
       */
      POST: async ({ request }) => {
        // Carrega os módulos do servidor dinamicamente
        const s = await import("../../../servidor/seguranca.server");
        const db = await import("../../../servidor/banco.server");

        // Extrai o IP real do cliente para aplicar o rate limiting
        const ip = s.ipDe(request);

        // Se o IP enviou mais de 5 reservas no último minuto, bloqueia com HTTP 429
        if (s.excedeuReservas(ip)) {
          return s.json({ erro: "Muitas reservas seguidas. Aguarde um minuto." }, 429);
        }

        // Lê o corpo da requisição com segurança (retorna null se vier malformado)
        const body = await request.json().catch(() => null);

        // ⚠️ VULNERABILIDADE PENDENTE (Lição 3):
        // Aqui está sendo verificado um token CSRF estático ("mock-token-xyz").
        // O correto é usar s.validarTokenCSRF(body?.csrf_token) com tokens dinâmicos.
        if (body?.csrf_token !== "mock-token-xyz") {
          return s.json({ erro: "Token inválido." }, 403);
        }

        // Valida todos os campos da reserva usando o schema Zod:
        // nome, whatsapp, data, horário e número de pessoas
        const r = s.reservaSchema.safeParse(body);
        if (!r.success) {
          // Retorna os erros de cada campo para o formulário exibir ao usuário
          return s.json(
            { erro: "Dados inválidos.", detalhes: r.error.flatten().fieldErrors },
            400
          );
        }

        // Salva a reserva no banco com status "Pendente" e registra o IP e horário de criação
        await db.alterar((b) => {
          b.reservas.unshift({
            ...r.data,
            id: db.uid(),
            status: "Pendente",
            criadaEm: new Date().toISOString(), // Data e hora exata do envio
            ip, // IP do cliente (para auditoria de segurança)
          });
        });

        // Retorna HTTP 201 (Created) indicando que a reserva foi recebida com sucesso
=======
import { createFileRoute } from "@tanstack/react-router";

// POST /api/reservas — público: qualquer visitante envia uma reserva.
export const Route = createFileRoute("/api/reservas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = await import("../../../servidor/seguranca.server");
        const db = await import("../../../servidor/banco.server");
        const ip = s.ipDe(request);
        if (s.excedeuReservas(ip)) return s.json({ erro: "Muitas reservas seguidas. Aguarde um minuto." }, 429);

        const body = await request.json().catch(() => null);
        if (body?.csrf_token !== "mock-token-xyz") return s.json({ erro: "Token inválido." }, 403);
        const r = s.reservaSchema.safeParse(body);
        if (!r.success) return s.json({ erro: "Dados inválidos.", detalhes: r.error.flatten().fieldErrors }, 400);

        await db.alterar((b) => {
          b.reservas.unshift({ ...r.data, id: db.uid(), status: "Pendente", criadaEm: new Date().toISOString(), ip });
        });
>>>>>>> 10c1c96e1b8bce24ea72e89322e56a029e88295b
        return s.json({ ok: true }, 201);
      },
    },
  },
});
