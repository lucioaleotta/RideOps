import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body style={{ fontFamily: 'Arial, sans-serif', margin: 24 }}>{children}</body>
    </html>
  );
}
