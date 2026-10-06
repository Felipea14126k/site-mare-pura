import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
// Imagens: substitua pelos arquivos reais do local em src/assets/
import hero from "@/assets/hero.jpg";
import show from "@/assets/show.jpg";
import food from "@/assets/food.jpg";
import people from "@/assets/people.jpg";
import { PageFade } from "@/components/site/PageFade";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maré Pura — Restaurante e Casa de Shows à beira-mar" },
      { name: "description", content: "Comida boa, drinks gelados e música ao vivo de frente para o mar." },
      { property: "og:title", content: "Maré Pura — Restaurante e Casa de Shows" },
      { property: "og:description", content: "Comida boa, drinks gelados e música ao vivo de frente para o mar." },
    ],
  }),
  component: Home,
});

const vibe = [
  { src: people, alt: "Amigos brindando ao pôr do sol", cls: "md:row-span-2" },
  { src: food, alt: "Pratos de frutos do mar", cls: "" },
  { src: show, alt: "Show de surf rock ao vivo", cls: "md:row-span-2" },
  { src: hero, alt: "Casa cheia ao entardecer", cls: "" },
];

function Home() {
  return (
    <PageFade>
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        <img src={hero} alt="Maré Pura lotado ao pôr do sol" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 px-4 text-center"
        >
          <h1 className="font-display text-5xl text-primary-foreground text-soft-shadow md:text-7xl">Maré Pura</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/90">
            Sabores do mar, drinks gelados e música ao vivo até a maré subir.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/reserva" className="rounded-full bg-primary px-8 py-3 font-nav font-bold text-primary-foreground transition hover:bg-primary-hover hover:shadow-glow">
              Reservar mesa
            </Link>
            <Link to="/agenda" className="rounded-full border-2 border-primary-foreground/80 px-8 py-3 font-nav font-bold text-primary-foreground transition hover:bg-primary-foreground/10">
              Ver agenda
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <h2 className="text-center font-display text-3xl text-primary md:text-4xl">A Vibe</h2>
        <p className="mt-3 text-center text-muted-foreground">Gente boa, palco aceso e pé na areia.</p>
        <div className="mt-10 grid auto-rows-[220px] grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {vibe.map((v) => (
            <div key={v.alt} className={`overflow-hidden rounded-xl ${v.cls}`}>
              <img src={v.src} alt={v.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>
          ))}
        </div>
      </section>
    </PageFade>
  );
}
