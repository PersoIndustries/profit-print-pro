import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TrialNotification } from '@/components/TrialNotification';
import { GracePeriodAlert } from '@/components/GracePeriodAlert';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted">
      <Header variant="app" />
      <TrialNotification />
      <GracePeriodAlert />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer variant="app" />
    </div>
  );
};
