import { MessageCircle } from "lucide-react";

// Substitua pelo número real do WhatsApp do Maré Pura
export const WHATSAPP_URL = "https://wa.me/5500000000000";

export function WhatsAppFab() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco no WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-whatsapp text-primary-foreground shadow-lg transition hover:scale-110"
    >
      <MessageCircle size={28} />
    </a>
  );
}
