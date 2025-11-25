'use client';

import { submissions } from '@/lib/data';
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
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../auth-provider';


const statusConfig = {
    'Waiting for Approval': { icon: Clock, className: 'text-blue-500' },
    'Approved': { icon: CheckCircle2, className: 'text-green-500' },
    'Rejected': { icon: XCircle, className: 'text-red-500' },
    'Needs Information': { icon: AlertCircle, className: 'text-yellow-500' },
};


export default function SubmissionsTable() {
    const { users } = useAuth();
    const data = submissions.map(sub => ({
        ...sub,
        user: users.find(u => u.id === sub.userId)
    }));

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitter</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Pillar</TableHead>
                <TableHead>Format</TableHead>
                <TableHead className="text-right">Submitted On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const StatusIcon = statusConfig[item.status].icon;
                const statusClassName = statusConfig[item.status].className;
                return (
                    <TableRow key={item.id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={item.user?.avatar} alt={item.user?.name} />
                                    <AvatarFallback>{item.user?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium">{item.user?.name}</div>
                                    <div className="text-xs text-muted-foreground">{item.user?.email}</div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant="outline" className={cn('whitespace-nowrap font-medium', statusClassName)}>
                                <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                                {item.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{item.pillar}</TableCell>
                        <TableCell>{item.format}</TableCell>
                        <TableCell className="text-right">{format(item.createdAt, 'MMM d, yyyy')}</TableCell>
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
