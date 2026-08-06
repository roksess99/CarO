"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="flex items-center text-sm font-semibold">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          aria-label={t(l)}
          aria-current={l === locale ? "true" : undefined}
          className={
            l === locale
              ? "px-2 py-1 text-foreground underline decoration-caro-orange decoration-2 underline-offset-4"
              : "px-2 py-1 text-muted hover:text-foreground"
          }
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
