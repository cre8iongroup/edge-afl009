import type { Metadata } from 'next';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { SubmissionsProvider } from '@/components/submissions-provider';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const metadata: Metadata = {
  title: 'ALPFA 2026 Convention Portal',
  description: 'The official portal for the ALPFA 2026 Convention.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const bgImage = PlaceHolderImages.find(p => p.id === 'stage-background');

  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body 
        className="font-body antialiased bg-stage"
        style={{ '--bg-image': `url(${bgImage?.imageUrl})` } as React.CSSProperties}
      >
        <AuthProvider>
          <SubmissionsProvider>
            {children}
            <Toaster />
          </SubmissionsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
