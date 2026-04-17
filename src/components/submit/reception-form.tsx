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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { submissionFormConfig } from '@/lib/data';
import type { Submission } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Label } from '../ui/label';
import { useSubmissions } from '../submissions-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { availableSlots } from '@/lib/schedule';

const formSchema = z.object({
  companyName: z.string().min(1, 'Company name is required.'),
  receptionTitle: z.string().min(5, 'Reception title must be at least 5 characters.'),
  audience: z.array(z.string()).min(1, 'Please select at least one intended audience.'),
  secondaryAudience: z.array(z.string()).optional(),
  pocName: z.string().min(1, 'POC name is required.'),
  pocEmail: z.string().email('Please enter a valid email.'),
  preferredDate: z.string().min(1, 'Please select a date.'),
  preferredTime: z.string().min(1, 'Please select a time.'),
  preferredDate2: z.string().optional(),
  preferredTime2: z.string().optional(),
});

type ReceptionFormData = z.infer<typeof formSchema>;

const TooltipIcon = () => <HelpCircle className="h-4 w-4 text-muted-foreground" />;

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
      ...submission,
      receptionTitle: submission.title || '',
      audience: Array.isArray(submission.audience) ? submission.audience : [submission.audience].filter(Boolean) as string[],
      secondaryAudience: Array.isArray(submission.secondaryAudience) ? submission.secondaryAudience : [submission.secondaryAudience].filter(Boolean) as string[],
      preferredDate: submission.preferredDate ? new Date(submission.preferredDate).toISOString() : undefined,
      preferredDate2: submission.preferredDate2 ? new Date(submission.preferredDate2).toISOString() : undefined,
    } : {
      companyName: '',
      receptionTitle: '',
      audience: [],
      pocName: '',
      pocEmail: '',
      secondaryAudience: [],
    },
  });

  const selectedDate1 = form.watch('preferredDate');
  const selectedDate2 = form.watch('preferredDate2');

  const filteredSlots = useMemo(() => {
    return availableSlots.filter(slot => slot.sessionTypes.includes(sessionType));
  }, [sessionType]);

  const availableDates = useMemo(() => {
    const uniqueDates = Array.from(new Set(filteredSlots.map(slot => slot.date.split('T')[0])));
    return uniqueDates.map(dateStr => new Date(`${dateStr}T12:00:00Z`));
  }, [filteredSlots]);

  const availableTimes1 = useMemo(() => {
    if (!selectedDate1) return [];
    const dateString = new Date(selectedDate1).toISOString().split('T')[0];
    const daySlots = filteredSlots.find(slot => slot.date.startsWith(dateString));
    return daySlots?.times.map(t => t.time) || [];
  }, [selectedDate1, filteredSlots]);

  const availableTimes2 = useMemo(() => {
    if (!selectedDate2) return [];
    const dateString = new Date(selectedDate2).toISOString().split('T')[0];
    const daySlots = filteredSlots.find(slot => slot.date.startsWith(dateString));
    return daySlots?.times.map(t => t.time) || [];
  }, [selectedDate2, filteredSlots]);

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
        preferredDate2: values.preferredDate2 ? new Date(values.preferredDate2) : undefined,
        sessionType,
      };

      if (submission) {
        updateSubmission({ ...submission, ...submissionData });
        toast({
          title: 'Reception Updated!',
          description: 'Your reception submission has been updated.',
        });
      } else {
        addSubmission({ ...submissionData, userId: user.uid });
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
        <TooltipProvider>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold font-headline">Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ALPFA, Inc." {...field} className="bg-background/50" />
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
                      <FormLabel className="text-lg font-semibold font-headline">Reception Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Annual Networking Reception" {...field} className="bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* POC Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="pocName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold font-headline">Reception POC Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Jane Doe" {...field} className="bg-background/50" />
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
                      <FormLabel className="text-lg font-semibold font-headline">Reception POC Email</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., jane.doe@example.com" {...field} className="bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Audience Section */}
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="audience"
                  render={() => (
                    <FormItem className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-xl font-semibold font-headline">Intended Audiences</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                          <TooltipContent><p className="max-w-xs">Select all audiences that this reception is designed for.</p></TooltipContent>
                        </Tooltip>
                      </div>
                      <FormDescription>Select multiple audiences if applicable.</FormDescription>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {submissionFormConfig.audiences.map((item) => (
                          <FormField
                            key={item.value}
                            control={form.control}
                            name="audience"
                            render={({ field }) => {
                              const isArray = Array.isArray(field.value);
                              const isChecked = isArray ? field.value.includes(item.value) : field.value === item.value;
                              return (
                                <FormItem key={item.value}>
                                  <Label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm bg-background/50 h-full">
                                    <FormControl>
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          const currentValues = Array.isArray(field.value) ? field.value : [];
                                          return checked
                                            ? field.onChange([...currentValues, item.value])
                                            : field.onChange(
                                              currentValues.filter(
                                                (value) => value !== item.value
                                              )
                                            )
                                        }}
                                        className="sr-only"
                                      />
                                    </FormControl>
                                    <div className="flex-1 space-y-1">
                                      <div className="font-semibold flex items-center justify-between gap-2">
                                        {item.label}
                                        {isChecked && <div className="h-2 w-2 rounded-full bg-primary" />}
                                      </div>
                                    </div>
                                  </Label>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondaryAudience"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-lg font-medium">Secondary Audience <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                          <TooltipContent><p className="max-w-xs">Select an additional audience that would benefit from this reception.</p></TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                          {submissionFormConfig.secondaryAudiences.map((audience) => (
                              <FormField
                                  key={audience.value}
                                  control={form.control}
                                  name="secondaryAudience"
                                  render={({ field }) => {
                                      const isArray = Array.isArray(field.value);
                                      const isChecked = isArray ? field.value.includes(audience.value) : field.value === audience.value;
                                      return (
                                          <FormItem key={audience.value}>
                                              <Label className="flex items-center justify-center text-center px-2 py-3 rounded-md border cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm bg-background/50 text-xs h-full min-h-[60px]">
                                                  <FormControl>
                                                      <Checkbox
                                                          checked={isChecked}
                                                          onCheckedChange={(checked) => {
                                                              const currentValues = Array.isArray(field.value) ? field.value : [];
                                                              return checked
                                                                  ? field.onChange([...currentValues, audience.value])
                                                                  : field.onChange(
                                                                      currentValues.filter(
                                                                          (value) => value !== audience.value
                                                                      )
                                                                  )
                                                          }}
                                                          className="sr-only"
                                                      />
                                                  </FormControl>
                                                  {audience.label}
                                              </Label>
                                          </FormItem>
                                      );
                                  }}
                              />
                          ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Schedule Section */}
              <div className="space-y-8 rounded-lg border p-6 bg-muted/30">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold font-headline">Schedule Preference</h3>
                  <p className="text-sm text-muted-foreground">
                    Select your top two preferred date and time slots for the reception.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Option 1 */}
                  <div className="space-y-6">
                    <div className="font-medium text-lg border-b pb-2">Option 1</div>
                    <FormField
                      control={form.control}
                      name="preferredDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Preferred Date</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50">
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
                              className="grid grid-cols-2 gap-2"
                              disabled={!selectedDate1 || availableTimes1.length === 0}
                            >
                              {availableTimes1.map((time) => (
                                <FormItem key={time}>
                                  <Label className="flex items-center justify-center gap-2 rounded-md border p-2 px-3 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm bg-background/50 text-sm h-full">
                                    <FormControl>
                                      <RadioGroupItem value={time} className="sr-only" />
                                    </FormControl>
                                    {time}
                                  </Label>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          {!selectedDate1 && <FormDescription>Please select a date first.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Option 2 */}
                  <div className="space-y-6">
                    <div className="font-medium text-lg border-b pb-2">Option 2 <span className="text-muted-foreground font-normal">(Optional)</span></div>
                    <FormField
                      control={form.control}
                      name="preferredDate2"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Preferred Date</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50">
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
                      name="preferredTime2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Time</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-2 gap-2"
                              disabled={!selectedDate2 || availableTimes2.length === 0}
                            >
                              {availableTimes2.map((time) => (
                                <FormItem key={time}>
                                  <Label className="flex items-center justify-center gap-2 rounded-md border p-2 px-3 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm bg-background/50 text-sm h-full">
                                    <FormControl>
                                      <RadioGroupItem value={time} className="sr-only" />
                                    </FormControl>
                                    {time}
                                  </Label>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          {!selectedDate2 && <FormDescription>Please select a date first.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Section */}
              <div className="flex flex-col items-end gap-3 pt-4 border-t">
                <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px]">
                  {submission ? 'Update Reception' : 'Submit For Approval'}
                </Button>
                <p className="text-[10px] text-muted-foreground max-w-[300px] text-right">
                  By submitting, you opt into marketing and notifications from cre8ion. You can opt out any time.
                </p>
              </div>
            </form>
          </Form>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
