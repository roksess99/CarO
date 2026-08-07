import { z } from "zod";

// Klant- en bezorggegevens voor de checkout. Fase 4 gebruikt dit voor
// factuur en orderverwerking; tot die tijd leeft het alleen client-side.
// Foutcodes ("required", "invalid", …) worden in de UI vertaald.

const required = z.string().trim().min(1, "required");

export const checkoutDetailsSchema = z.object({
  email: z.email("email"),
  /** Optioneel; alleen lengte-check als er iets staat */
  phone: z
    .string()
    .trim()
    .max(20, "invalid")
    .optional()
    .or(z.literal("")),
  firstName: required,
  lastName: required,
  street: required,
  houseNumber: required.max(10, "invalid"),
  houseNumberAddition: z.string().trim().max(10, "invalid").optional().or(z.literal("")),
  postcode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{3}\s?[A-Za-z]{2}$/, "postcode"),
  city: required,
  // TODO: meer landen zodra het verzendbeleid vaststaat (docs/DECISIONS.md)
  country: z.literal("NL"),
});

export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>;

export type CheckoutField = keyof CheckoutDetails;

/** Veld → vertaalsleutel, bv. { email: "email", city: "required" } */
export function validateCheckoutDetails(input: unknown):
  | { success: true; data: CheckoutDetails }
  | { success: false; fieldErrors: Partial<Record<CheckoutField, string>> } {
  const result = checkoutDetailsSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const knownKeys = new Set(["required", "invalid", "email", "postcode"]);
  const fieldErrors: Partial<Record<CheckoutField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as CheckoutField | undefined;
    if (!field || fieldErrors[field]) continue;
    // Custom codes komen uit het schema; al het andere (bv. ontbrekend
    // veld → invalid_type met Engelse zod-tekst) valt terug op een generieke sleutel
    fieldErrors[field] = knownKeys.has(issue.message)
      ? issue.message
      : issue.code === "invalid_type"
        ? "required"
        : "invalid";
  }
  return { success: false, fieldErrors };
}
