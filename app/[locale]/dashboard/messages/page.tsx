import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function MessagesEmptyStatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl">
          💬
        </div>
        <p className="text-sm text-slate-600">
          {dict.messages.selectConversation}
        </p>
      </div>
    </div>
  );
}
