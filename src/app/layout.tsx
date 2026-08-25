import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BarberFlow — Agenda, Clientes & Recorrência para Barbearias',
  description: 'O SaaS simples e inteligente para barbearias aumentarem a frequência de clientes e nunca deixarem dinheiro na mesa.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0D0F12] text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
