'use client';

import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, CollectionReference } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

type FeatureFlag = {
  id: string;
  enabled: boolean;
};

export default function SystemPage() {
  const { user, isUserLoading } = useUser();
  const { profile, isLoading: isProfileLoading } = useUserProfile(user?.uid);
  const router = useRouter();
  const firestore = useFirestore();

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);

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
        )}
      </div>
    </AppLayout>
  );
}
