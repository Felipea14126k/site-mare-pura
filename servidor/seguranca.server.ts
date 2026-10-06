/**
<<<<<<< HEAD
 * ==============================================================================
 * SERVIDOR — NÚCLEO DE SEGURANÇA (Hardening & Proteção Ativa)
 * ==============================================================================
 * 
 * Este arquivo roda EXCLUSIVAMENTE no servidor (Node.js).
 * O navegador do usuário nunca recebe este código nem consegue burlar estas regras.
 * Aqui controlamos:
 *  1. Tokens Anti-CSRF Dinâmicos (Lição 3)
 *  2. Throttling e Detecção de Ataques (Anti-DDoS / Força Bruta)
 *  3. Criptografia de Senha do Administrador (scryptSync + timingSafeEqual)
 *  4. Sessões de Acesso (Tokens temporários de 8 horas)
 *  5. Rate Limiting por IP (Bloqueio após 3 falhas consecutivas)
 *  6. Sanitização contra injeção de código malicioso (Anti-XSS)
 *  7. Schemas de validação estrita de dados com Zod
 * ==============================================================================
 */

import { z } from "zod";
import { scryptSync, timingSafeEqual, randomBytes } from "node:crypto";

// ==============================================================================
// 1. TOKENS ANTI-CSRF DINÂMICOS (Lição 3: Proteção contra Comandos Forjados)
// ==============================================================================

// Mapa em memória RAM que armazena os tokens válidos e a hora em que foram criados
const tokensCSRF = new Map<string, number>();

// Tempo limite de vida de um token: 10 minutos (em milissegundos)
const TEMPO_EXPIRACAO_CSRF = 10 * 60 * 1000;

/**
 * gerarTokenCSRF()
 * Cria um token imprevisível de uso único usando entropia de hardware (criptografia forte).
 * Retorna uma string hexadecimal de 64 caracteres.
 */
export function gerarTokenCSRF(): string {
  // Gera 32 bytes totalmente aleatórios e converte para texto hexadecimal
  const token = randomBytes(32).toString("hex");

  // Guarda o token no servidor junto com o horário exato da criação
  tokensCSRF.set(token, Date.now());

  return token;
}

/**
 * validarTokenCSRF(token)
 * Verifica se o token enviado pelo cliente é legítimo, se não caducou e o queima (uso único).
 * Retorna true se for válido, ou false se for forjado/expirado.
 */
export function validarTokenCSRF(token: string | undefined | null): boolean {
  if (!token) return false;

  const criadoEm = tokensCSRF.get(token);
  if (!criadoEm) return false; // Token não existe na memória (ou já foi usado)

  // Se o token foi criado há mais de 10 minutos, ele expirou
  if (Date.now() - criadoEm > TEMPO_EXPIRACAO_CSRF) {
    tokensCSRF.delete(token); // Limpa da RAM para não acumular
    return false;
  }

  // REGRA DE USO ÚNICO (One-time token):
  // Queimamos o token imediatamente após o uso para impedir que um atacante o reutilize!
  tokensCSRF.delete(token);

  return true;
}

// ==============================================================================
// 2. THROTTLING INTELIGENTE (Anti-Ataque Global por Rota & Volume)
// ==============================================================================

// Estrutura para registrar cada requisição recebida nos últimos 60 segundos
type RequisicaoInfo = { tempo: number; ip: string };

// Mapa que guarda o histórico de acessos por rota (ex: "/api/login" -> [{tempo, ip}, ...])
const reqGlobal = new Map<string, RequisicaoInfo[]>();

const MAX_REQS_POR_MINUTO = 100;       // Limite de requisições por minuto na mesma rota
const LIMITE_IPS_UNICOS_POR_MINUTO = 20; // Se mais de 20 computadores diferentes atacarem, é suspeito

/**
 * detectarAtaque(rota, ip)
 * Monitora o tráfego da rota e detecta se estamos sob ataque de força bruta ou ataque distribuído.
 * Elimina automaticamente registros com mais de 1 minuto para EVITAR VAZAMENTO DE MEMÓRIA (Memory Leak).
 */
export function detectarAtaque(rota: string, ip: string): boolean {
  const agora = Date.now();
  const umMinuto = 60_000;

  // Filtra apenas as requisições ocorridas nos últimos 60 segundos (limpa a RAM)
  const historico = (reqGlobal.get(rota) ?? []).filter((r) => agora - r.tempo < umMinuto);

  // Adiciona a requisição atual ao histórico
  historico.push({ tempo: agora, ip });
  reqGlobal.set(rota, historico);

  // Critério 1: Ataque distribuído (muitos IPs diferentes disparando contra a mesma rota)
  const ipsUnicos = new Set(historico.map((r) => r.ip));
  if (ipsUnicos.size > LIMITE_IPS_UNICOS_POR_MINUTO) {
    console.warn(`⚠️ ATAQUE DETECTADO em ${rota}: ${ipsUnicos.size} IPs únicos em 1 minuto`);
    return true;
  }

  // Critério 2: Ataque de força bruta por volume (excesso de requisições totais)
  if (historico.length > MAX_REQS_POR_MINUTO) {
    console.warn(`⚠️ ATAQUE DETECTADO em ${rota}: ${historico.length} requisições em 1 minuto`);
    return true;
  }

  return false;
}

/**
 * aplicarThrottle(ip)
 * Em vez de apenas bloquear o atacante, aplica um atraso forçado (delay de 0 a 4 segundos).
 * Isso estrangula a velocidade de scripts automatizados de invasão.
 */
export function aplicarThrottle(ip: string): number {
  if (!ip) return 1000;
  // Pega o código numérico do primeiro e do último caractere do IP
  const prim = ip.charCodeAt(0) || 0;
  const ult = ip.charCodeAt(ip.length - 1) || 0;
  const hash = prim + ult;

  // O operador '%' (resto da divisão por 5) distribui os atrasos entre 0 e 4 segundos
  return (hash % 5) * 1000;
}

// ==============================================================================
// 3. CREDENCIAIS E CRIPTOGRAFIA DE SENHA (scryptSync + timingSafeEqual)
// ==============================================================================

/**
 * credenciais()
 * Lê o e-mail e o hash da senha configurados nas variáveis de ambiente do sistema operacional.
 * Se não estiverem configurados, impede o servidor de rodar desprotegido.
 */
const credenciais = () => {
  const email = process.env["ADMIN_EMAIL"]?.trim();
  const hash = process.env["ADMIN_SENHA_HASH"];
  if (!email || !hash) throw new Error("Credenciais do admin não configuradas nas variáveis de ambiente!");
  return { email, hash };
};

/**
 * senhaConfere(senhaDigitada, hashArmazenado)
 * Compara a senha digitada pelo usuário com o hash salvo no formato "salt:hash".
 * Usa o algoritmo 'scrypt' (muito resistente a ataques por placas de vídeo)
 * e 'timingSafeEqual' para impedir ataques de tempo (Timing Attacks).
 */
function senhaConfere(senhaDigitada: string, hashArmazenado: string): boolean {
  const [saltHex, hashHex] = hashArmazenado.split(":");
  if (!saltHex || !hashHex) return false;

  const esperado = Buffer.from(hashHex, "hex");
  // Recalcula o hash da senha digitada usando o mesmo salt
  const calculado = scryptSync(senhaDigitada, Buffer.from(saltHex, "hex"), esperado.length);

  // timingSafeEqual leva sempre o mesmo tempo para responder, evitando que atacantes adivinhem caracteres por milissegundos
  return timingSafeEqual(calculado, esperado);
}

/**
 * conferirLogin(email, senha)
 * Valida conjuntamente se o e-mail confere e se a senha está correta.
 */
export function conferirLogin(email: string, senha: string): boolean {
=======
 * SERVIDOR — Segurança: login, sessões, rate limiting, sanitização e validação.
 * Tudo aqui roda no servidor, então o navegador não consegue burlar.
 */
import { z } from "zod";
import { scryptSync, timingSafeEqual } from "node:crypto"
import { Socket } from "node:dgram";
import { number } from "framer-motion";

//Contador global por rota
const reqGlobal = new Map<string, number[]>();
const MAX_REQS_POR_MINUTO = 100;

const ipsUnicos = new Map<string, Set<string>>();
const LIMITE_IPS_UNICOS_POR_MINUTO = 20 // se tiver mais de 20 Ips, é suspeito

// Versão melhorada que limpa memória corretamente
export function detectarAtaque(rota: string, ip: string): boolean {
  const agora = Date.now();
  const umMinuto = 60_000;
  
  // Limpa dados antigos
  const reqs = (reqGlobal.get(rota) ?? []).filter(t => agora - t < umMinuto);
  reqGlobal.set(rota, reqs);
  
  // Se a lista está vazia, limpa o Map inteiro pra economizar memória
  if (reqs.length === 0) {
    reqGlobal.delete(rota);
    ipsUnicos.delete(rota);
    return false;
  }
  
  // Conta IPs únicos só dos últimos 1 minuto
  const ipsUnicos_Local = new Set<string>();
  reqs.forEach(() => ipsUnicos_Local.add(ip)); // Adiciona o IP atual uma vez
  
  // Adiciona nova requisição
  reqs.push(agora);
  reqGlobal.set(rota, reqs);
  
  // Critério 1: Muitos IPs únicos em pouco tempo
  if (ipsUnicos_Local.size > LIMITE_IPS_UNICOS_POR_MINUTO) {
    console.warn(` ATAQUE DETECTADO em ${rota}: ${ipsUnicos_Local.size} IPs em 1 minuto`);
    return true;
  }
  
  // Critério 2: Muitas requisições totais
  if (reqs.length > MAX_REQS_POR_MINUTO) {
    console.warn(` ATAQUE DETECTADO em ${rota}: ${reqs.length} requisições em 1 minuto`);
    return true;
  }
  
  return false;
}

// Se foi detectado ataque, THROTTLE (desacelera) em vez de bloquear
export function aplicarThrottle(ip: string): number {
  // Retorna um delay em milissegundos
  // Quanto mais suspeito, maior o delay
  const hash = ip.charCodeAt(0) + ip.charCode(ip.length - 1) ;
  return (hash % 5) * 1000; // 0 a 5 segundos de delay para hash
}

// Credenciais do admin. Troque com variáveis de ambiente ao rodar o servidor:
//   ADMIN_EMAIL=... ADMIN_SENHA=... npm run dev -- --host
const credenciais = () => {
  const email = process.env["ADMIN_EMAIL"]?.trim();
  const hash = process.env["ADMIN_SENHA_HASH"];
  if (!email || !hash) throw new Error ("Credenciais do admin não configuradas");
  return { email, hash };
};

function senhaConfere(senha: string, armazenado: string){
  const [saltHex, hashHex] = armazenado.split(":");
  if (!saltHex || !hashHex) return false
  const esperado = Buffer.from(hashHex, "hex");
  const calculado = scryptSync(senha, Buffer.from(saltHex, "hex"), esperado.length);
  return timingSafeEqual(calculado, esperado);
}
/* ---------- Sessões (token na memória do servidor, expira em 8h) ---------- */
const sessoes = new Map<string, number>();
const DURACAO = 8 * 60 * 60 * 1000;

export function criarSessao() {
  const token = crypto.randomUUID() + crypto.randomUUID();
  sessoes.set(token, Date.now() + DURACAO);
  return token;
}
export function encerrarSessao(token: string) { sessoes.delete(token); }

export function tokenDe(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}
export function autenticado(req: Request) {
  const t = tokenDe(req);
  const exp = t ? sessoes.get(t) : undefined;
  if (!exp) return false;
  if (exp < Date.now()) { sessoes.delete(t); return false; }
  return true;
}

/* ---------- Rate limiting por IP ---------- */
const tentativas = new Map<string, { n: number; bloqueadoAte: number }>();
export function ipDe(req: Request) {
  // Em desenvolvimento local, o IP vem do socket
 const socketIp = (req as any).socket?.remoteAddress;
  // Se for localhost (127.0.0.1, ::1, ::ffff:127.0.0.1), usa o socket
 if (socketIp && (socketIp.includes ("127.0.0.1") || socketIp.includes("::1") || socketIp.include ("::ffff:127.0.0.1"))){
  return socketIp
 }
 
 const forwarded = req.headers.get("x-forwarded-for");
 if (forwarded) {
   const ips = forwarded.split(",").map(ip => ip.trim());
   return ips[ips.length - 1]; // Pega o ÚLTIMO IP, não o primeiro
  }
  // Fallback seguro
  return req.headers.get("x-real-ip") || "unknown";
}
  

export function bloqueado(ip: string) {
  const t = tentativas.get(ip);
  return t && t.bloqueadoAte > Date.now() ? Math.ceil((t.bloqueadoAte - Date.now()) / 1000) : 0;
}
export function registrarFalha(ip: string) {
  const t = tentativas.get(ip) ?? { n: 0, bloqueadoAte: 0 };
  t.n += 1;
  if (t.n >= 3) { t.n = 0; t.bloqueadoAte = Date.now() + 15_000; }
  tentativas.set(ip, t);
}
export function limparFalhas(ip: string) { tentativas.delete(ip); }

export function conferirLogin(email: string, senha: string) {
>>>>>>> 10c1c96e1b8bce24ea72e89322e56a029e88295b
  const c = credenciais();
  const emailOk = email === c.email;
  const senhaOk = senhaConfere(senha, c.hash);
  return emailOk && senhaOk;
}

<<<<<<< HEAD
// ==============================================================================
// 4. GESTÃO DE SESSÕES (Tokens de Acesso ao Painel Admin)
// ==============================================================================

// Mapa em memória que armazena os tokens de sessão ativos e o momento em que expiram
const sessoes = new Map<string, number>();
const DURACAO_SESSAO = 8 * 60 * 60 * 1000; // 8 horas de duração máxima de login

/**
 * criarSessao()
 * Gera um token UUID duplo e registra no servidor com validade de 8 horas.
 */
export function criarSessao(): string {
  const token = crypto.randomUUID() + crypto.randomUUID();
  sessoes.set(token, Date.now() + DURACAO_SESSAO);
  return token;
}

/**
 * encerrarSessao(token)
 * Destrói a sessão no logout do usuário.
 */
export function encerrarSessao(token: string): void {
  sessoes.delete(token);
}

/**
 * tokenDe(req)
 * Extrai o token de autenticação enviado no cabeçalho HTTP: "Authorization: Bearer <token>".
 */
export function tokenDe(req: Request): string {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}

/**
 * autenticado(req)
 * Verifica se a requisição possui um token válido e não expirado.
 */
export function autenticado(req: Request): boolean {
  const t = tokenDe(req);
  const exp = t ? sessoes.get(t) : undefined;
  if (!exp) return false;
  if (exp < Date.now()) {
    sessoes.delete(t); // Remove sessão expirada da memória
    return false;
  }
  return true;
}

// ==============================================================================
// 5. RATE LIMITING POR IP (Bloqueio Temporário Anti-Força Bruta)
// ==============================================================================

// Guarda: IP -> { n: quantidade de erros, bloqueadoAte: timestamp }
const tentativas = new Map<string, { n: number; bloqueadoAte: number }>();

/**
 * ipDe(req)
 * Extrai o endereço IP real do cliente, tratando conexões locais e proxies reversos.
 */
export function ipDe(req: Request): string {
  // Em desenvolvimento local, o IP vem diretamente do socket da conexão
  const socketIp = (req as any).socket?.remoteAddress;
  if (socketIp && (socketIp.includes("127.0.0.1") || socketIp.includes("::1") || socketIp.includes("::ffff:127.0.0.1"))) {
    return socketIp;
  }

  // Em produção atrás de proxy (como Cloudflare), o IP original vem no header x-forwarded-for
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    return ips[ips.length - 1] ?? "unknown"; // Pega o último IP da cadeia de confiança (fallback seguro)
  }

  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * bloqueado(ip)
 * Verifica se o IP está em período de penalidade. Retorna quantos segundos faltam para desbloquear (ou 0 se livre).
 */
export function bloqueado(ip: string): number {
  const t = tentativas.get(ip);
  return t && t.bloqueadoAte > Date.now() ? Math.ceil((t.bloqueadoAte - Date.now()) / 1000) : 0;
}

/**
 * registrarFalha(ip)
 * Incrementa o contador de erros do IP. Se errar 3 vezes, bloqueia o IP por 15 segundos.
 */
export function registrarFalha(ip: string): void {
  const t = tentativas.get(ip) ?? { n: 0, bloqueadoAte: 0 };
  t.n += 1;
  if (t.n >= 3) {
    t.n = 0;
    t.bloqueadoAte = Date.now() + 15_000; // Penalidade de 15 segundos
  }
  tentativas.set(ip, t);
}

/**
 * limparFalhas(ip)
 * Quando o usuário digita a senha correta, zera o histórico de erros do IP dele.
 */
export function limparFalhas(ip: string): void {
  tentativas.delete(ip);
}

// ==============================================================================
// 6. PROTEÇÃO ANTI-SPAM DE RESERVAS PÚBLICAS
// ==============================================================================

// Mapa para limitar envio de reservas de clientes anônimos
const envios = new Map<string, number[]>();

/**
 * excedeuReservas(ip)
 * Limita que o mesmo IP envie no máximo 5 reservas por minuto, impedindo que robôs lotem a agenda.
 */
export function excedeuReservas(ip: string): boolean {
=======
/* Limite simples de reservas públicas: 5 por minuto por IP (anti-spam). */
const envios = new Map<string, number[]>();
export function excedeuReservas(ip: string) {
>>>>>>> 10c1c96e1b8bce24ea72e89322e56a029e88295b
  const agora = Date.now();
  const lista = (envios.get(ip) ?? []).filter((t) => agora - t < 60_000);
  lista.push(agora);
  envios.set(ip, lista);
  return lista.length > 5;
}

<<<<<<< HEAD
// ==============================================================================
// 7. SANITIZAÇÃO DE TEXTO (Proteção Anti-XSS contra Injeção de Scripts)
// ==============================================================================

/**
 * sanitizar(texto)
 * Limpa qualquer tag HTML perigosa (<script>, <iframe>), comandos javascript: e aspas
 * para que o texto não consiga injetar código malicioso no navegador de quem visualizar.
 */
export function sanitizar(v: string): string {
  return v
    .replace(/<[^>]*>/g, "")      // Remove qualquer tag HTML (<...>)
    .replace(/javascript:/gi, "") // Remove links javascript:
    .replace(/on\w+\s*=/gi, "")   // Remove manipuladores de evento inline como onclick= ou onload=
    .replace(/[<>"'`]/g, "")      // Remove caracteres perigosos de interpolação
    .trim();
}

// ==============================================================================
// 8. SCHEMAS DE VALIDAÇÃO COM ZOD (Controle Estrito de Tipos)
// ==============================================================================

// Expressões regulares para garantir formato de dados limpo
const NOME = /^[A-Za-zÀ-ÿ0-9 ]{2,60}$/; // Letras com acentos, números e espaços (2 a 60 caracteres)
const DATA = /^\d{4}-\d{2}-\d{2}$/;      // Formato ISO: AAAA-MM-DD
const hoje = () => new Date().toISOString().slice(0, 10);

// Helper para sanitizar o texto antes de validar seu tamanho máximo
const texto = (max: number) => z.string().max(max * 2).transform(sanitizar).pipe(z.string().max(max));

// Categorias oficiais permitidas no restaurante
export const CATEGORIAS = ["Comidas", "Bebidas", "Lanches", "Sobremesas", "Vinhos", "Combos", "Porções"] as const;

// Validação dos dados do formulário de reserva pública
export const reservaSchema = z.object({
  nome: texto(80).pipe(z.string().min(2)),
  whatsapp: z.string().regex(/^\+?[0-9]{10,15}$/, "WhatsApp deve conter entre 10 e 15 dígitos numéricos"),
  data: z.string().regex(DATA).refine((d) => d >= hoje(), "Não é permitido reservar em datas do passado"),
=======
/* ---------- Sanitização (repetida no servidor contra XSS) ---------- */
export function sanitizar(v: string) {
  return v
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/[<>"'`]/g, "")
    .trim();
}

/* ---------- Validação estrita dos dados recebidos ---------- */
const NOME = /^[A-Za-zÀ-ÿ0-9 ]{2,60}$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const hoje = () => new Date().toISOString().slice(0, 10);
const texto = (max: number) => z.string().max(max * 2).transform(sanitizar).pipe(z.string().max(max));

export const CATEGORIAS = ["Comidas", "Bebidas", "Lanches", "Sobremesas", "Vinhos", "Combos", "Porções"] as const;

export const reservaSchema = z.object({
  nome: texto(80).pipe(z.string().min(2)),
  whatsapp: z.string().regex(/^\+?[0-9]{10,15}$/),
  data: z.string().regex(DATA).refine((d) => d >= hoje(), "Data no passado"),
>>>>>>> 10c1c96e1b8bce24ea72e89322e56a029e88295b
  horario: z.enum(["18:00", "19:00", "20:00", "21:00", "22:00"]),
  pessoas: z.number().int().min(1).max(30),
});

<<<<<<< HEAD
// Validação dos pratos cadastrados no painel administrativo
export const pratoSchema = z.object({
  nome: texto(60).pipe(z.string().regex(NOME, "Nome do prato deve ter entre 2 e 60 caracteres válidos")),
  categoria: z.enum(CATEGORIAS),
  descricao: texto(200),
=======
export const pratoSchema = z.object({
  nome: texto(60).pipe(z.string().regex(NOME)),
  categoria: z.enum(CATEGORIAS),
  descricao: texto(200),
  // Foto: link https ou arquivo enviado (data URL de imagem, até ~1,5 MB).
>>>>>>> 10c1c96e1b8bce24ea72e89322e56a029e88295b
  imagem: z
    .string()
    .max(2_000_000)
    .refine((v) => /^https:\/\/[^\s"'<>]+$/.test(v) || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v), "Imagem inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

<<<<<<< HEAD
// Validação dos shows cadastrados na agenda
export const showSchema = z.object({
  data: z.string().regex(DATA).refine((d) => d >= hoje(), "Data do show deve ser futura"),
=======
export const showSchema = z.object({
  data: z.string().regex(DATA).refine((d) => d >= hoje(), "Data no passado"),
>>>>>>> 10c1c96e1b8bce24ea72e89322e56a029e88295b
  banda: texto(60).pipe(z.string().regex(NOME)),
  estilo: texto(60).pipe(z.string().regex(NOME)),
});

<<<<<<< HEAD
// Validação do corpo da requisição de login
export const loginSchema = z.object({
  email: z.string().email("Formato de e-mail inválido").max(100),
  senha: z.string().min(1, "A senha não pode ser vazia").max(100),
});

// Helper universal para responder JSON com cabeçalhos de segurança contra cache indevido e MIME sniffing
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff", // Impede o navegador de tentar adivinhar tipos de arquivo
      "Cache-Control": "no-store",         // Impede navegadores e proxies de guardar dados confidenciais em cache
    },
=======
export const loginSchema = z.object({
  email: z.string().email().max(100),
  senha: z.string().min(1).max(100),
});

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" },
>>>>>>> 10c1c96e1b8bce24ea72e89322e56a029e88295b
  });
