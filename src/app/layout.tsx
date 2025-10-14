// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Historial de Solicitudes",
  description: "UI CEP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gradient-to-b from-[#0b2ea6] to-[#001c62] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
