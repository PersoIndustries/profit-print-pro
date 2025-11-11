import { ReactNode } from 'react';
import { Header } from '@/components/Header';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <Header variant="app" />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
