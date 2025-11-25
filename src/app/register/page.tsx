'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { useState } from 'react';

export default function RegisterPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');


    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            register({
                id: Date.now().toString(),
                name,
                email,
                avatar: `https://i.pravatar.cc/150?u=${email}`,
                role: 'regular',
            });
            toast({
                title: 'Registration Successful',
                description: 'Please log in with your new account.',
            });
            router.push('/');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Registration Failed',
                description: (error as Error).message,
            });
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-3xl">Create an Account</CardTitle>
                    <CardDescription>Enter your details to get started</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input 
                                id="name" 
                                type="text" 
                                placeholder="John Doe" 
                                required 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="m@example.com" 
                                required 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                required 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                            Sign Up
                        </Button>
                    </form>
                    <div className="mt-6 text-center text-sm">
                        Already have an account?{' '}
                        <Link href="/" className="font-medium text-primary hover:underline">
                            Sign in
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
