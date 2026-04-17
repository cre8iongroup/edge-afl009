'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSubmissions } from '../submissions-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { availableSlots } from '@/lib/schedule';
import { useEffect, useMemo, useState } from 'react';
import { sendSessionSubmittedEmail } from '@/lib/actions';
import { Submission } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { submissionFormConfig } from '@/lib/data';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const formSchema = z.object({
    companyName: z.string().min(1, 'Company name is required.'),
    sessionTitle: z.string().min(5, 'Session title must be at least 5 characters.'),
    sessionDescription: z.string().min(20, 'Description must be at least 20 characters.'),
    format: z.string().min(1, 'Please select a session format.'),
    pocName: z.string().min(1, 'POC name is required.'),
    pocEmail: z.string().email('Please enter a valid email.'),
    audience: z.array(z.string()).min(1, 'Please select at least one intended audience.'),
    secondaryAudience: z.array(z.string()).optional(),
    preferredDate: z.string().min(1, 'Please select a date.'),
    preferredTimes: z.array(z.string()).min(1, 'Please select at least one time preference.').max(3),
    specialSetup: z.string().optional(),
});

type InfoSessionFormData = z.infer<typeof formSchema>;

const TooltipIcon = () => <HelpCircle className="h-4 w-4 text-muted-foreground" />;

type InfoSessionFormProps = {
    submission?: Submission;
};

export default function InfoSessionForm({ submission }: InfoSessionFormProps) {
    const { toast } = useToast();
    const { user } = useUser();
    const router = useRouter();
    const { addSubmission, updateSubmission } = useSubmissions();
    const sessionType = 'info-session';

    const form = useForm<InfoSessionFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: submission ? {
            companyName: submission.companyName || '',
            sessionTitle: submission.title || '',
            sessionDescription: submission.description || '',
            format: submission.format || '',
            pocName: submission.pocName || '',
            pocEmail: submission.pocEmail || '',
            audience: Array.isArray(submission.audience) ? submission.audience : [submission.audience].filter(Boolean) as string[],
            secondaryAudience: Array.isArray(submission.secondaryAudience) ? submission.secondaryAudience : [submission.secondaryAudience].filter(Boolean) as string[],
            preferredDate: submission.preferredDate ? new Date(submission.preferredDate).toISOString() : undefined,
            preferredTimes: submission.preferredTimes || [],
            specialSetup: submission.specialSetup || '',
        } : {
            companyName: '',
            sessionTitle: '',
            sessionDescription: '',
            format: '',
            pocName: '',
            pocEmail: '',
            audience: [],
            secondaryAudience: [],
            preferredDate: '',
            preferredTimes: [],
            specialSetup: '',
        },
    });

    const selectedDate = form.watch('preferredDate');
    const preferredTimes = form.watch('preferredTimes') || [];

    const filteredSlots = useMemo(() => {
        return availableSlots.filter(slot => slot.sessionTypes.includes(sessionType));
    }, [sessionType]);

    const availableDates = useMemo(() => {
        // Collect unique dates as YYYY-MM-DD strings to avoid timezone shifts
        const uniqueDateStrings = Array.from(new Set(filteredSlots.map(slot => slot.date.split('T')[0])));
        // Create date objects at noon UTC to ensure formatting remains on the correct day across timezones
        return uniqueDateStrings.map(dateStr => new Date(`${dateStr}T12:00:00Z`));
    }, [filteredSlots]);

    // Set default date to Sunday if there's only one date available
    useEffect(() => {
        if (availableDates.length === 1 && !selectedDate) {
            form.setValue('preferredDate', availableDates[0].toISOString());
        }
    }, [availableDates, selectedDate, form]);

    const availableTimeSlots = useMemo(() => {
        if (!selectedDate) return [];
        const dateString = new Date(selectedDate).toISOString().split('T')[0];
        const daySlot = filteredSlots.find(slot => slot.date.startsWith(dateString));
        return daySlot?.times.map(t => t.time) || [];
    }, [selectedDate, filteredSlots]);

    function onSubmit(values: InfoSessionFormData) {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit.' });
            return;
        }
        try {
            const submissionData = {
                ...values,
                title: values.sessionTitle,
                description: values.sessionDescription,
                preferredDate: values.preferredDate ? new Date(values.preferredDate) : undefined,
                preferredTime: values.preferredTimes[0] || '', // Maintain compatibility with existing single field
                sessionType,
            };

            if (submission) {
                updateSubmission({ ...submission, ...submissionData });
                toast({
                    title: 'Info Session Updated!',
                    description: 'Your info session submission has been updated.',
                });
            } else {
                addSubmission({ ...submissionData, userId: user.uid });
                void sendSessionSubmittedEmail({
                    title: values.sessionTitle,
                    sessionType,
                    partnerEmail: user.email || '',
                });
                toast({
                    title: 'Info Session Submitted!',
                    description: 'Your info session submission has been received for approval.',
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

    const handleTimeChange = (index: number, value: string) => {
        const newTimes = [...preferredTimes];
        newTimes[index] = value;
        form.setValue('preferredTimes', newTimes, { shouldValidate: true });
    };

    const getTimeOptions = (currentIndex: number) => {
        return availableTimeSlots.filter(time =>
            !preferredTimes.some((selectedTime, index) => index !== currentIndex && selectedTime === time)
        );
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <TooltipProvider>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    name="sessionTitle"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Session Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Careers in Tech at [Company]" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="sessionDescription"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Session Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Provide a brief description of your info session..."
                                                className="min-h-[120px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                <FormField
                                    control={form.control}
                                    name="pocName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>POC Name</FormLabel>
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
                                            <FormLabel>POC Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., jane.doe@example.com" {...field} />
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
                                                    <TooltipContent><p className="max-w-xs">Select all audiences that this info session is designed for.</p></TooltipContent>
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
                                                    <TooltipContent><p className="max-w-xs">Select an additional audience that would benefit from this info session.</p></TooltipContent>
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

                            <div className="space-y-12 rounded-lg border p-6 bg-muted/30">
                                <FormField
                                    control={form.control}
                                    name="format"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <FormLabel className="text-lg font-semibold font-headline">Session Format</FormLabel>
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
                                                                                <button type="button" onClick={(e) => e.preventDefault()} className="inline-flex items-center">
                                                                                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                                                                </button>
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
                                    name="specialSetup"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <FormLabel className="text-lg font-semibold font-headline">Special Setup Request</FormLabel>
                                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Room setup only - not for AV</Badge>
                                            </div>
                                            <FormDescription className="text-sm text-muted-foreground">
                                                Approval is at ALPFA&apos;s discretion, and special requests may affect preferred scheduling time.
                                            </FormDescription>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe any special room setup needs (if any)..."
                                                    className="min-h-[100px] bg-background/50"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-6 pt-4 border-t">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-semibold font-headline">Schedule Preference</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Select your preferred time slots in order of priority. Note: Info Sessions are held on Sunday only.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="preferredDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col md:col-span-3">
                                                    <FormLabel>Convention Date</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-muted text-foreground opacity-100">
                                                                <SelectValue placeholder="Sunday, August 9, 2026" />
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

                                        {[0, 1, 2].map((i) => (
                                            <FormItem key={i} className="flex flex-col">
                                                <FormLabel>{i === 0 ? '1st Choice' : i === 1 ? '2nd Choice' : '3rd Choice'}</FormLabel>
                                                <Select
                                                    onValueChange={(val) => handleTimeChange(i, val)}
                                                    value={preferredTimes[i] || ""}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="bg-background/50">
                                                            <SelectValue placeholder="Select time slot" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {getTimeOptions(i).map(time => (
                                                            <SelectItem key={time} value={time}>
                                                                {time}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        ))}
                                    </div>
                                </div>
                            </div>


                            <div className="flex flex-col items-end gap-3 pt-4">
                                <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px]">
                                    {submission ? 'Update Info Session' : 'Submit For Approval'}
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
