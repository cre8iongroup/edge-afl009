import type { Submission } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, XCircle, AlertCircle, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import Link from 'next/link';

type SubmissionCardProps = {
  submission: Submission;
};

const statusConfig = {
  'Awaiting Approval': {
    icon: Clock,
    color: 'bg-blue-500',
    className: 'border-blue-500/50 text-blue-500',
  },
  'Approved': {
    icon: CheckCircle2,
    color: 'bg-green-500',
    className: 'border-green-500/50 text-green-500',
  },
  'Rejected': {
    icon: XCircle,
    color: 'bg-red-500',
    className: 'border-red-500/50 text-red-500',
  },
  'Needs Information': {
    icon: AlertCircle,
    color: 'bg-yellow-500',
    className: 'border-yellow-500/50 text-yellow-500',
  },
};


export default function SubmissionCard({ submission }: SubmissionCardProps) {
  const { icon: Icon, className } = statusConfig[submission.status];
  
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
             <Badge variant="outline" className={cn('whitespace-nowrap', className)}>
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {submission.status}
            </Badge>
          </div>
          <CardDescription className="flex gap-2 pt-2">
            <Badge variant="secondary">{submission.pillar}</Badge>
            <Badge variant="secondary">{submission.format}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{submission.description}</p>
        </CardContent>
        <CardFooter>
          <Link href={`/submit/${submission.id}`} passHref legacyBehavior>
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
