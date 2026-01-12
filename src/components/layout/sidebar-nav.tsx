'use client';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { LayoutDashboard, Users, FilePlus, Settings, Briefcase, Handshake, Presentation, Loader2, BookOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function SidebarNav() {
  const { user } = useUser();
  const { profile, isLoading } = useUserProfile(user?.uid);
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      roles: ['regular', 'client', 'internal'],
    },
    {
      href: '/admin',
      icon: Users,
      label: 'All Sessions',
      roles: ['client', 'internal'],
    },
  ];

  const submissionItems = [
     {
      href: '/submit/workshop',
      icon: Briefcase,
      label: 'Workshop',
      roles: ['regular', 'client', 'internal'],
    },
    {
      href: '/submit/reception',
      icon: Handshake,
      label: 'Reception',
      roles: ['regular', 'client', 'internal'],
    },
    {
      href: '/submit/info-session',
      icon: Presentation,
      label: 'Info Session',
      roles: ['regular', 'client', 'internal'],
    }
  ];

  if (isLoading) {
    return (
      <div className="p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  
  if (!user || !profile) return null;

  return (
    <SidebarMenu>
      {navItems
        .filter((item) => item.roles.includes(profile.role))
        .map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href}>
              <SidebarMenuButton
                isActive={pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/')}
                tooltip={item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <Link href="/template">
             <SidebarMenuButton
              isActive={pathname.startsWith('/submit') || pathname.startsWith('/template')}
              tooltip="Submit Session"
            >
              <FilePlus />
              <span>Submit Session</span>
            </SidebarMenuButton>
          </Link>
          <SidebarMenuSub>
             <li>
                <Link href="/template">
                    <SidebarMenuSubButton
                      isActive={pathname === '/template'}
                    >
                      <BookOpen />
                      <span>Submission Guide</span>
                    </SidebarMenuSubButton>
                  </Link>
              </li>
            {submissionItems
              .filter((item) => item.roles.includes(profile.role))
              .map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuSubButton
                      isActive={pathname === item.href}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuSubButton>
                  </Link>
                </li>
            ))}
          </SidebarMenuSub>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
