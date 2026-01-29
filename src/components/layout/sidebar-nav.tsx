'use client';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { LayoutDashboard, Users, FilePlus, Briefcase, Handshake, Presentation, Loader2, BookText } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

export default function SidebarNav() {
  const { user } = useUser();
  const { profile, isLoading } = useUserProfile(user?.uid);
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      roles: ['regular', 'client', 'internal', 'admin'],
    },
    {
      href: '/all-sessions',
      icon: Users,
      label: 'All Sessions',
      roles: ['internal', 'admin'],
    },
    {
      label: 'Submit Session',
      roles: ['regular', 'client', 'internal', 'admin'],
      subItems: [
        { href: '/submission-guide', icon: BookText, label: 'Submission Guide' },
        { href: '/submit/workshop', icon: Briefcase, label: 'Workshop' },
        { href: '/submit/reception', icon: Handshake, label: 'Reception' },
        { href: '/submit/info-session', icon: Presentation, label: 'Info Session' },
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userRole = profile?.role || 'regular';

  return (
    <SidebarMenu>
      {navItems
        .filter(item => item.roles.includes(userRole))
        .flatMap((item, index) => {
          if (item.subItems) {
            // Render the non-clickable header
            const header = (
              <li key={`${index}-header`} className="px-4 pt-6 pb-2 text-xs font-medium text-muted-foreground">
                {item.label}
              </li>
            );

            // Render the indented sub-items
            const subItems = item.subItems.map((subItem, subIndex) => (
              <SidebarMenuItem key={`${index}-${subIndex}`}>
                <Link href={subItem.href} passHref legacyBehavior>
                  <SidebarMenuButton as="a" isActive={pathname === subItem.href} className="pl-7">
                    {subItem.icon && <subItem.icon />}
                    <span>{subItem.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ));

            return [header, ...subItems];
          }

          // Render a regular top-level link
          return (
            <SidebarMenuItem key={index}>
              <Link href={item.href || '#'} passHref legacyBehavior>
                <SidebarMenuButton as="a" isActive={pathname === item.href}>
                  {item.icon && <item.icon />}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          );
      })}
    </SidebarMenu>
  );
}
