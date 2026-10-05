/**
 * SERVIDOR — Banco de dados local em arquivo JSON.
 * Os dados ficam gravados em servidor/dados/banco.json na máquina que roda o site
 * (ex.: o Kali). Toda leitura/escrita passa por aqui, só no servidor.
 */
import { promises as fs } from "fs";
import path from "path";

export type Prato = { id: string; nome: string; categoria: string; descricao: string; imagem?: string };
export type Show = { id: string; data: string; banda: string; estilo: string };
export type ReservaStatus = "Pendente" | "Confirmada" | "Cancelada";
export type Reserva = {
  id: string; nome: string; whatsapp: string; data: string; horario: string;
  pessoas: number; status: ReservaStatus; criadaEm: string; ip?: string;
};
export type Banco = { pratos: Prato[]; shows: Show[]; reservas: Reserva[] };

const PASTA = path.join(process.cwd(), "servidor", "dados");
const ARQUIVO = path.join(PASTA, "banco.json");

const uid = () => crypto.randomUUID();
const emDias = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

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

// Fila simples para evitar duas gravações simultâneas corromperem o arquivo.
let fila: Promise<unknown> = Promise.resolve();

export async function ler(): Promise<Banco> {
  try {
    return JSON.parse(await fs.readFile(ARQUIVO, "utf8")) as Banco;
  } catch {
    const b = inicial();
    await gravar(b);
    return b;
  }
}

async function gravar(b: Banco) {
  await fs.mkdir(PASTA, { recursive: true });
  const tmp = ARQUIVO + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(b, null, 2), "utf8");
  await fs.rename(tmp, ARQUIVO);
}

export function alterar<T>(fn: (b: Banco) => T): Promise<T> {
  const p = fila.then(async () => {
    const b = await ler();
    const r = fn(b);
    await gravar(b);
    return r;
  });
  fila = p.catch(() => undefined);
  return p;
}

export { uid };
