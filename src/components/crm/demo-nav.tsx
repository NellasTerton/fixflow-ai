"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { publicDemoNavigation } from "@/lib/crm/constants";
import { cn } from "@/lib/utils";

export function DemoNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Разделы демонстрационной CRM"
      className="flex gap-1 overflow-x-auto pb-1"
    >
      {publicDemoNavigation.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === "/demo/crm" && pathname.startsWith("/demo/leads/"));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-[#bbf451] text-[#071a1f]"
                : "text-white/65 hover:bg-white/8 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
