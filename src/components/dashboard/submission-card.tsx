import type { Submission } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, XCircle, AlertCircle, Edit, Briefcase, Handshake, Presentation } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import Link from 'next/link';

type SubmissionCardProps = {
  submission: Submission;
};

const statusConfig = {
  'Awaiting Approval': {
    icon: Clock,
    className: 'border-blue-500/50 text-blue-500',
  },
  'Approved': {
    icon: CheckCircle2,
    className: 'border-green-500/50 text-green-500',
  },
  'Rejected': {
    icon: XCircle,
    className: 'border-red-500/50 text-red-500',
  },
  'Needs Information': {
    icon: AlertCircle,
    className: 'border-yellow-500/50 text-yellow-500',
  },
};

const sessionTypeConfig: Record<Submission['sessionType'], { icon: React.ElementType, label: string }> = {
    'workshop': { icon: Briefcase, label: 'Workshop' },
    'reception': { icon: Handshake, label: 'Reception' },
    'info-session': { icon: Presentation, label: 'Info Session' },
};

export default function SubmissionCard({ submission }: SubmissionCardProps) {
  const status = statusConfig[submission.status];
  const StatusIcon = status.icon;

  const sessionType = sessionTypeConfig[submission.sessionType];
  const SessionTypeIcon = sessionType.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="font-headline text-lg">{submission.title}</CardTitle>
             <Badge variant="outline" className={cn('whitespace-nowrap', status.className)}>
                <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                {submission.status}
            </Badge>
          </div>
          <CardDescription className="flex gap-2 pt-2">
            <Badge variant="secondary" className="gap-1.5">
                <SessionTypeIcon className="h-3.5 w-3.5" />
                {sessionType.label}
            </Badge>
            <Badge variant="secondary">{submission.pillar}</Badge>
            <Badge variant="secondary">{submission.format}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{submission.description}</p>
        </CardContent>
        <CardFooter>
          <Link href={`/submit/${submission.sessionType}/${submission.id}`} passHref className='w-full'>
            <Button variant="outline" className="w-full">
              <Edit className="mr-2 h-4 w-4" />
              Edit Submission
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
