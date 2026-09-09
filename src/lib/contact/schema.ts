import { z } from "zod";

// Wat een bezoeker in het contactformulier invult. Foutcodes ("required",
// "email", "tooLong") worden in de UI vertaald, net als bij de checkout.

/** Ruim genoeg voor een uitgebreide vraag, te kort om er een lap tekst in te plakken */
export const MESSAGE_MAX = 2000;

/**
 * Naam van het honeypot-veld. Het staat verstopt in het formulier en heet
 * iets waar een bot intrapt; een mens ziet het niet en laat het dus leeg.
 * De controle staat in de Server Action en niet in dit schema: een gevuld
 * honeypot is geen invoerfout die je aan iemand meldt, maar een bericht dat
 * je weggooit terwijl je "verzonden" antwoordt — een bot die een foutmelding
 * krijgt probeert het opnieuw.
 */
export const HONEYPOT_FIELD = "website";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "required").max(100, "tooLong"),
  email: z.email("email").max(200, "tooLong"),
  subject: z.string().trim().min(1, "required").max(150, "tooLong"),
  message: z.string().trim().min(10, "tooShort").max(MESSAGE_MAX, "tooLong"),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactInput;

export function validateContact(
  input: unknown,
):
  | { success: true; data: ContactInput }
  | { success: false; fieldErrors: Partial<Record<ContactField, string>> } {
  const result = contactSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };

  const known = new Set(["required", "email", "tooLong", "tooShort"]);
  const fieldErrors: Partial<Record<ContactField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ContactField | undefined;
    if (!field || fieldErrors[field]) continue;
    fieldErrors[field] = known.has(issue.message)
      ? issue.message
      : issue.code === "invalid_type"
        ? "required"
        : "invalid";
  }
  return { success: false, fieldErrors };
}
