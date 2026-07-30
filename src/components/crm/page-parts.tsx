import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function DemoPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-[#102328]/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#477233]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#102328] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#647276] sm:text-base">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#102328]/15 bg-white/55 text-center",
        compact ? "min-h-36 p-5" : "min-h-64 p-8",
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-[#e8f5ce] text-[#315b2d]">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-[#102328]">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-5 text-[#6b777a]">
        {description}
      </p>
    </div>
  );
}

export function DataBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  const tones = {
    neutral: "bg-[#102328]/6 text-[#526166]",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-sky-100 text-sky-800",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function SectionCard({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#102328]/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-[#102328]">
          {title}
        </h2>
        {typeof count === "number" ? (
          <span className="rounded-full bg-[#102328]/6 px-2.5 py-1 text-xs font-semibold text-[#526166]">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
