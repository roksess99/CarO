"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("error");

  return (
    <div className="site-container py-16 md:py-24">
      <h1 className="text-3xl">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted">{t("description")}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink"
      >
        {t("retry")}
      </button>
    </div>
  );
}
