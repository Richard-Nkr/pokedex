import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pokédex · Ma collection TCG",
  description:
    "Suivez votre collection de cartes Pokémon : valeur Cardmarket, photos, codes, état, langue et plus-value. Simple, rapide et pensé pour le mobile.",
  applicationName: "Pokédex",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pokédex",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Pokédex · Ma collection TCG",
    description:
      "Votre collection de cartes Pokémon, sa valeur et vos plus-values, toujours avec vous.",
    type: "website",
    locale: "fr_FR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
