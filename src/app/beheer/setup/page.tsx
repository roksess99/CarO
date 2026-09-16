import { notFound } from "next/navigation";
import { CaroMark } from "@/components/brand/caro-mark";
import { countAdmins } from "@/lib/admin/admins";
import { newTotpSecret, otpauthUri, toBase32 } from "@/lib/admin/totp";
import { SetupForm } from "./setup-form";

/**
 * De eerste beheerder aanmaken.
 *
 * Deze pagina bestaat alleen zolang er nog geen enkele beheerder is, en vraagt
 * daarnaast om `ADMIN_SETUP_TOKEN`. Zonder dat tweede slot zou de eerste
 * voorbijganger na een deploy het paneel kunnen claimen — de winkel staat
 * open op internet.
 *
 * Elke keer dat je deze pagina laadt komt er een nieuw geheim. Ververs je na
 * het scannen, scan dan opnieuw: de code in je app hoort bij het geheim dat op
 * datzelfde scherm stond.
 */

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await countAdmins()) > 0) notFound();

  const secret = newTotpSecret();
  const base32 = toBase32(secret);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <CaroMark className="size-10" />
        <div>
          <p className="text-lg font-semibold tracking-tight">
            Beheer instellen
          </p>
          <p className="text-sm text-muted">Eenmalig, voor de eerste beheerder</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <SetupForm
          secretBase32={base32}
          otpauthUri={otpauthUri(secret, "beheer@caroparts.nl")}
        />
      </div>
    </main>
  );
}
