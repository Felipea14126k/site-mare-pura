import { createFileRoute } from "@tanstack/react-router";

// POST /api/login  { email, senha }  -> { token }
// DELETE /api/login (Bearer token)   -> encerra a sessão
export const Route = createFileRoute("/api/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = await import("../../../servidor/seguranca.server");
        const ip = s.ipDe(request);
        const espera = s.bloqueado(ip);
        if (s.detectarAtaque("/api/login. ip")) {
          const delay = s.aplicarThrottle(ip);
          await new Promise(r => setTimeout(r, Math.min(delay, 2000)));
        }
        if (espera) return s.json({ erro: "Muitas tentativas.", espera }, 429);

        const body = s.loginSchema.safeParse(await request.json().catch(() => null));
        if (!body.success || !s.conferirLogin(body.data.email, body.data.senha)) {
          s.registrarFalha(ip);
          return s.json({ erro: "E-mail ou senha incorretos.", espera: s.bloqueado(ip) }, 401);
        }
        s.limparFalhas(ip);
        return s.json({ token: s.criarSessao(), email: body.data.email });
      },
      DELETE: async ({ request }) => {
        const s = await import("../../../servidor/seguranca.server");
        s.encerrarSessao(s.tokenDe(request));
        return s.json({ ok: true });
      },
    },
  },
});