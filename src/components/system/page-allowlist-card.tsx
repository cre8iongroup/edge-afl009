'use client';

import { useState } from 'react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { usePageAllowlist } from '@/hooks/use-page-allowlist';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

type PageAllowlistCardProps = {
  docId: string;
  title: string;
  description: string;
};

export default function PageAllowlistCard({ docId, title, description }: PageAllowlistCardProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { emails, exists, isLoading } = usePageAllowlist(docId);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const persist = async (nextEmails: string[]) => {
    if (!firestore) return;
    setSaving(true);
    try {
      const ref = doc(firestore, 'page_allowlists', docId);
      if (exists) {
        await updateDoc(ref, { emails: nextEmails });
      } else {
        await setDoc(ref, { emails: nextEmails });
      }
    } catch (err) {
      console.error('Failed to update allowlist:', err);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: `Could not update page_allowlists/${docId}.`,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const email = normalizeEmail(newEmail);
    if (!email || !email.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Invalid email',
        description: 'Enter a valid email address.',
      });
      return;
    }
    if (emails.some(e => normalizeEmail(e) === email)) {
      toast({ title: 'Already on the list', description: email });
      return;
    }
    await persist([...emails.map(normalizeEmail), email]);
    setNewEmail('');
  };

  const handleRemove = async (email: string) => {
    const target = normalizeEmail(email);
    await persist(emails.map(normalizeEmail).filter(e => e !== target));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading allowlist…</span>
          </div>
        ) : (
          <>
            {emails.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emails on the allowlist yet.</p>
            ) : (
              <ul className="space-y-2">
                {emails.map(email => (
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
                      disabled={saving}
                      onClick={() => void handleRemove(email)}
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
                disabled={saving}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAdd();
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => void handleAdd()}
                disabled={saving || !newEmail.trim()}
              >
                {saving ? (
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
  );
}
