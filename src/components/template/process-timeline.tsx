'use client';

import { FilePlus, Hourglass, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const processSteps = [
  {
    icon: FilePlus,
    title: '1. Draft & Submit',
    dateLine: 'Submit by May 9',
    description: 'Fill out your session information including title, description, session type, and top 3 time preferences for ALPFA approval.',
  },
  {
    icon: Hourglass,
    title: '2. Await Review',
    dateLine: 'Review within 72 hours',
    description: 'The ALPFA programs team will evaluate your submission within 72 hours. You can track the status on your dashboard and will be notified once approved.',
  },
  {
    icon: FileText,
    title: '3. Add Details',
    dateLine: 'Complete by June 20',
    description: "Once approved, you'll complete your presenter information, select your AV package, and finalize payment.",
  },
  {
    icon: CheckCircle,
    title: '4. Finalize & Confirm',
    dateLine: 'Assignment sent by July 1',
    description: "With all information complete, your session is confirmed and ready for the convention schedule! You'll receive your time and room assignment.",
  },
];

export default function ProcessTimeline() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <step.icon className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mb-2 text-sm font-bold text-foreground">{step.dateLine}</p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
