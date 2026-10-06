import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ImageIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { btnGhost, btnPrimary, Card, Field, inputCls, Modal, PageHeader, td, th } from "@/components/admin/ui";
import { addPrato, CATEGORIAS, deletePrato, editPrato, NAME_REGEX, sanitizeInput, useAdminData, type Prato } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/cardapio")({
  head: () => ({
    meta: [
      { title: "Gerenciar Cardápio — Painel Maré Pura" },
      { name: "description", content: "Adicione, edite e remova itens do cardápio." },
      { property: "og:title", content: "Gerenciar Cardápio — Painel Maré Pura" },
      { property: "og:description", content: "CRUD do cardápio." },
    ],
  }),
  component: CardapioAdmin,
});

type Errs = Partial<Record<"nome" | "categoria" | "descricao" | "csrf" | "imagem", string>>;
const optCls = "bg-[var(--admin-card)] text-[var(--admin-text)]";

function CardapioAdmin() {
  const { pratos } = useAdminData();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Prato | null | "new">(null);
  const [toDelete, setToDelete] = useState<Prato | null>(null);
  const [errs, setErrs] = useState<Errs>({});
  const [foto, setFoto] = useState("");
  const abrir = (p: Prato | "new") => { setErrs({}); setFoto(p === "new" ? "" : p.imagem ?? ""); setEditing(p); };
  const onFile = (f?: File) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) return setErrs((e) => ({ ...e, imagem: "Use PNG, JPG, WEBP ou GIF." }));
    if (f.size > 1_400_000) return setErrs((e) => ({ ...e, imagem: "Imagem muito grande (máx. 1,4 MB)." }));
    const r = new FileReader();
    r.onload = () => { setFoto(String(r.result)); setErrs(({ imagem: _i, ...resto }) => resto); };
    r.readAsDataURL(f);
  };

  const list = pratos.filter((p) => (p.nome + p.categoria).toLowerCase().includes(q.toLowerCase()));

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // 1) sanitizeInput() antes de salvar — previne XSS/injeções.
    const nome = sanitizeInput(String(fd.get("nome") ?? ""));
    const categoria = String(fd.get("categoria") ?? "");
    const descricao = sanitizeInput(String(fd.get("descricao") ?? ""));
    const errors: Errs = {};
    // 2) Validação estrita via regex: só letras, números e espaços no nome.
    if (!NAME_REGEX.test(nome)) errors.nome = "Use 2–60 letras/números, sem caracteres especiais.";
    // Categoria deve ser uma das opções permitidas (whitelist).
    if (!CATEGORIAS.includes(categoria)) errors.categoria = "Categoria inválida.";
    if (descricao.length < 3 || descricao.length > 200) errors.descricao = "Entre 3 e 200 caracteres.";
    // 3) Confere o token CSRF do input oculto.
    const imagem = foto.trim();
    if (imagem && !/^https:\/\/[^\s"'<>]+$/.test(imagem) && !imagem.startsWith("data:image/")) errors.imagem = "Link inválido (use https://).";
    if (fd.get("csrf_token") !== "mock-token-xyz") errors.csrf = "Token de segurança inválido.";
    setErrs(errors);
    if (Object.keys(errors).length) return;
    if (editing && editing !== "new") editPrato({ ...editing, nome, categoria, descricao, imagem });
    else addPrato({ nome, categoria, descricao, imagem });
    setEditing(null);
  };

  const current = editing && editing !== "new" ? editing : null;

  return (
    <>
      <PageHeader title="Gerenciar Cardápio" action={<button className={btnPrimary} onClick={() => abrir("new")}><Plus size={16} /> Adicionar Item</button>} />
      <Card>
        <div className="flex items-center gap-2 border-b border-[var(--admin-border)] p-4">
          <Search size={16} className="text-[var(--admin-muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} placeholder="Buscar por nome ou categoria..." className="w-full bg-transparent text-sm outline-none" />
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px]">
          <thead><tr className="border-b border-[var(--admin-border)]"><th className={th}>Imagem</th><th className={th}>Nome</th><th className={th}>Categoria</th><th className={`${th} text-right`}>Ações</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-[var(--admin-border)] last:border-0">
                <td className={td}>{p.imagem ? <img src={p.imagem} alt={p.nome} className="h-10 w-10 rounded-md object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--admin-bg)] text-[var(--admin-muted)]"><ImageIcon size={16} /></div>}</td>
                <td className={td}><p className="font-medium">{p.nome}</p><p className="text-xs text-[var(--admin-muted)]">{p.descricao}</p></td>
                <td className={td}>{p.categoria}</td>
                <td className={`${td} text-right`}>
                  <button aria-label="Editar" className="mr-2 rounded p-2 hover:bg-black/5" onClick={() => abrir(p)}><Pencil size={16} /></button>
                  <button aria-label="Excluir" className="rounded p-2 text-red-500 hover:bg-red-500/10" onClick={() => setToDelete(p)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={4} className="p-8 text-center text-sm text-[var(--admin-muted)]">Nenhum item encontrado.</td></tr>}
          </tbody>
        </table></div>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={current ? "Editar Item" : "Adicionar Novo Item"}>
        <form onSubmit={onSubmit} key={current?.id ?? "new"}>
          <input type="hidden" name="csrf_token" value="mock-token-xyz" />
          <Field label="Nome" error={errs.nome}><input name="nome" defaultValue={current?.nome} maxLength={60} className={inputCls} /></Field>
          <Field label="Categoria" error={errs.categoria}>
            <select name="categoria" defaultValue={current?.categoria ?? ""} className={`${inputCls} admin-select bg-[var(--admin-card)] text-[var(--admin-text)]`}>
              <option value="" disabled className={optCls}>Selecione...</option>
              {CATEGORIAS.map((c) => <option key={c} value={c} className={optCls}>{c}</option>)}
            </select>
          </Field>
          <Field label="Descrição" error={errs.descricao}><textarea name="descricao" defaultValue={current?.descricao} maxLength={200} rows={3} className={inputCls} /></Field>
          <Field label="Foto (opcional)" error={errs.imagem}>
            <div className="flex items-center gap-3">
              {foto ? <img src={foto} alt="Prévia" className="h-16 w-16 shrink-0 rounded-md object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-[var(--admin-bg)] text-[var(--admin-muted)]"><ImageIcon size={20} /></div>}
              <div className="min-w-0 flex-1 space-y-2">
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-[var(--admin-primary)] file:px-3 file:py-1 file:text-white" />
                <input value={foto.startsWith("data:") ? "" : foto} onChange={(e) => setFoto(e.target.value)} maxLength={500} placeholder="ou cole um link https://..." className={inputCls} />
                {foto && <button type="button" onClick={() => setFoto("")} className="text-xs text-red-500">Remover foto</button>}
              </div>
            </div>
          </Field>
          {errs.csrf && <p className="mb-3 text-xs text-red-500">{errs.csrf}</p>}
          <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setEditing(null)}>Cancelar</button><button className={btnPrimary}>Salvar</button></div>
        </form>
      </Modal>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Confirmar exclusão">
        <p className="mb-6 text-sm">Excluir <strong>{toDelete?.nome}</strong> do cardápio? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-2">
          <button className={btnGhost} onClick={() => setToDelete(null)}>Cancelar</button>
          <button className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700" onClick={() => { if (toDelete) deletePrato(toDelete.id); setToDelete(null); }}>Excluir</button>
        </div>
      </Modal>
    </>
  );
}
