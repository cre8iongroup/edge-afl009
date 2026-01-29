'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSubmissions } from '../submissions-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { availableSlots } from '@/lib/schedule';
import { useEffect, useMemo, useState } from 'react';
import { Submission } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  companyName: z.string().min(1, 'Company name is required.'),
  receptionTitle: z.string().min(5, 'Reception title must be at least 5 characters.'),
  pocName: z.string().min(1, 'POC name is required.'),
  pocEmail: z.string().email('Please enter a valid email.'),
  preferredDate: z.string().min(1, 'Please select a date.'),
  preferredTime: z.string().min(1, 'Please select a time.'),
});

type ReceptionFormData = z.infer<typeof formSchema>;

type ReceptionFormProps = {
  submission?: Submission;
};

export default function ReceptionForm({ submission }: ReceptionFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();
  const { addSubmission, updateSubmission } = useSubmissions();
  const sessionType = 'reception';

  const form = useForm<ReceptionFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: submission ? {
      companyName: submission.companyName || '',
      receptionTitle: submission.title || '',
      pocName: submission.pocName || '',
      pocEmail: submission.pocEmail || '',
      preferredDate: submission.preferredDate ? new Date(submission.preferredDate).toISOString() : undefined,
      preferredTime: submission.preferredTime || undefined,
    } : {
      companyName: '',
      receptionTitle: '',
      pocName: '',
      pocEmail: '',
    },
  });

  const selectedDate = form.watch('preferredDate');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  const filteredSlots = useMemo(() => {
    return availableSlots.filter(slot => slot.sessionTypes.includes(sessionType));
  }, [sessionType]);

  const availableDates = useMemo(() => {
    const uniqueDates = new Set(filteredSlots.map(slot => new Date(slot.date).toISOString().split('T')[0]));
    return Array.from(uniqueDates).map(dateStr => new Date(dateStr));
  }, [filteredSlots]);

  useEffect(() => {
    if (selectedDate) {
        const dateString = new Date(selectedDate).toISOString().split('T')[0];
        const daySlots = filteredSlots.find(slot => slot.date.startsWith(dateString));
        setAvailableTimes(daySlots?.times.map(t => t.time) || []);
        form.setValue('preferredTime', ''); // Reset time when date changes
    } else {
        setAvailableTimes([]);
    }
  }, [selectedDate, form, filteredSlots]);

  function onSubmit(values: ReceptionFormData) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit.' });
      return;
    }
    try {
      const submissionData = {
        ...values,
        title: values.receptionTitle,
        preferredDate: values.preferredDate ? new Date(values.preferredDate) : undefined,
        sessionType,
      };

      if (submission) {
        updateSubmission({ ...submission, ...submissionData });
        toast({
          title: 'Reception Updated!',
          description: 'Your reception submission has been updated.',
        });
      } else {
        addSubmission({ ...submissionData, userId: user.uid, status: 'Awaiting Approval' });
        toast({
          title: 'Reception Submitted!',
          description: 'Your reception submission has been received for approval.',
        });
      }
      router.push('/dashboard');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: (error as Error).message || 'Something went wrong. Please try again.',
      });
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ALPFA, Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receptionTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reception Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Annual Networking Reception" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="pocName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Reception POC Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="pocEmail"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Reception POC Email</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., jane.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <div className="space-y-4 rounded-md border p-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Schedule Preference</h3>
                <p className="text-sm text-muted-foreground">
                  Select your preferred date and time for the session from the available slots.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="preferredDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Preferred Date</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a date" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableDates.map(date => (
                            <SelectItem key={date.toISOString()} value={date.toISOString()}>
                              {format(date, "EEEE, MMMM d, yyyy")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferredTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Time</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-wrap gap-2"
                          disabled={!selectedDate || availableTimes.length === 0}
                        >
                          {availableTimes.map((time) => (
                            <FormItem key={time}>
                              <Label className="flex items-center gap-2 rounded-md border p-2 px-3 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm">
                                <FormControl>
                                  <RadioGroupItem value={time} className="sr-only" />
                                </FormControl>
                                {time}
                              </Label>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      {!selectedDate && <FormDescription>Please select a date first.</FormDescription>}
                      {selectedDate && availableTimes.length === 0 && <FormDescription>No available times for this date.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {submission ? 'Update Reception' : 'Submit For Approval'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
