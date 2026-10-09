import { createFileRoute } from "@tanstack/react-router";

// GET /api/csrf — rota pública que entrega um token novo e seguro
export const Route = createFileRoute("/api/csrf")({
  server: {
    handlers: {
      GET: async () => {
        // 1. Carrega o núcleo de segurança do servidor
        const s = await import("../../../servidor/seguranca.server");

        // 2. Cria um token hexadecimal de 64 caracteres único
        const token = s.gerarTokenCSRF();

         // 3. Devolve para quem pediu em formato JSON
         return s.json({csrf_token: token});
      },
    },
  },
});