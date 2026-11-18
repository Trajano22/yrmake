import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Great_Vibes, Jost } from "next/font/google";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const vibes = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-vibes" });
const jost = Jost({ subsets: ["latin"], variable: "--font-jost" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "YR Make e Variedades", template: "%s · YR Make e Variedades" },
  description: "Maquiagens, skincare e acessórios. Peça pelo site e receba em casa ou retire na loja.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "YR Make e Variedades" },
};

export const viewport: Viewport = { themeColor: "#921733" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${vibes.variable} ${jost.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
