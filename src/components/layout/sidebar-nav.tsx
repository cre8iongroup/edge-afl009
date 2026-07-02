'use client';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { LayoutDashboard, Users, FilePlus, Briefcase, Handshake, Presentation, Loader2, BookText, ClipboardCheck, ClipboardList, Receipt, Palette } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import { isPortalClosed, isScenicClosed } from '@/lib/deadlines';

export default function SidebarNav() {
  const { user } = useUser();
  const { profile, isLoading } = useUserProfile(user?.uid);
  const pathname = usePathname();

  // ── Nav item type ────────────────────────────────────────────────────────
  type NavItem = {
    href?: string;
    icon?: React.ElementType;
    label: string;
    roles: string[];
    hideWhenClosed?: boolean;
    /** Custom closed predicate. Falls back to isPortalClosed() when absent. */
    closedFn?: () => boolean;
    /** When true, renders a "New" badge that auto-hides when closedFn() returns true. */
    isNew?: boolean;
    subItems?: { href: string; icon: React.ElementType; label: string }[];
  };

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      roles: ['regular', 'client', 'internal', 'admin'],
    },
    {
      href: '/order',
      icon: Receipt,
      label: 'Order Summary',
      roles: ['regular'],
    },
    {
      href: '/scenic',
      icon: Palette,
      label: 'Scenic Assets',
      roles: ['regular', 'admin'],
      hideWhenClosed: true,
      closedFn: isScenicClosed,
      isNew: true,
    },
    {
      href: '/review',
      icon: ClipboardCheck,
      label: 'Review Sessions',
      roles: ['internal', 'admin', 'client'],
    },
    {
      href: '/all-sessions',
      icon: Users,
      label: 'All Sessions',
      roles: ['internal', 'admin'],
    },
    {
      href: '/av-orders',
      icon: ClipboardList,
      label: 'AV Orders',
      roles: ['internal', 'admin'],
    },
    {
      href: '/scenic-orders',
      icon: Palette,
      label: 'Scenic Orders',
      roles: ['internal', 'admin'],
    },
    {
      label: 'Submit Session',
      roles: ['regular', 'client', 'internal', 'admin'],
      // Hidden post-deadline for regular role — partners can no longer submit or edit.
      // internal/admin always see it regardless of date (bypassed in filter below).
      hideWhenClosed: true,
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
  const isAdmin = ['internal', 'admin'].includes(userRole);
  const scenicClosed = isScenicClosed();

  return (
    <SidebarMenu>
      {navItems
        .filter(item => {
          // 1. Role gate — always applied
          if (!item.roles.includes(userRole)) return false;
          // 2. Date gate — hide items flagged hideWhenClosed for non-admin users post-deadline.
          //    Uses item.closedFn() when present, falls back to isPortalClosed().
          if (item.hideWhenClosed && !isAdmin) {
            const closed = item.closedFn ? item.closedFn() : isPortalClosed();
            if (closed) return false;
          }
          return true;
        })
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
                  {item.isNew && !scenicClosed && (
                    <span className="ml-auto inline-flex items-center rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 leading-none">
                      New
                    </span>
                  )}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          );
      })}
    </SidebarMenu>
  );
}
