import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, UtensilsCrossed } from "lucide-react";
import { Card, PageHeader } from "@/components/admin/ui";
import { todayISO, useAdminData } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Visão Geral — Painel Maré Pura" },
      { name: "description", content: "Resumo do cardápio, shows e reservas do Maré Pura." },
      { property: "og:title", content: "Visão Geral — Painel Maré Pura" },
      { property: "og:description", content: "Métricas do painel administrativo." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { pratos, shows, reservas } = useAdminData();
  const week = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const metrics = [
    { label: "Total de Pratos", value: pratos.length, icon: UtensilsCrossed },
    { label: "Shows esta semana", value: shows.filter((s) => s.data >= todayISO() && s.data <= week).length, icon: CalendarDays },
    { label: "Reservas Pendentes", value: reservas.filter((r) => r.status === "Pendente").length, icon: ClipboardList },
  ];
  return (
    <>
      <PageHeader title="Visão Geral" />
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label} className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-[var(--admin-muted)]">{m.label}</p>
              <p className="mt-1 text-3xl font-bold">{m.value}</p>
            </div>
            <div className="rounded-lg bg-[var(--admin-primary)]/10 p-3 text-[var(--admin-primary)]"><m.icon size={22} /></div>
          </Card>
        ))}
      </div>
    </>
  );
}
