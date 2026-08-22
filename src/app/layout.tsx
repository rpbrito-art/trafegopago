import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Tráfego Pago",
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
