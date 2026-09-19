import { execute, query } from "@/lib/db/client";

/**
 * Logboek van het beheerpaneel: wie deed wat, en wanneer.
 *
 * Met één beheerder lijkt dit overbodig. Met twee is het dat niet: een korting
 * is geld, en "wie heeft dat op 40% gezet" is dan een vraag die je wilt kunnen
 * beantwoorden zonder erover te hoeven bellen.
 *
 * **Een mislukte actie schrijft niets.** Alleen wat er werkelijk veranderd is
 * komt hierin, anders staat het logboek vol pogingen en is het niet meer te
 * lezen. Mislukte inlogpogingen horen hier dus ook niet: die worden geteld in
 * `rate-limit.ts` en verder vergeten.
 */

export type AuditAction =
  | "beheerder.uitgenodigd"
  | "beheerder.aangemaakt"
  | "beheerder.uitgeschakeld"
  | "korting.aangemaakt"
  | "korting.gewijzigd"
  | "korting.gestopt"
  | "kortingscode.aangemaakt"
  | "kortingscode.gestopt"
  | "prijsregel.toegevoegd"
  | "prijsregel.gestopt"
  | "beoordeling.uitgenodigd"
  | "beoordeling.beantwoord"
  | "beoordeling.verborgen"
  | "beoordeling.getoond"
  | "prijsmeting.handmatig"
  | "bestelling.ingekocht";

export async function logAction(options: {
  adminId: number;
  action: AuditAction;
  /** Waar het over ging: een mailadres, een ordernummer, een code */
  subject?: string;
  /** Oude en nieuwe waarde, zodat je kunt terugkijken wat er veranderde */
  detail?: Record<string, unknown>;
}): Promise<void> {
  await execute(
    `INSERT INTO audit_log (admin_id, action, subject, detail_json, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      options.adminId,
      options.action,
      options.subject ?? null,
      options.detail ? JSON.stringify(options.detail) : null,
      new Date(),
    ],
  );
}

export interface AuditEntry {
  id: number;
  email: string;
  action: string;
  subject: string | null;
  createdAt: Date;
}

export async function recentAudit(limit = 20): Promise<AuditEntry[]> {
  const rows = await query<{
    id: number;
    email: string;
    action: string;
    subject: string | null;
    created_at: Date;
  }>(
    `SELECT l.id, a.email, l.action, l.subject, l.created_at
       FROM audit_log l
       JOIN admins a ON a.id = l.admin_id
      ORDER BY l.id DESC
      LIMIT ${Math.min(Math.max(Math.trunc(limit), 1), 100)}`,
  );

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    action: row.action,
    subject: row.subject,
    createdAt: row.created_at,
  }));
}
