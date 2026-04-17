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
import { AlertCircle, Clock, MoreHorizontal, Briefcase, Presentation, Handshake, Info, CalendarCheck } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useSubmissions } from '../submissions-provider';
import type { Submission } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { useUserProfiles } from '@/hooks/use-user-profiles';
import { useToast } from '@/hooks/use-toast';
import { sendStatusUpdateEmail } from '@/lib/actions';

const statusConfig: Record<Submission['status'], { icon: React.ElementType; label: string; className: string }> = {
    phase_1: { icon: Clock,         label: 'Phase 1 — Awaiting Approval',         className: 'text-blue-500 border-blue-500/50' },
    phase_2: { icon: AlertCircle,   label: 'Phase 2 — Action Required',            className: 'text-yellow-500 border-yellow-500/50' },
    phase_3: { icon: Info,          label: 'Phase 3 — Submitted - Awaiting Room Assignment',   className: 'text-indigo-500 border-indigo-500/50' },
    phase_4: { icon: CalendarCheck, label: 'Phase 4 — Locked',                    className: 'text-green-500 border-green-500/50' },
};

const phaseMenuItems: { phase: Submission['status']; label: string }[] = [
    { phase: 'phase_1', label: 'Move to Phase 1 — Awaiting Approval' },
    { phase: 'phase_2', label: 'Move to Phase 2 — Action Required' },
    { phase: 'phase_3', label: 'Move to Phase 3 — Submitted - Awaiting Room Assignment' },
    { phase: 'phase_4', label: 'Move to Phase 4 — Locked' },
];

const sessionTypeConfig: Record<Submission['sessionType'], { icon: React.ElementType, label: string }> = {
    'workshop': { icon: Briefcase, label: 'Workshop' },
    'reception': { icon: Handshake, label: 'Reception' },
    'info-session': { icon: Presentation, label: 'Info Session' },
};


export default function SubmissionsTable() {
    const { users } = useUserProfiles();
    const { submissions, updateSubmission } = useSubmissions();
    const { toast } = useToast();
    
    const data = submissions.map(sub => {
        const user = users?.find(u => u.id === sub.userId)
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
        }
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
                        title: "Status Updated & Notified",
                        description: `Status changed to "${newStatus}" and an email was sent to ${submitter.email}.`,
                    });
                } catch (error) {
                     toast({
                        variant: 'destructive',
                        title: "Update Succeeded, Notification Failed",
                        description: `The submission status was updated, but the notification email could not be sent. Please check the console for more details.`,
                    });
                }
            } else {
                toast({
                    title: "Status Updated",
                    description: `Submission status changed to "${newStatus}".`,
                });
            }
        }
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
                <TableHead className="text-right">Submitted On</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const StatusIcon = statusConfig[item.status]?.icon || Clock;
                const statusClassName = statusConfig[item.status]?.className || '';
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
                            <Badge variant="outline" className={cn('whitespace-nowrap font-medium', statusClassName)}>
                                <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                                {statusConfig[item.status]?.label ?? item.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{item.pillar}</TableCell>
                        <TableCell>{item.format}</TableCell>
                        <TableCell className="text-right">{format(item.createdAt, 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
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
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
