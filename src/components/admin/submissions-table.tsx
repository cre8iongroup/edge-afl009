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
import { MoreHorizontal, Briefcase, Presentation, Handshake, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useSubmissions } from '../submissions-provider';
import type { Submission } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { useUserProfiles } from '@/hooks/use-user-profiles';
import { useToast } from '@/hooks/use-toast';
import { sendStatusUpdateEmail } from '@/lib/actions';
import { useRouter } from 'next/navigation';

// Short badge label + colored dot — full label is visible inside the session detail
const statusConfig: Record<Submission['status'], { dot: string; label: string; className: string }> = {
    phase_1:          { dot: 'bg-blue-500',   label: 'Phase 1',          className: 'text-blue-500 border-blue-500/50' },
    phase_1_revision: { dot: 'bg-orange-500', label: 'Phase 1 · Revision', className: 'text-orange-500 border-orange-500/50' },
    phase_2:          { dot: 'bg-yellow-500', label: 'Phase 2',          className: 'text-yellow-500 border-yellow-500/50' },
    phase_3:          { dot: 'bg-indigo-500', label: 'Phase 3',          className: 'text-indigo-500 border-indigo-500/50' },
    phase_4:          { dot: 'bg-green-500',  label: 'Phase 4',          className: 'text-green-500 border-green-500/50' },
};

const phaseMenuItems: { phase: Submission['status']; label: string }[] = [
    { phase: 'phase_1',          label: 'Move to Phase 1 — Awaiting Approval' },
    { phase: 'phase_1_revision', label: 'Move to Phase 1 — Revision Requested' },
    { phase: 'phase_2',          label: 'Move to Phase 2 — Action Required' },
    { phase: 'phase_3',          label: 'Move to Phase 3 — Submitted - Awaiting Room Assignment' },
    { phase: 'phase_4',          label: 'Move to Phase 4 — Locked' },
];

const sessionTypeConfig: Record<Submission['sessionType'], { icon: React.ElementType, label: string }> = {
    'workshop':     { icon: Briefcase,    label: 'Workshop' },
    'reception':    { icon: Handshake,    label: 'Reception' },
    'info-session': { icon: Presentation, label: 'Info Session' },
};

export default function SubmissionsTable() {
    const { users } = useUserProfiles();
    const { submissions, updateSubmission } = useSubmissions();
    const { toast } = useToast();
    const router = useRouter();

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

    const handleStatusChange = async (submissionId: string, newStatus: Submission['status']) => {
        const submission = submissions.find(s => s.id === submissionId);
        if (submission) {
            const updatedSubmission = { ...submission, status: newStatus };
            updateSubmission(updatedSubmission);

            const submitter = users?.find(u => u.id === submission.userId);
            if (submitter?.email) {
                try {
                    await sendStatusUpdateEmail(updatedSubmission, submitter.email);
                    toast({
                        title: 'Status Updated & Notified',
                        description: `Status changed to "${newStatus}" and an email was sent to ${submitter.email}.`,
                    });
                } catch {
                    toast({
                        variant: 'destructive',
                        title: 'Update Succeeded, Notification Failed',
                        description: 'The submission status was updated, but the notification email could not be sent.',
                    });
                }
            } else {
                toast({
                    title: 'Status Updated',
                    description: `Submission status changed to "${newStatus}".`,
                });
            }
        }
    };

    const handleOpenSession = (item: Submission) => {
        router.push(`/submit/${item.sessionType}/${item.id}`);
    };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitter</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Pillar</TableHead>
                <TableHead>Format</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const statusCfg = statusConfig[item.status] ?? statusConfig['phase_1'];
                const SessionTypeIcon = sessionTypeConfig[item.sessionType]?.icon || Briefcase;
                const sessionTypeLabel = sessionTypeConfig[item.sessionType]?.label || 'Workshop';
                const userName = (item.user?.name && item.user?.name !== 'New Member') ? item.user.name : item.user?.email;
                const fallbackInitial = userName?.charAt(0) || '';
                return (
                    <TableRow key={item.id}>
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
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <SessionTypeIcon className="h-4 w-4 text-muted-foreground" />
                                {sessionTypeLabel}
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
                        <TableCell className="text-right">
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => handleOpenSession(item)}>
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open Session
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Change Phase</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {phaseMenuItems.map(({ phase, label }) => (
                                        <DropdownMenuItem
                                            key={phase}
                                            onSelect={() => handleStatusChange(item.id, phase)}
                                            disabled={item.status === phase}
                                        >
                                            {label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
