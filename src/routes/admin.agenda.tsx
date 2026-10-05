import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { btnGhost, btnPrimary, Card, Field, fmtDate, inputCls, Modal, PageHeader, td, th } from "@/components/admin/ui";
import { addShow, DATE_REGEX, deleteShow, NAME_REGEX, sanitizeInput, todayISO, useAdminData } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda de Shows — Painel Maré Pura" },
      { name: "description", content: "Gerencie os próximos shows do Maré Pura." },
      { property: "og:title", content: "Agenda de Shows — Painel Maré Pura" },
      { property: "og:description", content: "CRUD da agenda de shows." },
    ],
  }),
  component: AgendaAdmin,
});

type Errs = Partial<Record<"data" | "banda" | "estilo" | "csrf", string>>;

function AgendaAdmin() {
  const { shows } = useAdminData();
  const [open, setOpen] = useState(false);
  const [errs, setErrs] = useState<Errs>({});
  const upcoming = shows.filter((s) => s.data >= todayISO());

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = String(fd.get("data") ?? "");
    const banda = sanitizeInput(String(fd.get("banda") ?? "")); // previne XSS
    const estilo = sanitizeInput(String(fd.get("estilo") ?? ""));
    const errors: Errs = {};
    // Formato AAAA-MM-DD + bloqueio de datas passadas (também bloqueado no input via min).
    if (!DATE_REGEX.test(data) || data < todayISO()) errors.data = "Escolha uma data a partir de hoje.";
    if (!NAME_REGEX.test(banda)) errors.banda = "Use 2–60 letras/números, sem caracteres especiais.";
    if (!NAME_REGEX.test(estilo)) errors.estilo = "Use 2–60 letras/números, sem caracteres especiais.";
    if (fd.get("csrf_token") !== "mock-token-xyz") errors.csrf = "Token de segurança inválido.";
    setErrs(errors);
    if (Object.keys(errors).length) return;
    addShow({ data, banda, estilo });
    setOpen(false);
  };

  return (
    <>
      <PageHeader title="Agenda de Shows" action={<button className={btnPrimary} onClick={() => { setErrs({}); setOpen(true); }}><Plus size={16} /> Adicionar Show</button>} />
      <Card>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px]">
          <thead><tr className="border-b border-[var(--admin-border)]"><th className={th}>Data</th><th className={th}>Banda</th><th className={th}>Estilo</th><th className={`${th} text-right`}>Ações</th></tr></thead>
          <tbody>
            {upcoming.map((s) => (
              <tr key={s.id} className="border-b border-[var(--admin-border)] last:border-0">
                <td className={`${td} font-medium`}>{fmtDate(s.data)}</td>
                <td className={td}>{s.banda}</td>
                <td className={td}>{s.estilo}</td>
                <td className={`${td} text-right`}><button aria-label="Excluir" className="rounded p-2 text-red-500 hover:bg-red-500/10" onClick={() => deleteShow(s.id)}><Trash2 size={16} /></button></td>
              </tr>
            ))}
            {!upcoming.length && <tr><td colSpan={4} className="p-8 text-center text-sm text-[var(--admin-muted)]">Nenhum show agendado.</td></tr>}
          </tbody>
        </table></div>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar Show">
        <form onSubmit={onSubmit}>
          <input type="hidden" name="csrf_token" value="mock-token-xyz" />
          <Field label="Data" error={errs.data}><input type="date" name="data" min={todayISO()} className={inputCls} /></Field>
          <Field label="Nome da Banda" error={errs.banda}><input name="banda" maxLength={60} className={inputCls} /></Field>
          <Field label="Estilo" error={errs.estilo}><input name="estilo" maxLength={60} className={inputCls} /></Field>
          {errs.csrf && <p className="mb-3 text-xs text-red-500">{errs.csrf}</p>}
          <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancelar</button><button className={btnPrimary}>Salvar</button></div>
        </form>
      </Modal>
    </>
  );
}
