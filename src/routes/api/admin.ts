import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// GET  /api/admin  -> todos os dados (exige login)
// POST /api/admin  { acao, ... } -> altera dados (exige login)
export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const s = await import("../../../servidor/seguranca.server");
        if (!s.autenticado(request)) return s.json({ erro: "Não autorizado." }, 401);
        const db = await import("../../../servidor/banco.server");
        return s.json(await db.ler());
      },
      POST: async ({ request }) => {
        const s = await import("../../../servidor/seguranca.server");
        if (!s.autenticado(request)) return s.json({ erro: "Não autorizado." }, 401);
        const db = await import("../../../servidor/banco.server");
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!body || body["csrf_token"] !== "mock-token-xyz") return s.json({ erro: "Token inválido." }, 403);
        const id = z.string().uuid();

        try {
          switch (body["acao"]) {
            case "addPrato": {
              const p = s.pratoSchema.parse(body["dados"]);
              await db.alterar((b) => { b.pratos.unshift({ ...p, id: db.uid() } as never); });
              break;
            }
            case "editPrato": {
              const pid = id.parse(body["id"]);
              const p = s.pratoSchema.parse(body["dados"]);
              await db.alterar((b) => { b.pratos = b.pratos.map((x) => (x.id === pid ? ({ ...p, id: pid } as never) : x)); });
              break;
            }
            case "deletePrato": {
              const pid = id.parse(body["id"]);
              await db.alterar((b) => { b.pratos = b.pratos.filter((x) => x.id !== pid); });
              break;
            }
            case "addShow": {
              const sh = s.showSchema.parse(body["dados"]);
              await db.alterar((b) => {
                b.shows.push({ ...sh, id: db.uid() });
                b.shows.sort((a, c) => a.data.localeCompare(c.data));
              });
              break;
            }
            case "deleteShow": {
              const sid = id.parse(body["id"]);
              await db.alterar((b) => { b.shows = b.shows.filter((x) => x.id !== sid); });
              break;
            }
            case "statusReserva": {
              const rid = id.parse(body["id"]);
              const st = z.enum(["Pendente", "Confirmada", "Cancelada"]).parse(body["status"]);
              await db.alterar((b) => { b.reservas = b.reservas.map((x) => (x.id === rid ? { ...x, status: st } : x)); });
              break;
            }
            default:
              return s.json({ erro: "Ação desconhecida." }, 400);
          }
        } catch {
          return s.json({ erro: "Dados inválidos." }, 400);
        }
        return s.json(await db.ler());
      },
    },
  },
});
