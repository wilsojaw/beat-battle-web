import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SocketManager } from "@/components/SocketManager";
import { ConnectionStatus } from "@/components/ConnectionStatus";
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
  title: "Beat Battle - Rhythm Learning Game",
  description: "Live classroom rhythm game for music education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SocketManager>
          <ConnectionStatus />
          {children}
        </SocketManager>
      </body>
    </html>
  );
}
