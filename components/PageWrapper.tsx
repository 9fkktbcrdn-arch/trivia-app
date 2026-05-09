"use client";

import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
}

export function PageWrapper({ children, className, centered = false }: PageWrapperProps) {
  return (
    <div
      className={cn(
        "min-h-dvh px-4 py-8 md:px-8",
        centered && "flex flex-col items-center justify-center",
        className,
      )}
    >
      <div className={cn("w-full max-w-2xl mx-auto", centered && "flex flex-col items-center")}>
        {children}
      </div>
    </div>
  );
}

interface SectionHeadingProps {
  label?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeading({ label, title, subtitle, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-8", className)}>
      {label && (
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-mid mb-3">
          {label}
        </p>
      )}
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle && (
        <p className="mt-2 text-muted-foreground text-sm md:text-base">{subtitle}</p>
      )}
    </div>
  );
}
