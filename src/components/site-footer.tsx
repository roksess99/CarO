import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-16 border-t border-border">
      <div className="site-container flex flex-col gap-2 py-8 text-sm text-muted">
        <p>{t("vat")}</p>
        <p>{t("shipping")}</p>
        <p>{t("withdrawal")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t("privacyLink")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
