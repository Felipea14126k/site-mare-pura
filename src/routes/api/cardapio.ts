<<<<<<< HEAD
/**
 * ==============================================================================
 * ENDPOINT PÚBLICO DO CARDÁPIO: /api/cardapio (src/routes/api/cardapio.ts)
 * ==============================================================================
 * 
 * Este arquivo fornece o cardápio para a página pública do site.
 * É uma rota de LEITURA APENAS — não precisa de autenticação, pois qualquer
 * visitante pode ver os pratos disponíveis no restaurante.
 * 
 * - GET /api/cardapio → Retorna a lista de pratos cadastrados no banco
 * ==============================================================================
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cardapio")({
  server: {
    handlers: {
      /**
       * GET /api/cardapio
       * Lê o banco de dados e retorna apenas os pratos (sem shows nem reservas),
       * já que a página pública do cardápio só precisa dessa informação.
       */
      GET: async () => {
        // Carrega os módulos do servidor dinamicamente
        const s = await import("../../../servidor/seguranca.server");
        const db = await import("../../../servidor/banco.server");

        // Lê o banco completo e extrai só a lista de pratos
        const b = await db.ler();

        // Retorna apenas os pratos (não expõe reservas ou outros dados sensíveis)
=======
import { createFileRoute } from "@tanstack/react-router";

// GET /api/cardapio — público: lista os pratos (somente leitura) para a página Cardápio.
export const Route = createFileRoute("/api/cardapio")({
  server: {
    handlers: {
      GET: async () => {
        const s = await import("../../../servidor/seguranca.server");
        const db = await import("../../../servidor/banco.server");
        const b = await db.ler();
>>>>>>> 10c1c96e1b8bce24ea72e89322e56a029e88295b
        return s.json({ pratos: b.pratos });
      },
    },
  },
});
