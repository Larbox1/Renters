import type { Locale } from "@/i18n/config";

const copy: Record<Locale, { title: string; body: string; step1: string; step2: string; step3: string }> = {
  en: {
    title: "Supabase is not configured yet",
    body: "Auth pages need Supabase credentials to work. Set them up in three steps:",
    step1: "Create a project at supabase.com",
    step2: "Copy your Project URL and anon key from Settings → API",
    step3: "Copy .env.example to .env.local and paste them in, then restart the dev server",
  },
  fr: {
    title: "Supabase n'est pas encore configuré",
    body: "Les pages d'authentification nécessitent les identifiants Supabase. Configurez-les en trois étapes :",
    step1: "Créez un projet sur supabase.com",
    step2: "Copiez votre URL de projet et la clé anon depuis Paramètres → API",
    step3: "Copiez .env.example vers .env.local, collez les valeurs, puis redémarrez le serveur",
  },
};

export function SetupNotice({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-xl font-semibold text-amber-900">{t.title}</h1>
        <p className="mt-2 text-sm text-amber-800">{t.body}</p>
        <ol className="mt-4 space-y-2 text-sm text-amber-900">
          <li>
            <span className="font-semibold">1.</span> {t.step1}
          </li>
          <li>
            <span className="font-semibold">2.</span> {t.step2}
          </li>
          <li>
            <span className="font-semibold">3.</span> {t.step3}
          </li>
        </ol>
      </div>
    </div>
  );
}
