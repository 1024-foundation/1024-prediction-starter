import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names — same helper the real 1024 frontend uses. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
