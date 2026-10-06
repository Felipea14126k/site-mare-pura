import { createFileRoute } from "@tanstack/react-router";
import { Card, fmtDate, PageHeader, td, th } from "@/components/admin/ui";
import { setReservaStatus, useAdminData, type ReservaStatus } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/reservas")({
  head: () => ({
    meta: [
      { title: "Reservas — Painel Maré Pura" },
      { name: "description", content: "Acompanhe e confirme as reservas recebidas pelo site." },
      { property: "og:title", content: "Reservas — Painel Maré Pura" },
      { property: "og:description", content: "Gestão de reservas." },
    ],
  }),
  component: ReservasAdmin,
});

const STATUS: ReservaStatus[] = ["Pendente", "Confirmada", "Cancelada"];
const badge: Record<ReservaStatus, string> = {
  Pendente: "bg-amber-500/15 text-amber-600",
  Confirmada: "bg-emerald-500/15 text-emerald-600",
  Cancelada: "bg-red-500/15 text-red-500",
};

function ReservasAdmin() {
  const { reservas } = useAdminData();
  return (
    <>
      <PageHeader title="Reservas Recebidas" />
      <Card className="overflow-x-auto">
        <div className="overflow-x-auto"><table className="w-full min-w-[560px]">
          <thead><tr className="border-b border-[var(--admin-border)]">{["Nome", "WhatsApp", "Data", "Horário", "Pessoas", "Status", "Ações"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {reservas.map((r) => (
              <tr key={r.id} className="border-b border-[var(--admin-border)] last:border-0">
                <td className={`${td} font-medium`}>{r.nome}</td>
                <td className={td}>{r.whatsapp}</td>
                <td className={td}>{fmtDate(r.data)}</td>
                <td className={td}>{r.horario}</td>
                <td className={td}>{r.pessoas}</td>
                <td className={td}><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge[r.status]}`}>{r.status}</span></td>
                <td className={td}>
                  <div className="flex gap-1">
                    {STATUS.filter((s) => s !== r.status).map((s) => (
                      <button key={s} onClick={() => setReservaStatus(r.id, s)} className="rounded-md border border-[var(--admin-border)] px-2 py-1 text-xs hover:bg-black/5">{s === "Pendente" ? "Reabrir" : s === "Confirmada" ? "Confirmar" : "Cancelar"}</button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!reservas.length && <tr><td colSpan={7} className="p-8 text-center text-sm text-[var(--admin-muted)]">Nenhuma reserva recebida.</td></tr>}
          </tbody>
        </table></div>
      </Card>
    </>
  );
}
