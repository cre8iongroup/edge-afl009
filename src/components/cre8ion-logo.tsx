import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";

export default function Cre8ionLogo({ className }: { className?: string }) {
    const logo = PlaceHolderImages.find(p => p.id === 'cre8ion-logo');

    if (!logo) {
        return (
            <div className={cn("bg-muted rounded-md", className)} />
        );
    }

    return (
        <Image
            src={logo.imageUrl}
            alt={logo.description}
            width={200}
            height={48}
            className={cn("text-white", className)}
            data-ai-hint={logo.imageHint}
        />
    );
}
