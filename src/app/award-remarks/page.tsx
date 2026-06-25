'use client';

import { useState } from 'react';
import AlpfaLogo from '@/components/alpfa-logo';
import Cre8ionLogo from '@/components/cre8ion-logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';

const SESSION_OPTIONS = [
  'Award Ceremony',
  'Scholarship Luncheon',
  'Gala',
  'Women of ALPFA',
  'Other / Not Sure',
] as const;

const MAX_WORDS = 280;
const WARN_THRESHOLD = 250;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function truncateToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= limit) return text;
  // Rebuild from truncated words, preserve trailing space for natural typing
  return words.slice(0, limit).join(' ');
}

export default function AwardRemarksPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [session, setSession] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const wordCount = countWords(remarks);
  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    phone.trim() &&
    company.trim() &&
    session &&
    remarks.trim() &&
    wordCount <= MAX_WORDS;

  function handleRemarksChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const wc = countWords(value);
    if (wc > MAX_WORDS) {
      setRemarks(truncateToWordLimit(value, MAX_WORDS));
    } else {
      setRemarks(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/award-remarks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim(),
          session,
          remarks: remarks.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Word counter color ──────────────────────────────────────────────────────
  let counterClass = 'text-muted-foreground';
  if (wordCount >= MAX_WORDS) counterClass = 'text-red-500 font-semibold';
  else if (wordCount >= WARN_THRESHOLD) counterClass = 'text-amber-500';

  return (
    <div className="flex min-h-screen flex-col items-center justify-start p-4 pt-8">
      {/* ── Logo bar ───────────────────────────────────────────────────── */}
      <div className="mb-10 flex items-center gap-4">
        <AlpfaLogo className="h-12 w-auto" />
        <span className="text-2xl font-thin text-muted-foreground">x</span>
        <Cre8ionLogo className="h-8 w-auto" />
      </div>

      {/* ── Card with ambient glow ─────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '36rem' }}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-64px',
            zIndex: 0,
            pointerEvents: 'none',
            borderRadius: '2rem',
            opacity: 0.9,
            filter: 'blur(48px)',
            background:
              'radial-gradient(ellipse at 15% 15%, #009FE3 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, #EC008C 0%, transparent 55%)',
          }}
        />
        <div
          style={{
            padding: '1px',
            borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #009FE3, #EC008C)',
            boxShadow:
              '0 0 20px rgba(0, 159, 227, 0.3), 0 0 40px rgba(236, 0, 140, 0.2)',
          }}
        >
          <Card
            className="relative z-10 w-full bg-card/80 backdrop-blur-sm shadow-2xl"
            style={{ borderRadius: '0.7rem', border: 'none' }}
          >
            {/* ── Success state ──────────────────────────────────────── */}
            {submitted ? (
              <CardContent className="flex flex-col items-center gap-5 py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div className="space-y-2">
                  <p className="text-xl font-semibold">Thank you!</p>
                  <p className="text-muted-foreground">
                    Your remarks have been submitted. You&apos;ll receive a
                    confirmation email shortly.
                  </p>
                </div>
              </CardContent>
            ) : (
              <>
                <CardHeader className="text-center pb-2">
                  <CardTitle className="font-headline text-2xl sm:text-3xl">
                    Award Remarks Submission
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Submit your remarks for the ALPFA 2026 Convention award
                    ceremonies.
                  </p>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* ── Name row ──────────────────────────────────── */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="ar-first-name">
                          First Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="ar-first-name"
                          placeholder="First name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ar-last-name">
                          Last Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="ar-last-name"
                          placeholder="Last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* ── Email ─────────────────────────────────────── */}
                    <div className="space-y-2">
                      <Label htmlFor="ar-email">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="ar-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* ── Phone ─────────────────────────────────────── */}
                    <div className="space-y-2">
                      <Label htmlFor="ar-phone">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="ar-phone"
                        placeholder="(555) 555-5555"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* ── Company / Chapter ─────────────────────────── */}
                    <div className="space-y-2">
                      <Label htmlFor="ar-company">
                        Company / ALPFA Chapter{' '}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="ar-company"
                        placeholder="Your company or ALPFA chapter"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* ── Session dropdown ──────────────────────────── */}
                    <div className="space-y-2">
                      <Label htmlFor="ar-session">
                        Session <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="ar-session"
                        value={session}
                        onChange={(e) => setSession(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="" disabled>
                          Select a session…
                        </option>
                        {SESSION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ── Remarks textarea ──────────────────────────── */}
                    <div className="space-y-2">
                      <Label htmlFor="ar-remarks">
                        Remarks <span className="text-red-500">*</span>
                      </Label>
                      <textarea
                        id="ar-remarks"
                        value={remarks}
                        onChange={handleRemarksChange}
                        placeholder="Enter your remarks here (280 words max)…"
                        rows={6}
                        required
                        disabled={isSubmitting}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      />
                      <p className={`text-xs text-right ${counterClass}`}>
                        {wordCount} / {MAX_WORDS} words
                      </p>
                    </div>

                    {/* ── Error banner ──────────────────────────────── */}
                    {error && (
                      <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        {error}
                      </div>
                    )}

                    {/* ── Submit ────────────────────────────────────── */}
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={isSubmitting || !isFormValid}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        'Submit Remarks'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="mt-10 pb-6 text-center text-sm text-muted-foreground">
        ALPFA 2026 Convention, powered by{' '}
        <strong className="font-semibold text-foreground">cre8ion Edge</strong>.
      </footer>
    </div>
  );
}
