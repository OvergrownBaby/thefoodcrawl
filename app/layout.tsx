import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Clean, modern editorial serif — used for display copy only.
// Sharper than Fraunces (which the user vetoed). Looks at home in
// the NYT / The Atlantic / Eater editorial register.
const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://thefoodcrawl.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Foodcrawl — restaurants from the people you trust",
    template: "%s — Foodcrawl",
  },
  description:
    "Drop any YouTube, TikTok, Reddit or article link. The AI watches it, finds every restaurant mentioned, drops them on a map — with verbatim quotes and timestamps.",
  applicationName: "Foodcrawl",
  authors: [{ name: "OvergrownBaby", url: "https://github.com/OvergrownBaby" }],
  keywords: [
    "restaurants",
    "food map",
    "food creators",
    "Mark Wiens",
    "food discovery",
    "TikTok restaurant map",
    "YouTube restaurant extractor",
  ],
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Foodcrawl",
    title: "Foodcrawl — restaurants from the people you trust",
    description:
      "Drop a video link. The AI watches it. Every restaurant pinned with a verbatim quote and a timestamp.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foodcrawl — restaurants from the people you trust",
    description:
      "Drop a video link. The AI watches it. Every restaurant pinned with a verbatim quote and a timestamp.",
    creator: "@OvergrownBaby",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${newsreader.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
