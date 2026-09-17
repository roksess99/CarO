"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/cart/use-cart";
import {
  type CodePreview,
  previewDiscountCode,
} from "@/components/checkout/discount-actions";
import {
  applyCode,
  useAppliedCode,
} from "@/components/checkout/use-discount-code";
import { loadCheckoutDetails } from "@/lib/checkout/storage";
import { formatPriceCents } from "@/lib/format";

/**
 * Het invoerveld voor een kortingscode, in het besteloverzicht.
 *
 * Bewust naast de bedragen en niet onderin het formulier: de klant moet meteen
 * zien wat de code met zijn totaal doet. Wordt hij afgekeurd, dan staat er
 * waaróm — "code klopt niet" op een code die alleen nog niet begonnen is, laat
 * iemand zoeken naar een typefout die er niet is.
 */

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm uppercase";

export function DiscountCodeField() {
  const t = useTranslations("totals");
  const cart = useCart();
  const applied = useAppliedCode();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CodePreview | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !value.trim()) return;
    setBusy(true);
    // Het mailadres uit een eerdere bestelling, als het er is: daarmee kan
    // "deze code heb je al gebruikt" nu al gemeld worden in plaats van pas op
    // de betaalknop.
    const email = loadCheckoutDetails()?.email;
    const preview = await previewDiscountCode(value, cart.items, email);
    setResult(preview);
    applyCode(preview.ok ? { code: preview.code, percent: preview.percent } : null);
    setBusy(false);
  }

  function remove() {
    applyCode(null);
    setResult(null);
    setValue("");
  }

  if (applied) {
    return (
      <div className="mt-4 rounded-md border border-border bg-surface p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">
            {t("codeApplied", { code: applied.code, percent: applied.percent })}
          </p>
          <button
            type="button"
            onClick={remove}
            className="shrink-0 text-sm underline underline-offset-4 hover:text-danger"
          >
            {t("codeRemove")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label htmlFor="discountCode" className="mb-1 block text-sm font-medium">
        {t("codeLabel")}
      </label>
      <div className="flex gap-2">
        <input
          id="discountCode"
          name="discountCode"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={32}
          autoComplete="off"
          className={inputClass}
          aria-describedby="discountCodeStatus"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="shrink-0 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface disabled:opacity-60"
        >
          {busy ? t("codeBusy") : t("codeApply")}
        </button>
      </div>
      <div id="discountCodeStatus" role="status" aria-live="polite">
        {result && !result.ok && (
          <p className="mt-2 text-sm text-danger">
            {result.reason === "minSpend" && result.minSpendCents !== undefined
              ? t("codeMinSpend", {
                  amount: formatPriceCents(result.minSpendCents),
                })
              : t(`codeErrors.${result.reason}`)}
          </p>
        )}
      </div>
    </form>
  );
}
