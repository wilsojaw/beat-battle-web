import type { Metadata } from "next";
import { SocketManager } from "@/components/SocketManager";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          <SocketManager>
            <ConnectionStatus />
            {children}
          </SocketManager>
        </ErrorBoundary>
      </body>
    </html>
  );
}
