'use client';

import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { useUser, useStorage, useFirestore } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useSubmissions } from '@/components/submissions-provider';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { hasScenic, SCENIC_ADDON_LABELS } from '@/lib/scenic';
import { isScenicClosed } from '@/lib/deadlines';
import { getPackagesForSessionType } from '@/lib/av-packages';
import { sendScenicAssetsSubmittedInternal, sendScenicAssetsSubmittedPartner } from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Palette,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

const SESSION_TYPE_LABEL: Record<string, string> = {
  workshop: 'Workshop',
  reception: 'Reception',
  'info-session': 'Info Session',
};

// Keywords that identify scenic elements within package includes[]
const SCENIC_KEYWORDS = ['Cubes', 'Backdrop', 'Totem', 'Cover', 'Uplight', 'Booth'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScenicItemsForSession(session: Parameters<typeof hasScenic>[0][number]): string[] {
  if (!session.avSelection) return [];
  const { packageId, sessionType, addOns = [] } = session.avSelection;

  // Package scenic includes
  const packages = getPackagesForSessionType(
    sessionType as 'workshop' | 'reception' | 'info-session'
  );
  const pkgDef = packages.find((p) => p.id === packageId);
  const pkgScenic = (pkgDef?.includes ?? []).filter((item) =>
    SCENIC_KEYWORDS.some((kw) => item.includes(kw))
  );

  // Add-on scenic items
  const addonScenic = addOns.filter((label) => SCENIC_ADDON_LABELS.has(label));

  return [...pkgScenic, ...addonScenic];
}

function validateFileExtension(file: File, accepted: string[]): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return accepted.includes(ext);
}

const LOGO_ACCEPT = ['.svg', '.eps', '.ai', '.pdf', '.png'];
const LOGO_ACCEPT_ATTR = LOGO_ACCEPT.join(',');
const GUIDELINES_ACCEPT = ['.pdf'];
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScenicPage() {
  const { user } = useUser();
  const { profile, isLoading: profileLoading } = useUserProfile(user?.uid);
  const { submissions, loading: submissionsLoading } = useSubmissions();
  const storage = useStorage();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [guidelinesFile, setGuidelinesFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [logoError, setLogoError] = useState('');
  const [guidelinesError, setGuidelinesError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const guidelinesInputRef = useRef<HTMLInputElement>(null);

  const scenicClosed = isScenicClosed();
  const isLoading = profileLoading || submissionsLoading;

  // ── Role gate ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    if (!['regular', 'admin'].includes(profile.role)) {
      router.replace('/dashboard');
    }
  }, [profile, router]);

  // ── Filter to partner's own submissions ───────────────────────────────────
  const userEmail = user?.email?.toLowerCase();
  const userSubmissions = submissions.filter(
    (s) =>
      s.userId === user?.uid ||
      (userEmail && (s.authorizedEmails ?? []).map((e) => e.toLowerCase()).includes(userEmail))
  );

  // Scenic sessions only
  const scenicSessions = userSubmissions.filter((s) => hasScenic([s]));

  // ── No-scenic auto-redirect ───────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || !profile) return;
    if (!['regular', 'admin'].includes(profile.role)) return; // role redirect handles this
    if (scenicSessions.length === 0 && !submissionsLoading) {
      const timer = setTimeout(() => router.push('/dashboard'), 3000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, profile, scenicSessions.length, submissionsLoading]);

  // ── Derive company name from first scenic session ─────────────────────────
  const firstSession = scenicSessions[0];
  const companyName =
    firstSession?.companyName ||
    firstSession?.presenterPocName ||
    firstSession?.pocName ||
    user?.displayName ||
    '';

  // ── File handlers ─────────────────────────────────────────────────────────

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateFileExtension(file, LOGO_ACCEPT)) {
      setLogoError(`Accepted formats: ${LOGO_ACCEPT.join(', ')}`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setLogoError('File is too large. Maximum size is 50 MB.');
      return;
    }
    setLogoError('');
    setLogoFile(file);
  }

  function handleGuidelinesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateFileExtension(file, GUIDELINES_ACCEPT)) {
      setGuidelinesError('Only PDF files are accepted for brand guidelines.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setGuidelinesError('File is too large. Maximum size is 50 MB.');
      return;
    }
    setGuidelinesError('');
    setGuidelinesFile(file);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!logoFile) {
      setLogoError('A logo file is required.');
      return;
    }
    if (!user || !firestore) return;

    setIsSubmitting(true);

    try {
      // Upload logo
      const logoPath = `scenic/${user.uid}/logo`;
      const logoRef = ref(storage, logoPath);
      await uploadBytes(logoRef, logoFile);
      const logoUrl = await getDownloadURL(logoRef);

      // Upload guidelines (optional)
      let guidelinesUrl: string | undefined;
      if (guidelinesFile) {
        const guidelinesPath = `scenic/${user.uid}/guidelines`;
        const guidelinesRef = ref(storage, guidelinesPath);
        await uploadBytes(guidelinesRef, guidelinesFile);
        guidelinesUrl = await getDownloadURL(guidelinesRef);
      }

      // Build payload
      const sessionIds = scenicSessions.map((s) => s.id);
      const submittedAt = new Date().toISOString();

      const payload: Record<string, unknown> = {
        partnerUid: user.uid,
        partnerEmail: user.email ?? '',
        companyName,
        logoUrl,
        submittedAt,
        sessionIds,
      };
      if (guidelinesUrl) payload.guidelinesUrl = guidelinesUrl;
      if (notes.trim()) payload.notes = notes.trim();

      // Write to Firestore — setDoc overwrites on re-submission
      await setDoc(doc(firestore, 'scenic_assets', user.uid), payload);

      // Send notifications
      const sessionTitles = scenicSessions.map((s) => s.title);
      await Promise.allSettled([
        sendScenicAssetsSubmittedInternal({
          companyName,
          partnerEmail: user.email ?? '',
          sessionTitles,
          submittedAt,
        }),
        sendScenicAssetsSubmittedPartner({
          partnerEmail: user.email ?? '',
        }),
      ]);

      setSubmitted(true);
    } catch (err) {
      console.error('Scenic asset submission error:', err);
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: 'Could not upload your assets. Please try again or contact edge@cre8iongroup.com.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // ── No scenic sessions ────────────────────────────────────────────────────

  if (scenicSessions.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Palette className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold">No scenic elements in your order</p>
                <p className="text-sm text-muted-foreground">
                  Your current AV selections don't include any custom scenic items. If you believe
                  this is incorrect, contact{' '}
                  <a href="mailto:edge@cre8iongroup.com" className="font-medium text-primary hover:underline">
                    edge@cre8iongroup.com
                  </a>
                  .
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Redirecting to your dashboard…</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 max-w-3xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Palette className="h-7 w-7 text-primary" />
            <h1 className="font-headline text-3xl font-semibold">Scenic Assets</h1>
          </div>
          <p className="text-muted-foreground">
            Submit your brand assets below so our design team can prepare your custom scenic
            elements before the convention. Upload your logo and, optionally, brand guidelines.
          </p>
        </div>

        {/* ── Deadline passed banner ───────────────────────────────────── */}
        {scenicClosed && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-800">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">The scenic asset submission window has closed.</span>{' '}
              If you still need to submit assets, please contact us directly at{' '}
              <a href="mailto:edge@cre8iongroup.com" className="font-medium underline hover:no-underline">
                edge@cre8iongroup.com
              </a>
              .
            </p>
          </div>
        )}

        {/* ── Scenic session cards ─────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your Scenic Sessions
          </h2>

          {scenicSessions.map((session) => {
            const scenicItems = getScenicItemsForSession(session);
            return (
              <Card key={session.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold truncate">{session.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {SESSION_TYPE_LABEL[session.sessionType] ?? session.sessionType}
                        </Badge>
                        {session.avSelection?.packageName && (
                          <Badge variant="outline" className="text-xs">
                            {session.avSelection.packageName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {scenicItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Scenic Elements
                      </p>
                      <ul className="space-y-1">
                        {scenicItems.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* ── Confirmation state ───────────────────────────────────────── */}
        {submitted && (
          <Card className="border-green-500/40 bg-green-500/5">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <div className="space-y-1.5">
                <p className="font-semibold text-green-800 text-lg">Assets received!</p>
                <p className="text-sm text-green-700">
                  Your assets have been received. Our team will be in touch shortly to confirm final
                  details.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Upload form — hidden when closed or after submission ─────── */}
        {!scenicClosed && !submitted && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="font-semibold text-lg">Submit Your Brand Assets</h2>
                <p className="text-sm text-muted-foreground">
                  Assets are shared across all of your scenic sessions listed above. You only need
                  to submit one set.
                </p>
              </div>

              {/* Logo upload */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">
                    Logo File <span className="text-red-500">*</span>
                  </label>
                  <span
                    className="cursor-help text-muted-foreground"
                    title="Preferred: vector format (SVG, EPS, AI). High-resolution PNG (300 dpi+) also accepted. PDF with embedded vector acceptable."
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                  </span>
                </div>

                {logoFile ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate flex-1">{logoFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs shrink-0"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoError('');
                        if (logoInputRef.current) logoInputRef.current.value = '';
                      }}
                    >
                      Replace
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/30 p-6 text-center transition-colors cursor-pointer"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Click to upload logo</span>
                    <span className="text-xs text-muted-foreground">
                      SVG, EPS, AI, PDF, or PNG · Max 50 MB
                    </span>
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept={LOGO_ACCEPT_ATTR}
                  className="hidden"
                  onChange={handleLogoChange}
                />
                {logoError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-500">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {logoError}
                  </p>
                )}
              </div>

              {/* Brand guidelines upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Brand Guidelines{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>

                {guidelinesFile ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate flex-1">{guidelinesFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs shrink-0"
                      onClick={() => {
                        setGuidelinesFile(null);
                        setGuidelinesError('');
                        if (guidelinesInputRef.current) guidelinesInputRef.current.value = '';
                      }}
                    >
                      Replace
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => guidelinesInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/30 p-6 text-center transition-colors cursor-pointer"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Click to upload brand guidelines</span>
                    <span className="text-xs text-muted-foreground">PDF only · Max 50 MB</span>
                  </button>
                )}
                <input
                  ref={guidelinesInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleGuidelinesChange}
                />
                {guidelinesError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-500">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {guidelinesError}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Additional notes for our design team{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Color codes, font preferences, usage notes, or anything else our team should know…"
                  rows={4}
                  className={cn(
                    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary resize-none'
                  )}
                />
              </div>

              {/* Submit button */}
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={isSubmitting || !logoFile}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit Assets
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Assets can be resubmitted at any time before July 11. Re-submitting will replace your
                previously uploaded files.
              </p>
            </CardContent>
          </Card>
        )}

      </div>
    </AppLayout>
  );
}
