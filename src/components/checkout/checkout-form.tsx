"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useSyncExternalStore } from "react";
import { createOrderPdf } from "@/components/checkout/actions";
import { useCart } from "@/components/cart/use-cart";
import {
  type CheckoutDetails,
  type CheckoutField,
  validateCheckoutDetails,
} from "@/lib/checkout/schema";
import {
  loadCheckoutDetails,
  saveCheckoutDetails,
} from "@/lib/checkout/storage";

type FieldErrors = Partial<Record<CheckoutField, string>>;

// Eenmalige localStorage-read als externe store (server-snapshot null);
// de cache houdt de referentie stabiel voor useSyncExternalStore.
let prefillCache: CheckoutDetails | null | undefined;
const emptySubscribe = () => () => {};
function getPrefill(): CheckoutDetails | null {
  if (prefillCache === undefined) {
    prefillCache = loadCheckoutDetails();
  }
  return prefillCache;
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const inputErrorClass = `${inputClass} border-danger`;
const labelClass = "mb-1 block text-sm font-medium";

export function CheckoutForm() {
  const t = useTranslations("checkout");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  // TIJDELIJK (test): PDF-knop hieronder. Weg zodra de bevestiging automatisch
  // gemaild wordt — dan hoeft de klant hem niet zelf te downloaden.
  const cart = useCart();
  const formRef = useRef<HTMLFormElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  // Prefill kan pas na hydration (localStorage bestaat niet op de server);
  // key-remount van het formulier houdt de inputs uncontrolled.
  const prefill = useSyncExternalStore(emptySubscribe, getPrefill, () => null) as
    | Record<string, string>
    | null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = Object.fromEntries(formData.entries());
    const result = validateCheckoutDetails(input);

    if (!result.success) {
      setSaved(false);
      setErrors(result.fieldErrors);
      return;
    }

    setErrors({});
    saveCheckoutDetails(result.data);
    prefillCache = result.data;
    // TODO fase 5: hier start straks de betaling (src/lib/orders.ts)
    setSaved(true);
  }

  // TIJDELIJK (test): document in de browser downloaden om het te kunnen
  // bekijken. De bytes komen van de server, want daar staan de echte prijzen.
  async function handleDownloadPdf() {
    const form = formRef.current;
    if (!form) return;

    const input = Object.fromEntries(new FormData(form).entries());
    const result = validateCheckoutDetails(input);
    if (!result.success) {
      setPdfError(null);
      setErrors(result.fieldErrors);
      return;
    }

    setErrors({});
    setPdfError(null);
    setPdfBusy(true);
    const response = await createOrderPdf(result.data, cart.items);
    setPdfBusy(false);

    if (!response.ok) {
      setPdfError(response.error);
      return;
    }

    const bytes = Uint8Array.from(atob(response.base64), (c) =>
      c.charCodeAt(0),
    );
    const url = URL.createObjectURL(
      new Blob([bytes], { type: "application/pdf" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = response.fileName;
    link.click();
    // Pas vrijgeven als de browser het downloaden gestart heeft
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function field(
    name: CheckoutField,
    options: {
      type?: string;
      autoComplete?: string;
      optional?: boolean;
      className?: string;
    } = {},
  ) {
    const error = errors[name];
    const errorId = `${name}-error`;
    return (
      <div className={options.className}>
        <label htmlFor={name} className={labelClass}>
          {t(name)}{" "}
          {options.optional && (
            <span className="font-normal text-muted">{t("optional")}</span>
          )}
        </label>
        <input
          id={name}
          name={name}
          type={options.type ?? "text"}
          autoComplete={options.autoComplete}
          defaultValue={prefill?.[name] ?? ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={error ? inputErrorClass : inputClass}
        />
        {error && (
          <p id={errorId} className="mt-1 text-sm text-danger">
            {t(`errors.${error}`)}
          </p>
        )}
      </div>
    );
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    // key: remount na prefill zodat defaultValues de opgeslagen data tonen
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      key={prefill ? "filled" : "empty"}
    >
      <h2 className="text-lg">{t("contactTitle")}</h2>
      <div className="mt-4 flex flex-col gap-4">
        {field("email", { type: "email", autoComplete: "email" })}
        {field("phone", { type: "tel", autoComplete: "tel", optional: true })}
        <div className="grid grid-cols-2 gap-4">
          {field("firstName", { autoComplete: "given-name" })}
          {field("lastName", { autoComplete: "family-name" })}
        </div>
      </div>

      <h2 className="mt-8 text-lg">{t("addressTitle")}</h2>
      <div className="mt-4 flex flex-col gap-4">
        {field("street", { autoComplete: "address-line1" })}
        <div className="grid grid-cols-2 gap-4">
          {field("houseNumber")}
          {field("houseNumberAddition", { optional: true })}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {field("postcode", { autoComplete: "postal-code" })}
          {field("city", { autoComplete: "address-level2" })}
        </div>
        <div>
          <label htmlFor="country" className={labelClass}>
            {t("country")}
          </label>
          {/* TODO: meer landen zodra het verzendbeleid vaststaat */}
          <select
            id="country"
            name="country"
            autoComplete="country"
            className={inputClass}
            defaultValue="NL"
          >
            <option value="NL">{t("countryNl")}</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="mt-8 w-full rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink"
      >
        {t("submit")}
      </button>

      {/* Statusmeldingen ook voor screenreaders */}
      <div role="status" aria-live="polite">
        {hasErrors && (
          <p className="mt-4 text-sm text-danger">
            {t("errorSummary")}
          </p>
        )}
        {saved && <p className="mt-4 text-sm text-muted">{t("savedNotice")}</p>}
      </div>

      {/* TIJDELIJK: testblok om de orderbevestiging te bekijken. Verwijderen
          zodra het document automatisch gemaild wordt. */}
      <div className="mt-8 rounded-md border border-dashed border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          {t("testTools")}
        </p>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={pdfBusy}
          className="mt-3 w-full rounded-md border border-border px-6 py-3 font-semibold disabled:opacity-60"
        >
          {pdfBusy ? t("downloadPdfBusy") : t("downloadPdf")}
        </button>
        <p className="mt-2 text-xs text-muted">{t("downloadPdfNote")}</p>
        <div role="status" aria-live="polite">
          {pdfError && (
            <p className="mt-2 text-sm text-danger">
              {t(`pdfErrors.${pdfError}`)}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
