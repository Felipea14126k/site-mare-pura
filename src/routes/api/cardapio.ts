import { createFileRoute } from "@tanstack/react-router";

// GET /api/cardapio — público: lista os pratos (somente leitura) para a página Cardápio.
export const Route = createFileRoute("/api/cardapio")({
  server: {
    handlers: {
      GET: async () => {
        const s = await import("../../../servidor/seguranca.server");
        const db = await import("../../../servidor/banco.server");
        const b = await db.ler();
        return s.json({ pratos: b.pratos });
      },
    },
  },
});
