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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { HelpCircle, Upload, CalendarIcon } from 'lucide-react';
import { submissionFormConfig } from '@/lib/data';
import type { Submission } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Label } from '../ui/label';
import { useSubmissions } from '../submissions-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { availableSlots } from '@/lib/schedule';
import { sendSessionSubmittedEmail } from '@/lib/actions';

const formSchema = z.object({
  pillar: z.string().min(1, 'Please select a pillar.'),
  format: z.string().min(1, 'Please select a session format.'),
  audience: z.string().min(1, 'Please select an intended audience.'),
  secondaryAudience: z.array(z.string()).optional(),
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(20, 'Description must be at least 20 characters.'),
  objectives: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You must select at least one objective.',
  }).refine(value => value.length <= 3, {
    message: 'You can select up to 3 objectives.',
  }),
  cpe: z.boolean().default(false),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  preferredDate2: z.string().optional(),
  preferredTime2: z.string().optional(),
  presenterName: z.string().optional(),
  presenterEmail: z.string().email('Please enter a valid email.').optional().or(z.literal('')),
  presenterPocName: z.string().optional(),
  presenterPocEmail: z.string().email('Please enter a valid email.').optional().or(z.literal('')),
  presenterBio: z.string().optional(),
  presenterHeadshot: z.any().optional(),
});

type WorkshopSubmissionFormData = z.infer<typeof formSchema>;

const TooltipIcon = () => <HelpCircle className="h-4 w-4 text-muted-foreground" />;

type WorkshopSubmissionFormProps = {
  submission?: Submission;
};

export default function WorkshopSubmissionForm({ submission }: WorkshopSubmissionFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();
  const { addSubmission, updateSubmission } = useSubmissions();
  const sessionType = 'workshop';

  const form = useForm<WorkshopSubmissionFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: submission ? {
      ...submission,
      secondaryAudience: Array.isArray(submission.secondaryAudience) ? submission.secondaryAudience : [submission.secondaryAudience].filter(Boolean) as string[],
      preferredDate: submission.preferredDate ? new Date(submission.preferredDate).toISOString() : undefined,
      preferredDate2: submission.preferredDate2 ? new Date(submission.preferredDate2).toISOString() : undefined,
    } : {
      title: '',
      description: '',
      objectives: [],
      cpe: false,
      presenterName: '',
      presenterEmail: '',
      presenterPocName: '',
      presenterPocEmail: '',
      presenterBio: '',
      secondaryAudience: [],
    },
  });

  const showPresenterFields = submission && submission.status !== 'phase_1';

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

  function onSubmit(values: WorkshopSubmissionFormData) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit.' });
      return;
    }
    try {
      const submissionData = {
        ...values,
        preferredDate: values.preferredDate ? new Date(values.preferredDate) : undefined,
        preferredDate2: values.preferredDate2 ? new Date(values.preferredDate2) : undefined,
        sessionType,
      };

      if (submission) {
        updateSubmission({ ...submission, ...submissionData });
        toast({
          title: 'Workshop Updated!',
          description: 'Your workshop submission has been updated.',
        });
      } else {
        addSubmission({ ...submissionData, userId: user.uid });
        void sendSessionSubmittedEmail({
          title: values.title,
          sessionType,
          partnerEmail: user.email || '',
        });
        toast({
          title: 'Workshop Submitted!',
          description: 'Your workshop submission has been received for approval.',
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
              {/* Pillar Section */}
              <FormField
                control={form.control}
                name="pillar"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-xl font-semibold font-headline">ALPFA Pillar</FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                        <TooltipContent><p>Choose the one pillar that best aligns with your content.</p></TooltipContent>
                      </Tooltip>
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      >
                        {submissionFormConfig.pillars.map((pillar) => (
                          <FormItem key={pillar.value} className="flex-1">
                            <Label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm bg-background/50">
                              <FormControl>
                                <RadioGroupItem value={pillar.value} className="sr-only" />
                              </FormControl>
                              <div className="flex-1 space-y-1">
                                <div className="font-semibold flex items-center gap-2">
                                  {pillar.label}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" onClick={(e) => e.preventDefault()}><TooltipIcon /></button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" align="start">
                                      <div className="max-w-xs space-y-1">
                                        <p className="font-bold">{pillar.description}</p>
                                        {pillar.examples && pillar.examples.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-sm font-semibold">Example Themes:</p>
                                            <ul className="list-disc list-inside text-xs">
                                              {pillar.examples.map((ex) => <li key={ex}>{ex}</li>)}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Format Section */}
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-xl font-semibold font-headline">Session Format</FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                        <TooltipContent><p>Select the format that best describes your session's structure and participant experience.</p></TooltipContent>
                      </Tooltip>
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      >
                        {submissionFormConfig.formats.map((format) => (
                          <FormItem key={format.value}>
                            <Label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm bg-background/50">
                              <FormControl>
                                <RadioGroupItem value={format.value} className="sr-only" />
                              </FormControl>
                              <div className="flex-1 space-y-1">
                                <div className="font-semibold flex items-center gap-2">
                                  {format.label}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" onClick={(e) => e.preventDefault()}><TooltipIcon /></button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs" side="top" align="start">
                                      <p className="font-bold">{format.label}</p>
                                      <p className="text-sm">{format.description}</p>
                                      <p className="text-xs mt-2 italic text-muted-foreground">Setup: {format.roomSetup}</p>
                                      <p className="text-sm mt-2"><span className="font-semibold">Key Feature:</span> {format.features}</p>
                                      <p className="text-sm"><span className="font-semibold">Room Setup:</span> {format.roomSetup}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Audience Section */}
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="audience"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-xl font-semibold font-headline">Intended Audience</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                          <TooltipContent><p className="max-w-xs">Indicate who you designed content for. ALPFA will use your intended audience to guide placement and categorization.</p></TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                        >
                          {submissionFormConfig.audiences.map((audience) => (
                            <FormItem key={audience.value}>
                              <Label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm bg-background/50 h-full">
                                <FormControl>
                                  <RadioGroupItem value={audience.value} className="sr-only" />
                                </FormControl>
                                <div className="flex-1 space-y-1">
                                  <div className="font-semibold flex items-center gap-2">
                                    {audience.label}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button type="button" onClick={(e) => e.preventDefault()}><TooltipIcon /></button>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs" side="top" align="start">
                                        <p className="font-bold">{audience.label}</p>
                                        <p className="text-sm">{audience.description}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              </Label>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
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
                          <TooltipContent><p className="max-w-xs">Select an additional audience that would benefit from this session.</p></TooltipContent>
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

              {/* Content Section */}
              <div className="space-y-8">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-lg font-semibold font-headline">Session Title</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{submissionFormConfig.tooltips.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl>
                        <Input placeholder="e.g., Project Management Fundamentals" {...field} className="bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-lg font-semibold font-headline">Session Description</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                          <TooltipContent side="top" align="start">
                            <div className="max-w-sm space-y-2">
                              <p className="font-bold">Your description should clearly explain the content, participant experience, and alignment with the pillar. Must:</p>
                              <ul className="list-disc space-y-1 pl-4 text-xs">
                                <li>Identify exact skills or challenges addressed.</li>
                                <li>Articulate 2-3 concrete takeaways.</li>
                                <li>Use attendee-friendly language (no jargon).</li>
                                <li>Reflect the intended audience skill level.</li>
                              </ul>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="Provide a detailed description of your session..."
                          className="min-h-[150px] bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="objectives"
                render={() => (
                  <FormItem>
                    <div className="flex items-center gap-2 mb-2">
                      <FormLabel className="text-lg font-semibold font-headline">Session Objectives</FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{submissionFormConfig.tooltips.objectives}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FormDescription className="mb-4">
                      Choose up to 3 objectives for your session.
                    </FormDescription>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {submissionFormConfig.objectives.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="objectives"
                          render={({ field }) => {
                            const isChecked = field.value?.includes(item.id) ?? false;
                            const isLimitReached = (field.value?.length ?? 0) >= 3;
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 bg-background/50"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={isChecked}
                                    disabled={!isChecked && isLimitReached}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item.id])
                                        : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.id
                                          )
                                        )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm cursor-pointer">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Schedule Section */}
              <div className="space-y-8 rounded-lg border p-6 bg-muted/30">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold font-headline">Schedule Preference</h3>
                  <p className="text-sm text-muted-foreground">
                    Select your top two preferred date and time slots.
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

              <FormField
                control={form.control}
                name="cpe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/20">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-base font-semibold">Request CPE Credit <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-sm">{submissionFormConfig.tooltips.cpe}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormDescription>
                        Check this box if this session should be considered for CPE credits.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Presenter Fields - Conditional */}
              {showPresenterFields && (
                <div className="space-y-8 pt-8 border-t">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold font-headline">Presenter Information</h3>
                    <p className="text-muted-foreground">This information is required for approved sessions.</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="presenterName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Presenter Full Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Jane Doe" {...field} className="bg-background/50" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="presenterEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Presenter Email</FormLabel>
                        <FormControl><Input placeholder="e.g., jane.doe@example.com" {...field} className="bg-background/50" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="presenterPocName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Point of Contact Name (if different)</FormLabel>
                        <FormControl><Input placeholder="e.g., John Smith" {...field} className="bg-background/50" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="presenterPocEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Point of Contact Email (if different)</FormLabel>
                        <FormControl><Input placeholder="e.g., john.smith@example.com" {...field} className="bg-background/50" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="presenterBio" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presenter Bio</FormLabel>
                      <FormDescription>A brief biography of the presenter (max 500 characters).</FormDescription>
                      <FormControl><Textarea placeholder="Tell us about the presenter..." {...field} maxLength={500} className="bg-background/50" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="presenterHeadshot" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presenter Headshot</FormLabel>
                      <FormControl>
                        <div className="flex items-center justify-center w-full">
                          <Label htmlFor="headshot-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                              <p className="text-xs text-muted-foreground">PNG, JPG, or GIF (MAX. 800x800px)</p>
                            </div>
                            <Input id="headshot-upload" type="file" className="hidden" onChange={(e) => field.onChange(e.target.files?.[0])} />
                          </Label>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                </div>
              )}

              <div className="flex flex-col items-end gap-3 pt-4">
                <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px]">
                  {submission ? 'Update Workshop' : 'Submit for Approval'}
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
