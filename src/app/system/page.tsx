'use client';

import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePageAllowlist } from '@/hooks/use-page-allowlist';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, CollectionReference } from 'firebase/firestore';
import { Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FeatureFlag = {
  id: string;
  enabled: boolean;
};

const AI_NOTES_ALLOWLIST_DOC = 'ai_notes_status';

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export default function SystemPage() {
  const { user, isUserLoading } = useUser();
  const { profile, isLoading: isProfileLoading } = useUserProfile(user?.uid);
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);

  const {
    emails: allowlistEmails,
    exists: allowlistExists,
    isLoading: allowlistLoading,
  } = usePageAllowlist(AI_NOTES_ALLOWLIST_DOC);

  const [newEmail, setNewEmail] = useState('');
  const [savingAllowlist, setSavingAllowlist] = useState(false);

  const canViewPage = !isUserLoading && !isProfileLoading && user && profile && profile.role === 'superadmin';

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user) {
        router.push('/');
        return;
      }
      if (!profile || profile.role !== 'superadmin') {
        router.push('/dashboard');
      }
    }
  }, [user, profile, isUserLoading, isProfileLoading, router]);

  useEffect(() => {
    if (!firestore || !canViewPage) return;
    const flagsCol = collection(firestore, 'feature_flags') as CollectionReference;
    const unsub = onSnapshot(flagsCol, (snap) => {
      const all = snap.docs.map(d => ({
        id: d.id,
        enabled: d.data().enabled ?? false,
      }));
      setFlags(all);
      setLoadingFlags(false);
    }, () => {
      setLoadingFlags(false);
    });
    return unsub;
  }, [firestore, canViewPage]);

  const handleToggle = async (flagId: string, newValue: boolean) => {
    if (!firestore) return;
    setUpdatingFlag(flagId);
    try {
      const flagRef = doc(firestore, 'feature_flags', flagId);
      await updateDoc(flagRef, { enabled: newValue });
    } catch (err) {
      console.error('Failed to update flag:', err);
    } finally {
      setUpdatingFlag(null);
    }
  };

  const formatFlagName = (id: string) => {
    return id
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const persistAllowlist = async (nextEmails: string[]) => {
    if (!firestore) return;
    setSavingAllowlist(true);
    try {
      const ref = doc(firestore, 'page_allowlists', AI_NOTES_ALLOWLIST_DOC);
      if (allowlistExists) {
        await updateDoc(ref, { emails: nextEmails });
      } else {
        await setDoc(ref, { emails: nextEmails });
      }
    } catch (err) {
      console.error('Failed to update allowlist:', err);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update the AI Notes Status allowlist.',
      });
    } finally {
      setSavingAllowlist(false);
    }
  };

  const handleAddEmail = async () => {
    const email = normalizeEmail(newEmail);
    if (!email || !email.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Invalid email',
        description: 'Enter a valid email address.',
      });
      return;
    }
    const already = allowlistEmails.some(e => normalizeEmail(e) === email);
    if (already) {
      toast({ title: 'Already on the list', description: email });
      return;
    }
    await persistAllowlist([...allowlistEmails.map(normalizeEmail), email]);
    setNewEmail('');
  };

  const handleRemoveEmail = async (email: string) => {
    const target = normalizeEmail(email);
    await persistAllowlist(
      allowlistEmails.map(normalizeEmail).filter(e => e !== target),
    );
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">System</h1>
          <p className="text-muted-foreground">Manage feature flags and system configuration.</p>
        </div>

        {canViewPage && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>
                  Toggle features on or off across the portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFlags ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading flags…</span>
                  </div>
                ) : flags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No feature flags configured.</p>
                ) : (
                  <div className="space-y-4">
                    {flags.map(flag => (
                      <div key={flag.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label htmlFor={flag.id} className="text-base font-medium">
                            {formatFlagName(flag.id)}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {flag.id}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {updatingFlag === flag.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          <Switch
                            id={flag.id}
                            checked={flag.enabled}
                            onCheckedChange={(checked) => handleToggle(flag.id, checked)}
                            disabled={updatingFlag === flag.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Notes Status — Page Access</CardTitle>
                <CardDescription>
                  Emails allowed to view /ai-notes-status. Access is allowlist-only (not role-based).
                  Stored at page_allowlists/ai_notes_status.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allowlistLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading allowlist…</span>
                  </div>
                ) : (
                  <>
                    {allowlistEmails.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No emails on the allowlist yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {allowlistEmails.map(email => (
                          <li
                            key={email}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                          >
                            <span>{email}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              disabled={savingAllowlist}
                              onClick={() => void handleRemoveEmail(email)}
                              aria-label={`Remove ${email}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="sm:max-w-xs"
                        disabled={savingAllowlist}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleAddEmail();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => void handleAddEmail()}
                        disabled={savingAllowlist || !newEmail.trim()}
                      >
                        {savingAllowlist ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Add email
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
