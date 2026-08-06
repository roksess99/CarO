import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border">
      <div className="site-container flex flex-col gap-2 py-8 text-sm text-muted">
        <p>{t("vat")}</p>
        <p>{t("shipping")}</p>
        <p>{t("withdrawal")}</p>
        <p className="mt-4">{t("copyright", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
