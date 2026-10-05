# Contexto do Projeto — Maré Pura (Painel & Segurança)

> Este arquivo serve para passar o contexto completo deste projeto para qualquer nova sessão do Antigravity em outro computador ou no mesmo.

---

## 1. Sobre o Projeto
- **Objetivo:** Site e sistema de gestão para um restaurante/bar litorâneo (*Maré Pura*).
- **Finalidade:** Apresentação profissional como freelancer para empresas/clientes.
- **Tecnologias:** React, TypeScript, TanStack Router/Start, Tailwind CSS, Zod, Backend Node.js local (`/servidor`) com persistência em JSON (`servidor/dados/banco.json`).

---

## 2. Estrutura e Funcionalidades
- **Área Pública:**
  - Cardápio de pratos e bebidas com fotos e categorias.
  - Agenda de shows e eventos musicais.
  - Formulário público de reservas de mesas (`/reserva` -> `/api/reservas`) com validação estrita (Zod) e proteção anti-spam.
  - Informações de contato e WhatsApp.
- **Painel Administrativo (`/admin` e `/login`):**
  - Autenticação com senha hash (`scryptSync` + `timingSafeEqual`).
  - Gestão de pratos (criar, editar, excluir).
  - Gestão de shows e agenda.
  - Gestão e aprovação de reservas recebidas.
  - Rate limiting (bloqueio temporário após 3 erros consecutivos).

---

## 3. Estado Atual da Auditoria de Segurança

### A. Erros Críticos Identificados (Bugs de Execução a Corrigir):
1. **`servidor/seguranca.server.ts` (Linha 60):** Método incorreto `ip.charCode()`. Deve ser `ip.charCodeAt()`.
2. **`servidor/seguranca.server.ts` (Linha 109):** Método incorreto `socketIp.include()`. Deve ser `socketIp.includes()`.
3. **`src/routes/api/login.ts` (Linha 12):** Argumento único `detectarAtaque("/api/login. ip")`. Deve ser separado em rota e IP: `detectarAtaque("/api/login", ip)`.
4. **`servidor/seguranca.server.ts` (Linhas 34-35):** Laço de contagem de IPs adiciona o mesmo IP repetidamente a um Set local, tornando a regra ineficaz.

### B. Vulnerabilidades e Riscos:
1. **Credenciais Mock:** `admin@marepura.com` e `senha123` expostas no código do cliente (`src/lib/admin-store.ts`).
2. **CSRF Token Falso:** `"mock-token-xyz"` estático.
3. **Spoofing de IP:** Leitura direta de `x-forwarded-for` sem validação de proxy reverso.
4. **Vazamento de Memória:** Maps de rate limiting (`tentativas` e `envios`) sem expiração e limpeza automática de chaves antigas.

### C. Guia de Correções de Segurança (`Guia-Correcoes-Seguranca.pdf`):
- O projeto segue diretrizes de conformidade OWASP:
  - **SSRF:** Criar módulo seguro `ssrf-guard.ts` bloqueando IPs privados (`127.0.0.0/8`, `169.254.0.0/16`, etc.) e validando DNS e redirects.
  - **IDOR / BOLA:** Proteger rotas de dados amarrando o dono ao token de autenticação e retornando 404 em acessos não autorizados.
  - **Documentação Obrigatória:** Manter o `DOCUMENTO-DE-ALTERACOES.md` preenchido conforme o modelo da Parte 9 do guia.

---

## 4. Próximos Passos
1. Corrigir os 4 erros de digitação/bugs no backend.
2. Limpar as credenciais mock do frontend.
3. Aplicar as proteções do guia (`ssrf-guard.ts` e controle de ownership).
4. Gerar o `DOCUMENTO-DE-ALTERACOES.md` final.
5. Preparar a versão de demonstração (ocultar rota admin, testar fluxo completo).
