import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { RegisterSW } from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: 'Leitor de Hidrômetros',
  description: 'Extração automática de índices de hidrômetros a partir de fotos',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.png' },
};

export const viewport: Viewport = {
  themeColor: '#3ecfc0',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
