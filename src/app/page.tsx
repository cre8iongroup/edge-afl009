'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import AlpfaLogo from '@/components/alpfa-logo';
import Cre8ionLogo from '@/components/cre8ion-logo';
import { sendCustomSignInLink } from '@/lib/actions';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await sendCustomSignInLink(email);
      if (result.success) {
        window.localStorage.setItem('emailForSignIn', email);
        setEmailSent(true);
        toast({
          title: 'Check your email',
          description: `A sign-in link has been sent to ${email}.`,
        });
      } else {
        throw new Error(result.error || 'Could not send sign-in link.');
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-8 flex items-center gap-4">
        <AlpfaLogo className="h-12 w-auto" />
        <span className="text-2xl font-thin text-muted-foreground">x</span>
        <Cre8ionLogo className="h-8 w-auto" />
      </div>
      {/* Ambient glow behind the card — brand blue → pink */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '28rem' }}>
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
        <div style={{
          padding: '1px',
          borderRadius: '0.75rem',
          background: 'linear-gradient(135deg, #009FE3, #EC008C)',
          boxShadow: '0 0 20px rgba(0, 159, 227, 0.3), 0 0 40px rgba(236, 0, 140, 0.2)'
        }}>
          <Card className="relative z-10 w-full max-w-md bg-card/80 backdrop-blur-sm shadow-2xl" style={{ borderRadius: '0.7rem', border: 'none' }}>
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">ALPFA 2026 Convention Portal</CardTitle>
          <CardDescription>Sign in to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="text-center">
              <h3 className="text-lg font-semibold">Email Sent!</h3>
              <p className="text-muted-foreground">
                Please check your inbox for a magic link to sign in. You can close this tab.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Sign-In Link
              </Button>
            </form>
          )}
        </CardContent>
          </Card>
        </div>
      </div>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        ALPFA 2026 Convention, powered by <strong className="font-semibold text-foreground">cre8ion Edge</strong>.
      </footer>
    </div>
  );
}
