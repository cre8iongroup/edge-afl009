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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="pillar"
                  render={({ field }) => (
                    <FormItem>
                       <div className="flex items-center gap-2">
                        <FormLabel>ALPFA Pillar</FormLabel>
                        <Tooltip>
                            <TooltipTrigger type="button"><TooltipIcon /></TooltipTrigger>
                            <TooltipContent side="top" align="start">
                                <p className="max-w-xs">{submissionFormConfig.tooltips.pillar}</p>
                            </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a pillar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {submissionFormConfig.pillars.map(pillar => (
                            <SelectItem key={pillar.value} value={pillar.value}>
                                {pillar.label}
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
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center gap-2">
                            <FormLabel>Session Format</FormLabel>
                             <Tooltip>
                                <TooltipTrigger type="button"><TooltipIcon /></TooltipTrigger>
                                <TooltipContent side="top" align="start">
                                    <p className="max-w-xs">{submissionFormConfig.tooltips.format}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {submissionFormConfig.formats.map(format => (
                             <SelectItem key={format.value} value={format.value}>
                                {format.label}
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
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center gap-2">
                            <FormLabel>Intended Audience</FormLabel>
                            <Tooltip>
                                <TooltipTrigger type="button"><TooltipIcon /></TooltipTrigger>
                                <TooltipContent side="top" align="start">
                                    <p className="max-w-xs">{submissionFormConfig.tooltips.audience}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an audience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {submissionFormConfig.audiences.map(audience => (
                             <SelectItem key={audience.value} value={audience.value}>
                                {audience.label}
                             </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                        <FormLabel>Session Title</FormLabel>
                        <Tooltip>
                            <TooltipTrigger type="button"><TooltipIcon /></TooltipTrigger>
                            <TooltipContent side="top" align="start">
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
                        <FormLabel>Session Description</FormLabel>
                        <Tooltip>
                            <TooltipTrigger type="button"><TooltipIcon /></TooltipTrigger>
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
                            <TooltipTrigger type="button"><TooltipIcon /></TooltipTrigger>
                            <TooltipContent side="top" align="start">
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
                              className="flex flex-row items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.id])
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
                            <TooltipTrigger type="button"><TooltipIcon /></TooltipTrigger>
                            <TooltipContent side="top" align="start">
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
                <Button type="submit" className="bg-accent hover:bg-accent/90">Submit Session for Approval</Button>
              </div>
            </form>
          </Form>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
