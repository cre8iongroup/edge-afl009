'use client';

import { submissionFormConfig, templateSubmission } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const Section = ({ children }: { children: React.ReactNode }) => (
    <div className="space-y-4 rounded-lg border bg-background/50 p-6">{children}</div>
);

const SectionHeader = ({ title, description }: { title: string; description: string }) => (
    <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
    </div>
);

const ReadOnlyField = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
    <div>
        <Label className="text-base font-medium">{label}</Label>
        <div className="mt-2 text-sm text-foreground/80">{value}</div>
    </div>
);

export default function TemplateForm() {
    return (
        <Card>
            <CardContent className="space-y-8 p-6">
                <Section>
                    <SectionHeader
                        title="ALPFA Pillar"
                        description="Choose the one pillar that best aligns with your content."
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {submissionFormConfig.pillars.map((pillar) => (
                            <div key={pillar.value} className={`rounded-md border p-4 ${templateSubmission.pillar === pillar.value ? 'border-primary bg-primary/5' : 'bg-muted/50'}`}>
                                <h4 className="font-semibold">{pillar.label}</h4>
                                <p className="mt-1 text-xs text-muted-foreground">{pillar.description}</p>
                                {pillar.examples && (
                                     <div className="mt-2">
                                        <p className="text-xs font-semibold">Example Themes:</p>
                                        <ul className="list-disc list-inside text-xs text-muted-foreground">
                                            {pillar.examples.map((ex) => <li key={ex}>{ex}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Section>

                <Section>
                    <SectionHeader
                        title="Session Format"
                        description="Select the format that best describes your session's structure and participant experience."
                    />
                     <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {submissionFormConfig.formats.map((format) => (
                             <div key={format.value} className={`rounded-md border p-4 ${templateSubmission.format === format.value ? 'border-primary bg-primary/5' : 'bg-muted/50'}`}>
                                <h4 className="font-semibold">{format.label}</h4>
                                <p className="mt-1 text-xs text-muted-foreground">{format.description}</p>
                                <p className="mt-2 text-xs"><span className="font-semibold">Key Feature:</span> {format.features}</p>
                            </div>
                        ))}
                    </div>
                </Section>
                
                <Section>
                    <SectionHeader
                        title="Intended Audience"
                        description="Indicate who you designed content for. ALPFA will use your intended audience to guide placement and categorization."
                    />
                     <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {submissionFormConfig.audiences.map((audience) => (
                             <div key={audience.value} className={`rounded-md border p-4 ${templateSubmission.audience === audience.value ? 'border-primary bg-primary/5' : 'bg-muted/50'}`}>
                                <h4 className="font-semibold">{audience.label}</h4>
                                <p className="mt-1 text-xs text-muted-foreground">{audience.description}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                <Section>
                    <SectionHeader
                        title="Session Title & Description"
                        description={submissionFormConfig.tooltips.title}
                    />
                    <div className="space-y-4">
                        <ReadOnlyField label="Session Title" value={templateSubmission.title} />
                        <ReadOnlyField label="Session Description" value={
                            <div className="space-y-2 text-foreground/80">
                                <p>Your description should clearly explain what the session covers, what participants will experience, and how the content aligns with your selected pillar. Session descriptions must:</p>
                                <ul className="list-disc space-y-1 pl-5">
                                    <li>State a clear, specific purpose by identifying the exact skills, challenge, or lenses your session addresses.</li>
                                    <li>Articulate 2-3 concrete takeaways, tools, actions, or frameworks attendees can apply.</li>
                                    <li>Use attendee friendly language by removing internal jargon, company acronyms or proprietary terms without explanation.</li>
                                    <li>Reflect the intended audience by aligning the content to the skill level of the group you want to reach.</li>
                                    <li>Stay value focused by highlighting learning experiences for attendees.</li>
                                </ul>
                                <p className="pt-2 font-medium text-foreground">Example:</p>
                                <p>{templateSubmission.description}</p>
                            </div>
                        } />
                    </div>
                </Section>

                <Section>
                    <SectionHeader
                        title="Session Objectives"
                        description="Choose up to 3 objectives for your session."
                    />
                    <div className="space-y-2">
                        {submissionFormConfig.objectives.map((item) => (
                            <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox id={`template-${item.id}`} checked={templateSubmission.objectives.includes(item.id)} disabled />
                                <Label htmlFor={`template-${item.id}`} className="font-normal">{item.label}</Label>
                            </div>
                        ))}
                    </div>
                </Section>

                <Section>
                    <SectionHeader
                        title="Request CPE Credit (Optional)"
                        description={submissionFormConfig.tooltips.cpe}
                    />
                    <div className="flex items-center space-x-2">
                        <Checkbox id="template-cpe" checked={templateSubmission.cpe} disabled />
                        <Label htmlFor="template-cpe" className="font-normal">This session should be considered for CPE credits.</Label>
                    </div>
                </Section>
            </CardContent>
        </Card>
    );
}
