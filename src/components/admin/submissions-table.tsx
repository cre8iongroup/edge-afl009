'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Briefcase, Presentation, Handshake, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useSubmissions } from '../submissions-provider';
import type { Submission } from '@/lib/types';
import { useUserProfiles } from '@/hooks/use-user-profiles';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { createXeroInvoice } from '@/lib/xero-actions';
import { useToast } from '@/hooks/use-toast';

// Short badge label + colored dot — full label is visible inside the session detail
const statusConfig: Record<Submission['status'], { dot: string; label: string; className: string }> = {
    phase_1: { dot: 'bg-blue-500',   label: 'Phase 1', className: 'text-blue-500 border-blue-500/50' },
    phase_2: { dot: 'bg-yellow-500', label: 'Phase 2', className: 'text-yellow-500 border-yellow-500/50' },
    phase_3: { dot: 'bg-indigo-500', label: 'Phase 3', className: 'text-indigo-500 border-indigo-500/50' },
    phase_4: { dot: 'bg-green-500',  label: 'Phase 4', className: 'text-green-500 border-green-500/50' },
};

const sessionTypeConfig: Record<Submission['sessionType'], { icon: React.ElementType; label: string }> = {
    'workshop':     { icon: Briefcase,    label: 'Workshop' },
    'reception':    { icon: Handshake,    label: 'Reception' },
    'info-session': { icon: Presentation, label: 'Info Session' },
};

export default function SubmissionsTable() {
    const { users } = useUserProfiles();
    const { submissions } = useSubmissions();
    const router = useRouter();
    const { toast } = useToast();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);

    const toggleSelect = (id: string) => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    };

    const data = submissions.map(sub => {
        const user = users?.find(u => u.id === sub.userId);
        return {
            ...sub,
            user: user ? {
                name: user.name,
                email: user.email,
                avatar: user.avatar,
            } : {
                name: 'Unknown User',
                email: '',
                avatar: '',
            }
        };
    });

    const sortedData = [...data].sort((a, b) => {
      if (a.isProxy && !b.isProxy) return -1;
      if (!a.isProxy && b.isProxy) return 1;
      if (a.isProxy && b.isProxy) {
        const aEmail = a.pocEmail ?? a.presenterPocEmail ?? '';
        const bEmail = b.pocEmail ?? b.presenterPocEmail ?? '';
        return aEmail.localeCompare(bEmail);
      }
      return 0;
    });

    const handleGenerateProxyInvoice = async () => {
      const selectedItems = sortedData.filter(item => selectedIds.has(item.id));
      const rawEmails = selectedItems
        .map(item => item.pocEmail ?? item.presenterPocEmail ?? null)
        .filter((e): e is string => Boolean(e));
      const uniqueEmails = [...new Set(rawEmails)];
      if (uniqueEmails.length !== 1) {
        toast({ title: 'Mismatched partners', description: 'All selected sessions must belong to the same partner.', variant: 'destructive' });
        return;
      }
      setIsGenerating(true);
      try {
        const partnerEmail = uniqueEmails[0];
        const partnerName = selectedItems[0].companyName ?? partnerEmail;
        const sessionIds = selectedItems.map(s => s.id);
        const result = await createXeroInvoice(
          selectedItems,
          partnerEmail,
          partnerName,
          `PROXY-${Date.now()}`,
          sessionIds,
          'manual',
        );
        if (result.success) {
          toast({ title: `Invoice generated — ${result.invoiceNumber ?? result.invoiceId}` });
          setSelectedIds(new Set());
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          toast({ title: 'Invoice generation failed', description: result.error, variant: 'destructive' });
        }
      } finally {
        setIsGenerating(false);
      }
    };

    const selectedEmails = [...new Set(
      [...selectedIds]
        .map(id => {
          const item = sortedData.find(d => d.id === id);
          return item?.pocEmail ?? item?.presenterPocEmail ?? null;
        })
        .filter((e): e is string => Boolean(e))
    )];
    const emailMismatch = selectedEmails.length > 1;
    const firstSelectedEmail = selectedEmails[0] ?? null;

  return (
    <>
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Submitter</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Pillar</TableHead>
                <TableHead>Format</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item) => {
                const statusCfg = statusConfig[item.status] ?? statusConfig['phase_1'];
                const SessionTypeIcon = sessionTypeConfig[item.sessionType]?.icon || Briefcase;
                const sessionTypeLabel = sessionTypeConfig[item.sessionType]?.label || 'Workshop';
                const userName = (item.user?.name && item.user?.name !== 'New Member') ? item.user.name : item.user?.email;
                const fallbackInitial = userName?.charAt(0) || '';
                const partnerEmail = item.pocEmail ?? item.presenterPocEmail ?? null;

                return (
                    <TableRow
                        key={item.id}
                        className="cursor-pointer"
                        style={item.isProxy && partnerEmail ? {
                          borderLeft: '2px solid rgba(150,150,150,0.3)',
                          backgroundColor: 'rgba(150,150,150,0.05)',
                        } : undefined}
                        onClick={() => router.push(`/submit/${item.sessionType}/${item.id}?from=all-sessions`)}
                    >
                        <TableCell onClick={e => e.stopPropagation()} className="w-10">
                          {item.isProxy && (
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={() => toggleSelect(item.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={item.user?.avatar || ''} alt={item.user?.name || ''} />
                                    <AvatarFallback>{fallbackInitial}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium">{userName}</div>
                                    <div className="text-xs text-muted-foreground">{item.user?.email}</div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.companyName || '—'}</TableCell>
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.title}
                              {item.isProxy && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal text-muted-foreground">
                                  Proxy
                                </Badge>
                              )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <SessionTypeIcon className="h-4 w-4 text-muted-foreground" />
                                    {sessionTypeLabel}
                                </div>
                                {item.community && (
                                    <Badge variant="secondary" className="text-xs w-fit px-1.5 py-0 font-normal">
                                        Community
                                    </Badge>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge variant="outline" className={cn('whitespace-nowrap font-medium gap-1.5', statusCfg.className)}>
                                <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', statusCfg.dot)} />
                                {statusCfg.label}
                            </Badge>
                        </TableCell>
                        <TableCell>{item.pillar}</TableCell>
                        <TableCell>{item.format}</TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    {selectedIds.size > 0 && (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'hsl(var(--background))',
        borderTop: '1px solid hsl(var(--border))',
        padding: '12px 24px',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <span className="text-sm font-medium">{selectedIds.size} session(s) selected</span>
        {firstSelectedEmail && (
          <span className="text-sm text-muted-foreground">{firstSelectedEmail}</span>
        )}
        {emailMismatch && (
          <span className="text-sm text-red-600 font-medium">⚠ Sessions must belong to the same partner</span>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleGenerateProxyInvoice}
            disabled={emailMismatch || isGenerating}
          >
            {isGenerating
              ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Generating…</>
              : 'Generate Invoice'
            }
          </Button>
        </div>
      </div>
    )}
    </>
  );
}
