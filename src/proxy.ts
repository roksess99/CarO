import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Alles behalve API-routes, Next-internals en statische bestanden
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
