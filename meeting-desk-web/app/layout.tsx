import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Self-hosted fonts (WOFF2, OFL-1.1 — see app/fonts/LICENSE.txt), loaded with next/font/local
 * like Trinity. No build-time call to Google Fonts, so builds work on any build server.
 */
const plexSans = localFont({
  variable: "--font-plex-sans",
  display: "swap",
  src: [
    { path: "./fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

const sourceSerif = localFont({
  variable: "--font-source-serif",
  display: "swap",
  src: [{ path: "./fonts/source-serif-4-latin-opsz-normal.woff2", weight: "200 900", style: "normal" }],
});

export const metadata: Metadata = {
  title: {
    default: "Meeting Requests",
    template: "%s · Meeting Requests",
  },
  description: "ABR internal meeting requests and client booking.",
};

/**
 * Root layout: fonts + global CSS only.
 * Keep page-specific assets (images, video, heavy libraries) out of here —
 * everything in this file loads on every route.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full bg-ground font-sans text-body">{children}</body>
    </html>
  );
}
