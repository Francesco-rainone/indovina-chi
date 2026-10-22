import type { Metadata } from "next";
import { Geist, Geist_Mono, Luckiest_Guy } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/guess-who/atoms/feedback/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const luckiest = Luckiest_Guy({
  variable: "--font-luckiest",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Indovina Chi Online — Personaggi Personalizzati",
  description: "Gioca a Indovina Chi online con personaggi creati dalle tue immagini. Board condivisa in tempo reale tra 2 giocatori.",
  keywords: ["indovina chi", "guess who", "gioco online", "multiplayer", "Next.js"],
  authors: [{ name: "Z.ai" }],
  icons: {
    icon: "/guess-who-logo.webp",
  },
  openGraph: {
    title: "Indovina Chi Online",
    description: "Personaggi personalizzati, board condivisa in tempo reale",
    siteName: "Indovina Chi",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Indovina Chi Online",
    description: "Personaggi personalizzati, board condivisa in tempo reale",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${luckiest.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
