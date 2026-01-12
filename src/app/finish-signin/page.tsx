'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export default function FinishSignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    const completeSignIn = async () => {
      const auth = getAuth();
      const email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        setError('Sign-in email not found. Please try again from the login page.');
        return;
      }

      if (isSignInWithEmailLink(auth, window.location.href)) {
        try {
          const result = await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem('emailForSignIn');
          
          const user = result.user;
          const userRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            await setDoc(userRef, {
              name: user.email?.split('@')[0] || 'New User',
              email: user.email,
              avatar: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
              role: 'regular',
              createdAt: serverTimestamp(),
            });
          }

          router.push('/dashboard');
        } catch (err) {
          console.error(err);
          setError((err as Error).message || 'Failed to sign in. Please try the link again or request a new one.');
          toast({
            variant: 'destructive',
            title: 'Sign In Failed',
            description: (err as Error).message,
          });
        }
      } else {
         setError('Invalid sign-in link. Please request a new one.');
      }
    };

    completeSignIn();
  }, [router, toast, firestore]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      {error ? (
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-destructive">Sign-In Error</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Back to Login
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-2xl font-semibold">Signing you in...</h2>
          <p className="text-muted-foreground">Please wait while we securely verify your sign-in link.</p>
        </div>
      )}
    </div>
  );
}

// Minimal button component for the error state
function Button({ children, ...props }: React.ComponentProps<'button'>) {
    return (
        <button
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            {...props}
        >
            {children}
        </button>
    );
}
