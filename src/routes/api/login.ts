/**
 * ==============================================================================
 * ENDPOINT DE AUTENTICAÇÃO: /api/login (src/routes/api/login.ts)
 * ==============================================================================
 * 
 * Este arquivo processa as requisições de:
 *  - POST   /api/login -> Valida o login e devolve o token de sessão (8 horas)
 *  - DELETE /api/login -> Encerra a sessão ativa do administrador (Logout)
 * ==============================================================================
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/login")({
  server: {
    handlers: {
      /**
       * POST /api/login
       * Pipeline de segurança executado em cada tentativa de login:
       */
      POST: async ({ request }) => {
        // 1. Carrega dinamicamente o módulo de segurança do servidor
        const s = await import("../../../servidor/seguranca.server");

        // 2. Extrai o IP real do cliente que está tentando logar
        const ip = s.ipDe(request);

        // 3. Checa se o IP já está em penalidade de bloqueio (após 3 tentativas erradas)
        const espera = s.bloqueado(ip);

        // 4. Checa se a rota está sob ataque de volume ou DDoS (Throttling)
        if (s.detectarAtaque("/api/login", ip)) {
          const delay = s.aplicarThrottle(ip);
          // Força o servidor a esperar antes de responder, desacelerando robôs atacantes
          await new Promise((r) => setTimeout(r, Math.min(delay, 2000)));
        }

        // 5. Se o IP estiver bloqueado, rejeita com HTTP 429 (Too Many Requests)
        if (espera) {
          return s.json({ erro: "Muitas tentativas.", espera }, 429);
        }

        // 6. Lê o corpo da requisição e valida a estrutura com o Zod (email e senha)
        const body = s.loginSchema.safeParse(await request.json().catch(() => null));

        // 7. Se os dados forem inválidos OU a senha não bater no scrypt:
        if (!body.success || !s.conferirLogin(body.data.email, body.data.senha)) {
          // Registra o erro no contador do IP (ao 3º erro, bloqueia por 15s)
          s.registrarFalha(ip);
          return s.json(
            { erro: "E-mail ou senha incorretos.", espera: s.bloqueado(ip) },
            401
          );
        }

        // 8. Se chegou até aqui, login foi um sucesso!
        // Limpa o histórico de falhas do IP
        s.limparFalhas(ip);

        // Gera um token de sessão de 8 horas e devolve para o navegador
        return s.json({
          token: s.criarSessao(),
          email: body.data.email,
        });
      },

      /**
       * DELETE /api/login
       * Realiza o logout: invalida e apaga o token da memória do servidor.
       */
      DELETE: async ({ request }) => {
        const s = await import("../../../servidor/seguranca.server");
        // Extrai o Bearer token do cabeçalho e apaga do mapa de sessões
        s.encerrarSessao(s.tokenDe(request));
        return s.json({ ok: true });
      },
    },
  },
});