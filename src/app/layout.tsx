import type { Metadata } from "next";

import "./globals.css";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "Plataforma de otimização contínua de aquisição por tráfego pago.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
