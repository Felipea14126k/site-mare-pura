/**
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
  const c = credenciais();
  const emailOk = email === c.email;
  const senhaOk = senhaConfere(senha, c.hash);
  return emailOk && senhaOk;
}

/* Limite simples de reservas públicas: 5 por minuto por IP (anti-spam). */
const envios = new Map<string, number[]>();
export function excedeuReservas(ip: string) {
  const agora = Date.now();
  const lista = (envios.get(ip) ?? []).filter((t) => agora - t < 60_000);
  lista.push(agora);
  envios.set(ip, lista);
  return lista.length > 5;
}

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
  horario: z.enum(["18:00", "19:00", "20:00", "21:00", "22:00"]),
  pessoas: z.number().int().min(1).max(30),
});

export const pratoSchema = z.object({
  nome: texto(60).pipe(z.string().regex(NOME)),
  categoria: z.enum(CATEGORIAS),
  descricao: texto(200),
  // Foto: link https ou arquivo enviado (data URL de imagem, até ~1,5 MB).
  imagem: z
    .string()
    .max(2_000_000)
    .refine((v) => /^https:\/\/[^\s"'<>]+$/.test(v) || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v), "Imagem inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const showSchema = z.object({
  data: z.string().regex(DATA).refine((d) => d >= hoje(), "Data no passado"),
  banda: texto(60).pipe(z.string().regex(NOME)),
  estilo: texto(60).pipe(z.string().regex(NOME)),
});

export const loginSchema = z.object({
  email: z.string().email().max(100),
  senha: z.string().min(1).max(100),
});

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" },
  });
