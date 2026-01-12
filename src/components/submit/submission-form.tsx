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
import { useEffect, useState } from 'react';
import { Label } from '../ui/label';
import { useSubmissions } from '../submissions-provider';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '../ui/calendar';

const formSchema = z.object({
  pillar: z.string().min(1, 'Please select a pillar.'),
  format: z.string().min(1, 'Please select a session format.'),
  audience: z.string().min(1, 'Please select an intended audience.'),
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(20, 'Description must be at least 20 characters.'),
  objectives: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You must select at least one objective.',
  }).refine(value => value.length <= 3, {
    message: 'You can select up to 3 objectives.',
  }),
  cpe: z.boolean().default(false),
  // New time slot fields
  preferredDate: z.date().optional(),
  preferredTime: z.string().optional(),
  // Presenter fields
  presenterName: z.string().optional(),
  presenterEmail: z.string().email('Please enter a valid email.').optional().or(z.literal('')),
  presenterPocName: z.string().optional(),
  presenterPocEmail: z.string().email('Please enter a valid email.').optional().or(z.literal('')),
  presenterBio: z.string().optional(),
  presenterHeadshot: z.any().optional(),
});

type SubmissionFormData = z.infer<typeof formSchema>;

const TooltipIcon = () => <HelpCircle className="h-4 w-4 text-muted-foreground" />;

type SubmissionFormProps = {
  sessionType: Submission['sessionType'];
  submission?: Submission;
};

// Mock data for available slots - replace with real data later
const availableTimeSlots = {
    "2026-08-03": ["09:00 AM", "11:00 AM", "02:00 PM"],
    "2026-08-04": ["10:00 AM", "01:00 PM", "03:00 PM"],
    "2026-08-05": ["09:00 AM", "11:00 AM"],
};
type AvailableDates = keyof typeof availableTimeSlots;

export default function SubmissionForm({ sessionType, submission }: SubmissionFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();
  const { addSubmission, updateSubmission } = useSubmissions();
  
  const form = useForm<SubmissionFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: submission ? {
      ...submission,
      preferredDate: submission.preferredDate ? new Date(submission.preferredDate) : undefined
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
    },
  });

  useEffect(() => {
    if (submission) {
      form.reset({
        ...submission,
        preferredDate: submission.preferredDate ? new Date(submission.preferredDate) : undefined
      });
    }
  }, [submission, form]);

  const showPresenterFields = submission && submission.status !== 'Awaiting Approval';

  const selectedDate = form.watch('preferredDate');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  useEffect(() => {
    if (selectedDate) {
        const dateString = format(selectedDate, 'yyyy-MM-dd') as AvailableDates;
        setAvailableTimes(availableTimeSlots[dateString] || []);
        form.setValue('preferredTime', ''); // Reset time when date changes
    } else {
        setAvailableTimes([]);
    }
  }, [selectedDate, form]);

  function onSubmit(values: SubmissionFormData) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit.' });
      return;
    }
    try {
      const submissionData = {
          ...values,
          sessionType,
          preferredDate: values.preferredDate ? values.preferredDate.toISOString() : undefined,
      };

      if (submission) {
        updateSubmission({ ...submission, ...submissionData });
        toast({
          title: 'Submission Updated!',
          description: 'Your submission has been updated.',
        });
      } else {
        addSubmission({ ...submissionData, userId: user.uid });
        toast({
          title: 'Submission Successful!',
          description: 'Your submission has been received.',
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Core Fields */}
              <FormField
                control={form.control}
                name="pillar"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <div className="flex items-center gap-2">
                        <FormLabel className="text-base">ALPFA Pillar</FormLabel>
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
                             <Label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm">
                                <FormControl>
                                  <RadioGroupItem value={pillar.value} className="sr-only"/>
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
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <div className="flex items-center gap-2">
                        <FormLabel className="text-base">Session Format</FormLabel>
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
                             <Label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm">
                                <FormControl>
                                  <RadioGroupItem value={format.value} className="sr-only"/>
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
                                            <p className="text-sm mt-2"><span className="font-semibold">Key Feature:</span> {format.features}</p>
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
                name="audience"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <div className="flex items-center gap-2">
                        <FormLabel className="text-base">Intended Audience</FormLabel>
                        <Tooltip>
                            <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                            <TooltipContent><p className="max-w-xs">Indicate who you designed content for. ALPFA will use your intended audience to guide placement and categorization.</p></TooltipContent>
                        </Tooltip>
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      >
                        {submissionFormConfig.audiences.map((audience) => (
                          <FormItem key={audience.value}>
                            <Label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm">
                                <FormControl>
                                  <RadioGroupItem value={audience.value} className="sr-only"/>
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                        <FormLabel className="text-base">Session Title</FormLabel>
                        <Tooltip>
                            <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">{submissionFormConfig.tooltips.title}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <FormControl>
                      <Input placeholder="e.g., Project Management Fundamentals" {...field} />
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
                        <FormLabel className="text-base">Session Description</FormLabel>
                        <Tooltip>
                            <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                            <TooltipContent side="top" align="start">
                                <div className="max-w-sm space-y-2">
                                    <p className="font-bold">Your description should clearly explain what the session covers, what participants will experience, and how the content aligns with your selected pillar. Session descriptions must:</p>
                                    <ul className="list-disc space-y-1 pl-4">
                                        <li>State a clear, specific purpose by identifying the exact skills, challenge, or lenses your session addresses.</li>
                                        <li>Articulate 2-3 concrete takeaways, tools, actions, or frameworks attendees can apply.</li>
                                        <li>Use attendee friendly language by removing internal jargon, company acronyms or proprietary terms without explanation.</li>
                                        <li>Reflect the intended audience by aligning the content to the skill level of the group you want to reach.</li>
                                        <li>Stay value focused by highlighting learning experiences for attendees.</li>
                                    </ul>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed description of your session..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="objectives"
                render={() => (
                    <FormItem>
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-base">Session Objectives</FormLabel>
                        <Tooltip>
                            <TooltipTrigger asChild><button type="button"><TooltipIcon /></button></TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">{submissionFormConfig.tooltips.objectives}</p>
                            </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormDescription>
                        Choose up to 3 objectives for your session.
                      </FormDescription>
                    </div>
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
                              className="flex flex-row items-center space-x-3 space-y-0 mb-2"
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
                              <FormLabel className="font-normal">
                                {item.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                    <FormMessage />
                  </FormItem>
                )}
                />
                
              {/* Date and Time Picker */}
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
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => {
                                    const dateString = format(date, 'yyyy-MM-dd');
                                    return !availableTimeSlots.hasOwnProperty(dateString);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
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

              <FormField
                control={form.control}
                name="cpe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                       <div className="flex items-center gap-2">
                        <FormLabel>Request CPE Credit (Optional)</FormLabel>
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
                                <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="presenterEmail" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Presenter Email</FormLabel>
                                <FormControl><Input placeholder="e.g., jane.doe@example.com" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="presenterPocName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Point of Contact Name (if different)</FormLabel>
                                <FormControl><Input placeholder="e.g., John Smith" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="presenterPocEmail" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Point of Contact Email (if different)</FormLabel>
                                <FormControl><Input placeholder="e.g., john.smith@example.com" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="presenterBio" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Presenter Bio</FormLabel>
                            <FormDescription>A brief biography of the presenter (max 500 characters).</FormDescription>
                            <FormControl><Textarea placeholder="Tell us about the presenter..." {...field} maxLength={500} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="presenterHeadshot" render={({ field }) => (
                        <FormItem>
                             <FormLabel>Presenter Headshot</FormLabel>
                            <FormControl>
                                <div className="flex items-center justify-center w-full">
                                    <Label htmlFor="headshot-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
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

              <div className="flex justify-end">
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {submission ? 'Update Submission' : 'Submit for Approval'}
                </Button>
              </div>
            </form>
          </Form>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
