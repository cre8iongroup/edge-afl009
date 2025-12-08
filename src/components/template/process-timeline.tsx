'use client';

import { FilePlus, Hourglass, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const processSteps = [
  {
    icon: FilePlus,
    title: '1. Draft & Submit',
    description: 'Fill out the initial proposal with your session concept, title, and core objectives.',
  },
  {
    icon: Hourglass,
    title: '2. Await Review',
    description: 'The ALPFA review team will evaluate your submission. You can track the status on your dashboard.',
  },
  {
    icon: FileText,
    title: '3. Add Presenter Details',
    description: 'Once approved, you will be prompted to add presenter information, including bio and headshot.',
  },
  {
    icon: CheckCircle,
    title: '4. Finalize & Confirm',
    description: 'With all information complete, your session is confirmed and ready for the convention schedule!',
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
                        <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
  );
}
