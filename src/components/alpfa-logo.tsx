import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";

export default function AlpfaLogo({ className }: { className?: string }) {
    const logo = PlaceHolderImages.find(p => p.id === 'alpfa-logo');

    if (!logo) {
        return (
            <div className={cn("bg-muted rounded-md", className)} />
        );
    }

    return (
        <Image
            src={logo.imageUrl}
            alt={logo.description}
            width={168}
            height={64}
            className={cn("text-white", className)}
            data-ai-hint={logo.imageHint}
        />
    );
}
