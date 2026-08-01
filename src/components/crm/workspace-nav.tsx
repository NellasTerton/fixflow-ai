"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { workspaceNavigation } from "@/lib/crm/constants";
import { cn } from "@/lib/utils";

export function WorkspaceNav() {
  const pathname = usePathname();
  const primary = workspaceNavigation.filter((item) => item.tier === "primary");
  const secondary = workspaceNavigation.filter(
    (item) => item.tier === "secondary",
  );

  function isActive(href: string) {
    return (
      pathname === href ||
      (href === "/workspace/leads" && pathname.startsWith("/workspace/leads/"))
    );
  }

  return (
    <nav
      aria-label="Разделы рабочего пространства"
      className="flex items-center gap-4 overflow-x-auto pb-1"
    >
      <div className="flex gap-1">
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-[#bbf451] text-[#071a1f]"
                : "text-white/65 hover:bg-white/8 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-3 border-l border-white/10 pl-4 text-xs text-white/40">
        {secondary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "transition-colors hover:text-white/70",
              isActive(item.href) && "text-white/70 underline underline-offset-4",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
