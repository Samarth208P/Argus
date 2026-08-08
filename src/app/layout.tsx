import type { Metadata } from "next";
import { Cinzel, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Argus — Lie Detector for Ethereum RPCs",
  description:
    "Argus continuously cross-examines Ethereum RPC providers, detects censorship and stale data, and publishes cryptographically verifiable evidence. Built for the Censorship Resistance track at Road to Devcon 2026.",
  openGraph: {
    title: "Argus — Lie Detector for Ethereum RPCs",
    description:
      "Server-side RPC monitor with isomorphic consensus math and on-chain attestation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#000000] text-white antialiased">{children}</body>
    </html>
  );
}
