'use client';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useAuth } from '@/components/auth-provider';
import { LayoutDashboard, Users, FilePlus, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function SidebarNav() {
  const { user } = useAuth();
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
      label: 'Admin',
      roles: ['client', 'internal'],
    },
    {
      href: '/submit',
      icon: FilePlus,
      label: 'Submit Workshop',
      roles: ['regular', 'client', 'internal'],
    },
    // {
    //   href: '/settings',
    //   icon: Settings,
    //   label: 'Settings',
    //   roles: ['regular', 'client', 'internal'],
    // }
  ];

  if (!user) return null;

  return (
    <SidebarMenu>
      {navItems
        .filter((item) => item.roles.includes(user.role))
        .map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
    </SidebarMenu>
  );
}
