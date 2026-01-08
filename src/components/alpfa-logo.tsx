import { cn } from "@/lib/utils";

export default function AlpfaLogo({ className }: { className?: string }) {
  return (
    <svg
      className={cn("text-white", className)}
      viewBox="0 0 168 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.12 63.68L0 0H12.4L27.6 47.6L42.56 0H54.44L33.32 63.68H21.12Z"
        fill="currentColor"
      />
      <path d="M71.299 63.68H59.539V0H71.299V63.68Z" fill="currentColor" />
      <path
        d="M93.3824 63.68H81.6224V11.76H93.3824V0H112.582V11.76H124.342V63.68H112.582V23.52H93.3824V63.68Z"
        fill="currentColor"
      />
      <path
        d="M149.27 63.68L128.15 0H140.55L155.75 47.6L170.71 0H182.59L161.47 63.68H149.27Z"
        fill="currentColor"
      />
    </svg>
  );
}
