import React from 'react';

export const metadata = {
  title: 'BarberFlow Admin — Central de Controle do SaaS',
  description: 'Painel executivo e administrativo global da plataforma BarberFlow.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
