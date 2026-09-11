import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Tenor — secondary market for cloud commitments",
  description:
    "Resell unconsumed cloud spend commitments on a Uniswap v4 pool whose price decays with time to expiry. Sellers verified via ENSv2 + World Selfie Check.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
