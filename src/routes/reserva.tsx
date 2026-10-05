import { enviarReserva } from "@/lib/admin-store";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PageFade, PageTitle } from "@/components/site/PageFade";

export const Route = createFileRoute("/reserva")({
  head: () => ({
    meta: [
      { title: "Reserve sua mesa — Maré Pura" },
      { name: "description", content: "Faça sua reserva no Maré Pura em poucos segundos." },
      { property: "og:title", content: "Reserva — Maré Pura" },
      { property: "og:description", content: "Garanta sua mesa de frente para o mar." },
    ],
  }),
  component: Reserva,
});

/**
 * SEGURANÇA (client-side) — é apenas uma primeira barreira.
 * Toda validação e sanitização DEVE ser repetida no servidor.
 */

// 1. WhatsApp: apenas dígitos e "+" opcional no início, 10 a 15 dígitos.
const WHATSAPP_REGEX = /^\+?[0-9]{10,15}$/;

// 2. Sanitização mock contra XSS: remove <script>, tags HTML e escapa caracteres perigosos.
export function sanitizeInput(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'`]/g, "")
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, 120);
}

type Errs = Partial<Record<"nome" | "whatsapp" | "data" | "horario" | "pessoas", string>>;

const horarios = ["18:00", "19:00", "20:00", "21:00", "22:00"];

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const field =
  "w-full rounded-lg border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring";

function Reserva() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Errs>({});

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      nome: sanitizeInput(String(fd.get("nome") ?? "")),
      whatsapp: String(fd.get("whatsapp") ?? "").replace(/\s/g, ""),
      data: String(fd.get("data") ?? ""),
      horario: String(fd.get("horario") ?? ""),
      pessoas: Number(fd.get("pessoas")),
      csrf_token: String(fd.get("csrf_token") ?? ""),
    };
    const errs: Errs = {};
    if (data.nome.length < 2) errs.nome = "Informe seu nome.";
    if (!WHATSAPP_REGEX.test(data.whatsapp)) errs.whatsapp = "Use apenas números e +.";
    if (!data.data || data.data < today()) errs.data = "Escolha uma data a partir de hoje.";
    if (!horarios.includes(data.horario)) errs.horario = "Selecione um horário.";
    if (!Number.isInteger(data.pessoas) || data.pessoas < 1 || data.pessoas > 30) errs.pessoas = "Entre 1 e 30 pessoas.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    // Envio real para o servidor, que valida e grava a reserva.
    const erro = await enviarReserva({ nome: data.nome, whatsapp: data.whatsapp, data: data.data, horario: data.horario, pessoas: data.pessoas });
    setLoading(false);
    if (erro) { setErrors({ nome: erro }); return; }
    setDone(true);
  };

  return (
    <PageFade>
      <PageTitle title="Reserva" subtitle="Sua mesa com vista pro mar." />
      <div className="mx-auto max-w-xl px-4 pb-24">
        {done ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <CheckCircle2 className="mx-auto text-primary" size={48} />
            <p className="mt-4 text-xl font-bold">Reserva recebida!</p>
            <p className="mt-2 text-muted-foreground">Confirmaremos pelo WhatsApp em breve.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 md:p-8">
            {/* 3. Token CSRF (mock) — em produção é gerado pelo servidor por sessão. */}
            <input type="hidden" name="csrf_token" value="mock-token-xyz" />

            <Field label="Nome" error={errors.nome}>
              <input name="nome" maxLength={120} autoComplete="name" className={field} />
            </Field>
            <Field label="WhatsApp" error={errors.whatsapp}>
              <input
                name="whatsapp"
                inputMode="tel"
                placeholder="+5511999999999"
                maxLength={16}
                onInput={(e) => (e.currentTarget.value = e.currentTarget.value.replace(/[^0-9+]/g, ""))}
                className={field}
              />
            </Field>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Data da reserva" error={errors.data}>
                {/* 4. Bloqueia datas passadas via atributo min */}
                <input type="date" name="data" min={today()} className={field} />
              </Field>
              <Field label="Horário" error={errors.horario}>
                <select name="horario" defaultValue="" className={field}>
                  <option value="" disabled>Selecione</option>
                  {horarios.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Número de pessoas" error={errors.pessoas}>
              <input type="number" name="pessoas" min={1} max={30} defaultValue={2} className={field} />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 font-nav font-bold text-primary-foreground transition hover:bg-primary-hover hover:shadow-glow disabled:opacity-70"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {loading ? "Enviando..." : "Confirmar reserva"}
            </button>
          </form>
        )}
      </div>
    </PageFade>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-nav text-sm font-bold">{label}</span>
      {children}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </label>
  );
}
