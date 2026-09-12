"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, useSyncExternalStore } from "react";
import { useCart } from "@/components/cart/use-cart";
import { startPayment } from "@/components/checkout/actions";
import { lookupAddressAction } from "@/components/checkout/address-actions";
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
  const locale = useLocale();
  const cart = useCart();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  // Blijft `true` tot de browser weg navigeert: tussen het antwoord van de
  // server en de sprong naar Mollie zit een moment waarin de knop anders weer
  // aanklikbaar zou zijn, en dat levert een tweede betaling op.
  const [busy, setBusy] = useState(false);
  // Prefill kan pas na hydration (localStorage bestaat niet op de server);
  // key-remount van het formulier houdt de inputs uncontrolled.
  const prefill = useSyncExternalStore(emptySubscribe, getPrefill, () => null) as
    | Record<string, string>
    | null;

  /**
   * Straat en plaats worden ingevuld zodra postcode én huisnummer bekend zijn.
   *
   * Het formulier blijft uncontrolled — de waarden worden rechtstreeks op de
   * twee invoervelden gezet. Ze controlled maken zou betekenen dat élk veld
   * mee moet, inclusief de prefill-remount die daarop gebouwd is, en dat is een
   * verbouwing voor een gemaksfunctie.
   *
   * `unavailable` toont niets: de dienst is gratis en zonder uptimegarantie,
   * dus dat gebeurt. De klant ziet dan twee lege velden die hij gewoon invult,
   * precies zoals hij zonder deze functie ook zou doen.
   */
  const streetRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const [addressStatus, setAddressStatus] = useState<
    "idle" | "busy" | "found" | "notFound"
  >("idle");
  // Voorkomt dat tabben door het formulier dezelfde vraag nog eens stelt
  const lastLookup = useRef("");
  // Twee opzoekacties kunnen elkaar inhalen; alleen de laatste mag het veld
  // vullen, anders krijgt de klant het adres van zijn vórige huisnummer
  const lookupCount = useRef(0);

  async function lookUpAddress(form: HTMLFormElement) {
    const data = new FormData(form);
    const postcode = String(data.get("postcode") ?? "").trim();
    const houseNumber = String(data.get("houseNumber") ?? "").trim();
    if (!postcode || !houseNumber) return;

    const key = `${postcode}|${houseNumber}`;
    if (key === lastLookup.current) return;
    lastLookup.current = key;

    const id = ++lookupCount.current;
    setAddressStatus("busy");
    const result = await lookupAddressAction(postcode, houseNumber);
    if (id !== lookupCount.current) return;

    if (!result.ok) {
      setAddressStatus(result.error === "notFound" ? "notFound" : "idle");
      return;
    }

    if (streetRef.current) streetRef.current.value = result.street;
    if (cityRef.current) cityRef.current.value = result.city;
    // De rode "verplicht"-melding onder die velden slaat nergens meer op
    setErrors((current) => {
      const { street, city, ...rest } = current;
      void street;
      void city;
      return rest;
    });
    setAddressStatus("found");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const formData = new FormData(event.currentTarget);
    const input = Object.fromEntries(formData.entries());
    const result = validateCheckoutDetails(input);

    // Dezelfde controle draait straks nog eens op de server; deze is er
    // alleen om de klant meteen te laten zien wat er mist.
    if (!result.success) {
      setFailure(null);
      setErrors(result.fieldErrors);
      return;
    }

    setErrors({});
    setFailure(null);
    saveCheckoutDetails(result.data);
    prefillCache = result.data;

    setBusy(true);
    const response = await startPayment(result.data, cart.items, locale);

    if (!response.ok) {
      setBusy(false);
      if (response.fieldErrors) setErrors(response.fieldErrors as FieldErrors);
      setFailure(response.error);
      return;
    }

    // Naar het betaalscherm van Mollie. Bewust geen router.push: dat is een
    // ander domein, dus een gewone navigatie van de browser.
    window.location.href = response.checkoutUrl;
  }

  function field(
    name: CheckoutField,
    options: {
      type?: string;
      autoComplete?: string;
      optional?: boolean;
      className?: string;
      inputRef?: React.RefObject<HTMLInputElement | null>;
      /** Verlaat de klant dit veld, dan mag het adres opgezocht worden */
      looksUpAddress?: boolean;
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
          ref={options.inputRef}
          type={options.type ?? "text"}
          autoComplete={options.autoComplete}
          defaultValue={prefill?.[name] ?? ""}
          onBlur={
            options.looksUpAddress
              ? (event) => {
                  const form = event.currentTarget.form;
                  if (form) void lookUpAddress(form);
                }
              : undefined
          }
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
        {/* Postcode en huisnummer staan bovenaan: vult de klant die eerst in,
            dan zijn straat en plaats al ingevuld als hij daar komt. */}
        <div className="grid grid-cols-2 gap-4">
          {field("postcode", {
            autoComplete: "postal-code",
            looksUpAddress: true,
          })}
          {field("houseNumber", { looksUpAddress: true })}
        </div>
        {field("houseNumberAddition", { optional: true })}
        {field("street", {
          autoComplete: "address-line1",
          inputRef: streetRef,
        })}
        {field("city", {
          autoComplete: "address-level2",
          inputRef: cityRef,
        })}

        {/* Ook voor schermlezers: het invullen gebeurt zonder dat de klant
            iets aanklikt, dus het moet gemeld worden. */}
        <div role="status" aria-live="polite" className="-mt-2">
          {addressStatus === "busy" && (
            <p className="text-sm text-muted">{t("addressLookup.busy")}</p>
          )}
          {addressStatus === "found" && (
            <p className="text-sm text-muted">{t("addressLookup.found")}</p>
          )}
          {addressStatus === "notFound" && (
            <p className="text-sm text-muted">{t("addressLookup.notFound")}</p>
          )}
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
        disabled={busy}
        className="mt-8 w-full rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:opacity-60"
      >
        {busy ? t("payBusy") : t("pay")}
      </button>
      <p className="mt-3 text-center text-xs text-muted">{t("payNote")}</p>

      {/* Statusmeldingen ook voor screenreaders */}
      <div role="status" aria-live="polite">
        {hasErrors && (
          <p className="mt-4 text-sm text-danger">{t("errorSummary")}</p>
        )}
        {failure && (
          <p className="mt-4 text-sm text-danger">{t(`payErrors.${failure}`)}</p>
        )}
      </div>
    </form>
  );
}
