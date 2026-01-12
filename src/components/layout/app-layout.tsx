'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import Header from '@/components/layout/header';
import SidebarNav from '@/components/layout/sidebar-nav';
import { useUser, useAuth as useFirebaseAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AIChat from '@/components/ai/ai-chat';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { LogOut } from 'lucide-react';
import { Separator } from '../ui/separator';
import AlpfaLogo from '../alpfa-logo';
import { signOut } from 'firebase/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <AlpfaLogo className="h-8 w-auto text-primary" />
            <span className="font-headline text-lg font-semibold">ALPFA 26</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
          <Separator className="mb-2" />
          <div className="flex items-center gap-3 px-2">
             <Avatar className="h-9 w-9">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ''} />
                <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
                <span className="truncate font-medium">{user.displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto" onClick={handleLogout}>
                <LogOut className="h-4 w-4"/>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        <footer className="p-4 text-center text-sm text-muted-foreground sm:p-6 lg:p-8">
          ALPFA 2026 Convention, powered by <strong className="font-semibold text-foreground">cre8ion Edge</strong>.
        </footer>
        <AIChat />
      </SidebarInset>
    </SidebarProvider>
  );
}
