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
import { AlertCircle, CheckCircle2, Clock, XCircle, MoreHorizontal, Briefcase, Presentation, Handshake } from 'lucide-react';
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

const statusConfig: Record<Submission['status'], { icon: React.ElementType, className: string }> = {
    'Awaiting Approval': { icon: Clock, className: 'text-blue-500 border-blue-500/50' },
    'Approved': { icon: CheckCircle2, className: 'text-green-500 border-green-500/50' },
    'Rejected': { icon: XCircle, className: 'text-red-500 border-red-500/50' },
    'Needs Information': { icon: AlertCircle, className: 'text-yellow-500 border-yellow-500/50' },
};

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
            toast({
                title: "Status Updated",
                description: `Submission status changed to "${newStatus}".`,
            });
            
            const submitter = users?.find(u => u.id === submission.userId);
            if (submitter?.email) {
                try {
                    await sendStatusUpdateEmail(updatedSubmission, submitter.email);
                    toast({
                        title: "Notification Sent",
                        description: `An email has been sent to ${submitter.email}.`,
                    });
                } catch (error) {
                     toast({
                        variant: 'destructive',
                        title: "Notification Failed",
                        description: `Could not send email. See console for details.`,
                    });
                }
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
                                {item.status}
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
                                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.keys(statusConfig).map((status) => (
                                        <DropdownMenuItem
                                            key={status}
                                            onSelect={() => handleStatusChange(item.id, status as Submission['status'])}
                                            disabled={item.status === status}
                                        >
                                            {status}
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
