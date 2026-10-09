/**
 * ==============================================================================
 * SERVIDOR — BANCO DE DADOS LOCAL EM ARQUIVO JSON (banco.server.ts)
 * ==============================================================================
 * 
 * Este arquivo funciona como o "banco de dados" do sistema.
 * Em vez de usar bancos pesados como PostgreSQL ou MySQL em desenvolvimento,
 * guardamos os dados em um arquivo de texto formatado: servidor/dados/banco.json.
 * 
 * Para evitar que o arquivo seja corrompido quando duas pessoas salvam dados ao mesmo
 * tempo, usamos uma fila assíncrona (Promise queue) e gravação atômica (arquivo .tmp).
 * ==============================================================================
 */

import { promises as fs } from "fs";
import path from "path";

// ==============================================================================
// 1. TIPOS DE DADOS (TypeScript Interfaces)
// ==============================================================================

// Estrutura de um prato do cardápio
export type Prato = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  imagem?: string;
};

// Estrutura de um evento/show musical
export type Show = {
  id: string;
  data: string;
  banda: string;
  estilo: string;
};

// Estados possíveis de uma reserva de mesa
export type ReservaStatus = "Pendente" | "Confirmada" | "Cancelada";

// Estrutura completa de uma reserva feita por um cliente
export type Reserva = {
  id: string;
  nome: string;
  whatsapp: string;
  data: string;
  horario: string;
  pessoas: number;
  status: ReservaStatus;
  criadaEm: string;
  ip?: string;
};

// Estrutura global do banco de dados completo
export type Banco = {
  pratos: Prato[];
  shows: Show[];
  reservas: Reserva[];
};

// ==============================================================================
// 2. CONFIGURAÇÃO DE CAMINHOS NO DISCO
// ==============================================================================

// Pasta onde o arquivo JSON é guardado (ex: .../servidor/dados)
const PASTA = path.join(process.cwd(), "servidor", "dados");

// Caminho absoluto do arquivo banco.json
const ARQUIVO = path.join(PASTA, "banco.json");

// Helper para gerar identificadores únicos universais (UUIDs aleatórios)
const uid = () => crypto.randomUUID();

// Helper para calcular datas futuras (ex: amanhã, depois de amanhã) em formato ISO AAAA-MM-DD
const emDias = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

/**
 * inicial()
 * Retorna os dados padrão do restaurante caso o arquivo banco.json ainda não exista.
 */
function inicial(): Banco {
  return {
    pratos: [
      { id: uid(), nome: "Moqueca Capixaba", categoria: "Comidas", descricao: "Peixe, tomate e coentro na panela de barro." },
      { id: uid(), nome: "Caipirinha de Caju", categoria: "Bebidas", descricao: "Cachaça artesanal e caju fresco." },
      { id: uid(), nome: "Burger do Mar", categoria: "Lanches", descricao: "Camarão empanado no pão brioche." },
      { id: uid(), nome: "Pudim de Coco", categoria: "Sobremesas", descricao: "Cremoso, com calda de caramelo." },
      { id: uid(), nome: "Isca de Peixe", categoria: "Porções", descricao: "Com molho tártaro da casa." },
    ],
    shows: [
      { id: uid(), data: emDias(1), banda: "Duo Areia", estilo: "Voz e Violão" },
      { id: uid(), data: emDias(2), banda: "Banda Maré", estilo: "Surf Rock" },
    ],
    reservas: [],
  };
}

// ==============================================================================
// 3. CONTROLE DE CONCORRÊNCIA E FILA ATÔMICA
// ==============================================================================

// Fila em cadeia de Promises: garante que cada gravação espere a anterior terminar
let fila: Promise<unknown> = Promise.resolve();

/**
 * ler()
 * Abre e lê o arquivo banco.json do disco.
 * Se o arquivo não existir (primeira vez que o site roda), cria com os dados padrão de inicial().
 */
export async function ler(): Promise<Banco> {
  try {
    const conteudo = await fs.readFile(ARQUIVO, "utf8");
    return JSON.parse(conteudo) as Banco;
  } catch {
    // Se o arquivo ainda não existe no disco, grava os dados iniciais e retorna
    const b = inicial();
    await gravar(b);
    return b;
  }
}

/**
 * gravar(banco)
 * Salva os dados no disco de forma ATÔMICA e segura:
 *  1. Garante que a pasta 'servidor/dados' exista.
 *  2. Grava primeiro em um arquivo temporário (.tmp).
 *  3. Renomeia o arquivo temporário para banco.json de uma vez só.
 * Isso impede que o arquivo fique corrompido se o computador for desligado no meio da gravação.
 */
async function gravar(b: Banco): Promise<void> {
  await fs.mkdir(PASTA, { recursive: true });
  const tmp = ARQUIVO + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(b, null, 2), "utf8");
  try {
    await fs.rename(tmp, ARQUIVO);
  } catch {
    // Fallback defensivo para Windows/OneDrive caso o rename sofra lock temporário
    await fs.copyFile(tmp, ARQUIVO);
    await fs.unlink(tmp).catch(() => undefined);
  }
}

/**
 * alterar(funcaoModificadora)
 * Executa uma alteração no banco de dados de forma totalmente sincronizada.
 * Exemplo de uso:
 *   await db.alterar((b) => {
 *     b.pratos.push(novoPrato);
 *   });
 */
export function alterar<T>(fn: (b: Banco) => T): Promise<T> {
  const p = fila.then(async () => {
    const b = await ler();
    const r = fn(b); // Executa a alteração na memória
    await gravar(b); // Salva no arquivo com segurança
    return r;
  });

  // Mantém a fila viva mesmo se alguma gravação falhar
  fila = p.catch(() => undefined);
  return p;
}

export { uid };
