import { createFileRoute, Link } from "@tanstack/react-router";
import { Music } from "lucide-react";
import { motion } from "framer-motion";
import { PageFade, PageTitle } from "@/components/site/PageFade";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda de Shows — Maré Pura" },
      { name: "description", content: "Confira os shows ao vivo da semana no Maré Pura." },
      { property: "og:title", content: "Agenda de Shows — Maré Pura" },
      { property: "og:description", content: "Música ao vivo de frente para o mar." },
    ],
  }),
  component: Agenda,
});

// Simula dados vindos de um CMS — troque por uma busca real quando houver backend.
const shows = [
  { day: "Quinta", artist: "Duo Areia", genre: "Voz & Violão", time: "20h" },
  { day: "Sexta", artist: "Banda Maré", genre: "Surf Rock", time: "21h" },
  { day: "Sábado", artist: "Luau Tropical", genre: "Reggae", time: "21h" },
  { day: "Domingo", artist: "Roda de Samba Pé na Areia", genre: "Samba", time: "17h" },
];

function Agenda() {
  return (
    <PageFade>
      <PageTitle title="Agenda" subtitle="Palco aceso, toda semana." />
      <div className="mx-auto max-w-3xl px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xs p-2 shadow-xs"
        >
          {shows.map((s, idx) => (
            <motion.div
              key={s.day}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              whileHover={{ x: 6 }}
              className="flex flex-row items-center justify-between rounded-xl px-4 py-4 transition-colors hover:bg-accent/40"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Music size={20} />
                </div>
                <div>
                  <p className="font-bold tracking-tight">{s.day}: {s.artist}</p>
                  <p className="text-sm text-muted-foreground">{s.genre}</p>
                </div>
              </div>
              <span className="font-nav font-bold text-primary">{s.time}</span>
            </motion.div>
          ))}
        </motion.div>
        <div className="mt-10 text-center">
          <Link
            to="/reserva"
            className="inline-block rounded-full bg-primary px-8 py-3 font-nav font-bold text-primary-foreground shadow-sm transition hover:bg-primary-hover hover:shadow-glow hover:scale-105"
          >
            Garantir minha mesa
          </Link>
        </div>
      </div>
    </PageFade>
  );
}
