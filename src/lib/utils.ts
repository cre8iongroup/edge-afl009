import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns true if today is after July 1 of the given year (default: current year).
 * Used to lock the presenter section to read-only after the editing deadline.
 */
export function isAfterJuly1(year = new Date().getFullYear()): boolean {
  return new Date() > new Date(year, 6, 1); // month index 6 = July
}
