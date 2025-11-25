'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import { submitWorkshop } from '@/lib/actions';
import { useAuth } from '../auth-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { submissionFormConfig } from '@/lib/data';

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
});

const TooltipIcon = () => <HelpCircle className="h-4 w-4 text-muted-foreground" />;

export default function SubmissionForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      objectives: [],
      cpe: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit.' });
      return;
    }
    try {
      await submitWorkshop({ ...values, userId: user.id });
      toast({
        title: 'Submission Successful!',
        description: 'Your workshop proposal has been received.',
      });
      form.reset();
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
              <FormField
                control={form.control}
                name="pillar"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base">ALPFA Pillar</FormLabel>
                    <FormDescription>Choose the one pillar that best aligns with your content.</FormDescription>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        {submissionFormConfig.pillars.map((pillar) => (
                          <FormItem key={pillar.value} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={pillar.value} />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center gap-2">
                              {pillar.label}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button"><TooltipIcon /></button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-bold">{pillar.description}</p>
                                  {pillar.examples && pillar.examples.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-sm font-semibold">Example Themes:</p>
                                      <ul className="list-disc list-inside text-xs">
                                        {pillar.examples.map((ex) => <li key={ex}>{ex}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
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
                    <FormLabel className="text-base">Session Format</FormLabel>
                     <FormDescription>Select the format that best describes your session's structure and participant experience.</FormDescription>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        {submissionFormConfig.formats.map((format) => (
                          <FormItem key={format.value} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={format.value} />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center gap-2">
                              {format.label}
                               <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button"><TooltipIcon /></button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-bold">{format.label}</p>
                                  <p className="text-sm">{format.description}</p>
                                  <p className="text-sm mt-2"><span className="font-semibold">Key Feature:</span> {format.features}</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
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
                    <FormLabel className="text-base">Intended Audience</FormLabel>
                     <FormDescription>Indicate who you designed content for. ALPFA will use your intended audience to guide placement and categorization.</FormDescription>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        {submissionFormConfig.audiences.map((audience) => (
                          <FormItem key={audience.value} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={audience.value} />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center gap-2">
                              {audience.label}
                               <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button"><TooltipIcon /></button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                     <p className="font-bold">{audience.label}</p>
                                     <p className="text-sm">{audience.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
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
                                <p className="max-w-xs">{submissionFormConfig.tooltips.title_description}</p>
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
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-center space-x-3 space-y-0 mb-2"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value || [];
                                    if (checked) {
                                      if (currentValues.length < 3) {
                                        field.onChange([...currentValues, item.id]);
                                      } else {
                                        // This part prevents checking, but we should also inform the user.
                                        // The schema validation will catch this on submit.
                                      }
                                    } else {
                                      field.onChange(
                                        currentValues.filter(
                                          (value) => value !== item.id
                                        )
                                      );
                                    }
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
              <div className="flex justify-end">
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Submit Session for Approval</Button>
              </div>
            </form>
          </Form>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
