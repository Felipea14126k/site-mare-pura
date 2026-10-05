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
        return s.json({ ok: true }, 201);
      },
    },
  },
});
