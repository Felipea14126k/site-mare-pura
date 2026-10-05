import { createFileRoute } from "@tanstack/react-router";
import { Instagram, MapPin, MessageCircle, Star } from "lucide-react";
import { PageFade, PageTitle } from "@/components/site/PageFade";
import { WHATSAPP_URL } from "@/components/site/WhatsAppFab";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato e Localização — Maré Pura" },
      { name: "description", content: "Av. Beira Mar, 1000. Fale com o Maré Pura pelo WhatsApp ou Instagram." },
      { property: "og:title", content: "Contato — Maré Pura" },
      { property: "og:description", content: "Encontre o Maré Pura na Av. Beira Mar, 1000." },
    ],
  }),
  component: Contato,
});

const btn = "flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 font-nav font-bold transition hover:border-primary hover:text-primary hover:shadow-glow";

function Contato() {
  return (
    <PageFade>
      <PageTitle title="Contato" subtitle="Vem pra beira-mar." />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pb-24 md:grid-cols-2 md:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-xl bg-card p-6">
            <MapPin className="mt-1 text-primary" />
            <div>
              <p className="font-bold">Endereço</p>
              <p className="text-muted-foreground">Av. Beira Mar, 1000</p>
            </div>
          </div>
          {/* Substitua as URLs abaixo pelos perfis reais */}
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={btn}><MessageCircle /> WhatsApp</a>
          <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className={btn}><Instagram /> Instagram</a>
          <a href="https://www.google.com/maps/search/?api=1&query=Av.+Beira+Mar+1000" target="_blank" rel="noopener noreferrer" className={btn}><Star /> Avalie-nos no Google</a>
        </div>
        <iframe
          title="Mapa Maré Pura"
          src="https://www.google.com/maps?q=Av.+Beira+Mar+1000&output=embed"
          className="h-[400px] w-full rounded-xl border-0 shadow-lg md:h-full md:min-h-[420px]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </PageFade>
  );
}
