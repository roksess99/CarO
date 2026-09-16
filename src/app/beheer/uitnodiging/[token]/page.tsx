import { CaroMark } from "@/components/brand/caro-mark";
import { findPendingInvite } from "@/lib/admin/invites";
import { newTotpSecret, otpauthUri, toBase32 } from "@/lib/admin/totp";
import { AcceptForm } from "./accept-form";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await findPendingInvite(token);

  // Bewust geen 404: "deze link werkt niet meer" is een ander verhaal dan
  // "deze pagina bestaat niet", en de ontvanger moet weten wat hij nu moet doen.
  if (!invite) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
        <h1 className="text-xl font-semibold tracking-tight">
          Deze uitnodiging werkt niet meer
        </h1>
        <p className="mt-3 text-muted">
          Hij is verlopen of al gebruikt. Een uitnodiging is achtenveertig uur
          geldig — vraag degene die je uitnodigde om een nieuwe.
        </p>
      </main>
    );
  }

  const secret = newTotpSecret();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <CaroMark className="size-10" />
        <div>
          <p className="text-lg font-semibold tracking-tight">
            Beheerdersaccount aanmaken
          </p>
          <p className="text-sm text-muted">caroparts.nl</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <AcceptForm
          token={token}
          email={invite.email}
          secretBase32={toBase32(secret)}
          otpauthUri={otpauthUri(secret, invite.email)}
        />
      </div>
    </main>
  );
}
