import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    // Productfoto's komen van de media-servers van Tyre24 (media1/2/3).
    // Zonder deze regel weigert next/image een externe bron.
    remotePatterns: [
      { protocol: "https", hostname: "**.tyre-shopping.com", pathname: "/**" },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
