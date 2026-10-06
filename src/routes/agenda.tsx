import { createFileRoute, Link } from "@tanstack/react-router";
import { Music } from "lucide-react";
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
        <div className="rounded-xl border border-border bg-card px-6">
          {shows.map((s) => (
            <div key={s.day} className="flex flex-row items-center justify-between border-b border-border py-4 last:border-b-0">
              <div className="flex items-center gap-4">
                <Music className="text-primary" size={22} />
                <div>
                  <p className="font-bold">{s.day}: {s.artist}</p>
                  <p className="text-sm text-muted-foreground">{s.genre}</p>
                </div>
              </div>
              <span className="font-nav font-bold text-primary">{s.time}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/reserva" className="rounded-full bg-primary px-8 py-3 font-nav font-bold text-primary-foreground transition hover:bg-primary-hover hover:shadow-glow">
            Garantir minha mesa
          </Link>
        </div>
      </div>
    </PageFade>
  );
}
