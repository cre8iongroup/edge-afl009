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

const formSchema = z.object({
  pillar: z.string().min(1, 'Please select a pillar.'),
  format: z.string().min(1, 'Please select a session format.'),
  audience: z.string().min(1, 'Please select an intended audience.'),
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(20, 'Description must be at least 20 characters.'),
  objectives: z.string().min(20, 'Objectives must be at least 20 characters.'),
  cpe: z.boolean().default(false),
});

export default function SubmissionForm() {
    const { toast } = useToast();
    const { user } = useAuth();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            objectives: '',
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
            description: 'Something went wrong. Please try again.',
        });
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <FormField
                control={form.control}
                name="pillar"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>ALPFA Pillar</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a pillar" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="Professional Development">Professional Development</SelectItem>
                        <SelectItem value="Leadership Development">Leadership Development</SelectItem>
                        <SelectItem value="Community Engagement">Community Engagement</SelectItem>
                        <SelectItem value="Networking">Networking</SelectItem>
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
                    <FormLabel>Session Format</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a format" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="Workshop">Workshop</SelectItem>
                        <SelectItem value="Panel">Panel</SelectItem>
                        <SelectItem value="Keynote">Keynote</SelectItem>
                        <SelectItem value="Roundtable">Roundtable</SelectItem>
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
                    <FormLabel>Intended Audience</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an audience" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="Students">Students</SelectItem>
                        <SelectItem value="Professionals">Professionals</SelectItem>
                        <SelectItem value="Executives">Executives</SelectItem>
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
                  <FormLabel>Session Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., The Future of Artificial Intelligence" {...field} />
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
                  <FormLabel>Session Description</FormLabel>
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Objectives</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="List the key learning objectives for attendees..."
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
                    <FormLabel>
                      CPE Credit Option
                    </FormLabel>
                    <FormDescription>
                      Check this box if this session should be considered for CPE credits.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <div className="flex justify-end">
                <Button type="submit">Submit Proposal</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
