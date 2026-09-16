import { redirect } from "next/navigation";
import { CaroMark } from "@/components/brand/caro-mark";
import { countAdmins } from "@/lib/admin/admins";
import { currentAdmin } from "@/lib/admin/session";
import { LoginForm } from "./login-form";

// De inlogpagina moet elke keer opnieuw kijken of er al iemand binnen is.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Al ingelogd? Dan is dit scherm zinloos.
  if (await currentAdmin()) redirect("/beheer");

  // Nog geen enkele beheerder: dan is inloggen onmogelijk en hoort de bezoeker
  // op de instelpagina, niet bij een formulier dat nooit kan lukken.
  if ((await countAdmins()) === 0) redirect("/beheer/setup");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <CaroMark className="size-10" />
        <div>
          <p className="text-lg font-semibold tracking-tight">Beheer</p>
          <p className="text-sm text-muted">caroparts.nl</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <LoginForm />
      </div>

      <p className="mt-6 text-sm text-muted">
        Telefoon kwijt? Dan heb je een herstelcode nodig. Zonder code en zonder
        telefoon kan alleen iemand met toegang tot de server je weer binnenlaten.
      </p>
    </main>
  );
}
