import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import food from "@/assets/food.jpg";
import people from "@/assets/people.jpg";
import { PageFade, PageTitle } from "@/components/site/PageFade";

export const Route = createFileRoute("/cardapio")({
  head: () => ({
    meta: [
      { title: "Cardápio — Maré Pura" },
      { name: "description", content: "Comidas, bebidas, lanches, sobremesas, vinhos, combos e porções do Maré Pura." },
      { property: "og:title", content: "Cardápio — Maré Pura" },
      { property: "og:description", content: "Conheça os sabores do Maré Pura." },
    ],
  }),
  component: Cardapio,
});

const tabs = ["Comidas", "Bebidas", "Lanches", "Sobremesas", "Vinhos", "Combos", "Porções"] as const;
type Cat = (typeof tabs)[number];

// REGRA DE NEGÓCIO: itens sem preço. Substitua `img` pelas fotos reais de cada prato.
const items: { cat: Cat; name: string; desc: string; img: string }[] = [
  { cat: "Comidas", name: "Moqueca Maré", desc: "Peixe do dia, leite de coco, dendê e pimentões.", img: food },
  { cat: "Comidas", name: "Peixe na Brasa", desc: "Peixe inteiro grelhado com limão e ervas.", img: food },
  { cat: "Comidas", name: "Risoto de Camarão", desc: "Arbóreo cremoso com camarões e limão siciliano.", img: food },
  { cat: "Bebidas", name: "Caipirinha Clássica", desc: "Cachaça artesanal, limão e açúcar.", img: people },
  { cat: "Bebidas", name: "Pôr do Sol Spritz", desc: "Aperol, espumante e laranja.", img: people },
  { cat: "Bebidas", name: "Água de Coco", desc: "Gelada, direto do coco.", img: people },
  { cat: "Lanches", name: "Burger do Pescador", desc: "Blend de peixe, maionese de ervas e brioche.", img: food },
  { cat: "Lanches", name: "Wrap de Camarão", desc: "Camarão, rúcula e molho cítrico.", img: food },
  { cat: "Lanches", name: "Sanduíche Caiçara", desc: "Peixe empanado, salada e tártaro.", img: food },
  { cat: "Sobremesas", name: "Pudim de Coco", desc: "Calda de caramelo e coco queimado.", img: food },
  { cat: "Sobremesas", name: "Brownie na Areia", desc: "Brownie, sorvete e farofa de castanha.", img: food },
  { cat: "Sobremesas", name: "Mousse de Maracujá", desc: "Leve, azedinha e gelada.", img: food },
  { cat: "Vinhos", name: "Branco da Casa", desc: "Sauvignon Blanc fresco e mineral.", img: people },
  { cat: "Vinhos", name: "Rosé Litoral", desc: "Frutado, perfeito para o fim de tarde.", img: people },
  { cat: "Vinhos", name: "Espumante Brut", desc: "Bolhas finas para celebrar.", img: people },
  { cat: "Combos", name: "Combo Luau", desc: "Porção de camarão + 2 caipirinhas.", img: food },
  { cat: "Combos", name: "Combo Família", desc: "Moqueca para 4 + jarra de suco.", img: food },
  { cat: "Porções", name: "Camarão Alho e Óleo", desc: "Camarões dourados no alho.", img: food },
  { cat: "Porções", name: "Isca de Peixe", desc: "Tirinhas empanadas com molho tártaro.", img: food },
  { cat: "Porções", name: "Lula à Dorê", desc: "Anéis de lula crocantes e limão.", img: food },
];

function Cardapio() {
  const [active, setActive] = useState<Cat>("Comidas");
  const [remoto, setRemoto] = useState<typeof items | null>(null);
  useEffect(() => {
    // Busca sempre a versão mais nova do servidor (sem cache) e atualiza ao voltar para a aba.
    const carregar = () =>
      fetch("/api/cardapio", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { pratos?: { id: string; nome: string; categoria: string; descricao: string; imagem?: string }[] } | null) => {
          if (d?.pratos)
            setRemoto(d.pratos.map((p) => ({ cat: p.categoria as Cat, name: p.nome, desc: p.descricao, img: p.imagem || food })));
        })
        .catch(() => {});
    void carregar();
    const t = setInterval(carregar, 15_000);
    window.addEventListener("focus", carregar);
    return () => { clearInterval(t); window.removeEventListener("focus", carregar); };
  }, []);
  const list = (remoto ?? items).filter((i) => i.cat === active);
  return (
    <PageFade>
      <PageTitle title="Cardápio" subtitle="Do mar para a sua mesa." />
      <div className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <div className="flex gap-2 overflow-x-auto pb-2 md:justify-center">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`whitespace-nowrap rounded-full px-5 py-2 font-nav font-bold transition ${
                active === t
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-card text-muted-foreground hover:text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial="hidden"
            animate="show"
            exit="exit"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.06 },
              },
              exit: { opacity: 0 },
            }}
            className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {list.map((i) => (
              <motion.article
                key={i.name}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
                }}
                whileHover={{ y: -6 }}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xs shadow-xs transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:shadow-primary/5"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={i.img}
                    alt={i.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{i.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{i.desc}</p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageFade>
  );
}
