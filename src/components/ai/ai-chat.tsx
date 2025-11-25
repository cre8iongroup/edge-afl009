'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Bot, User, Loader2 } from 'lucide-react';
import { answerUserQuestion } from '@/ai/flows/answer-user-questions';
import { useAuth } from '../auth-provider';
import { submissions } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

type Message = {
  role: 'user' | 'bot';
  content: string;
};

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const userSubmissions = submissions.filter(sub => sub.userId === user?.id);

  const handleSend = async () => {
    if (input.trim() === '') return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let submissionData;
      if (selectedSubmissionId) {
        const selected = userSubmissions.find(s => s.id === selectedSubmissionId);
        if (selected) {
            submissionData = JSON.stringify({
                title: selected.title,
                description: selected.description,
                status: selected.status,
            });
        }
      }

      const response = await answerUserQuestion({ question: input, submissionData });
      const botMessage: Message = { role: 'bot', content: response.answer };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = { role: 'bot', content: 'Sorry, I encountered an error. Please try again.' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-accent shadow-lg hover:bg-accent/90"
          size="icon"
        >
          <MessageSquare className="h-8 w-8 text-accent-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-headline text-2xl">AI Assistant</SheetTitle>
          <SheetDescription>
            Ask questions about your submissions or the convention.
          </SheetDescription>
        </SheetHeader>
        <div className="py-2">
            {userSubmissions.length > 0 && (
                <Select onValueChange={setSelectedSubmissionId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Add submission context (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                        {userSubmissions.map(sub => (
                            <SelectItem key={sub.id} value={sub.id}>{sub.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
        <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
            {messages.map((message, index) => (
                <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'bot' && (
                    <Avatar className="h-8 w-8">
                        <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                )}
                 <div className={`max-w-xs rounded-lg p-3 text-sm ${message.role === 'user' ? 'rounded-br-none bg-primary text-primary-foreground' : 'rounded-bl-none bg-muted'}`}>
                    {message.content}
                </div>
                 {message.role === 'user' && user && (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                 )}
                </div>
            ))}
            {isLoading && (
                <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                    <div className="max-w-xs rounded-lg bg-muted p-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                </div>
            )}
          </div>
        </ScrollArea>
        <SheetFooter className="mt-4">
          <div className="flex w-full items-center space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your question..."
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={isLoading} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
