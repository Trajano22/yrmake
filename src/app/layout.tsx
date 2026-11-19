import type { Metadata, Viewport } from "next";
import { Jost, Playfair_Display } from "next/font/google";
import { themeScript } from "@/components/ThemeToggle";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});
const jost = Jost({ subsets: ["latin"], variable: "--font-jost" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "YR Make e Variedades", template: "%s · YR Make e Variedades" },
  description: "Maquiagens, skincare e acessórios. Peça pelo site e receba em casa ou retire na loja.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "YR Make e Variedades" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a050a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${jost.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
