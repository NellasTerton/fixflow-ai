"use client";

import {
  AlertCircle,
  CalendarClock,
  Droplets,
  Inbox,
  RefreshCw,
  Search,
  Snowflake,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  categoryLabels,
  crmCategories,
  crmLeadStatuses,
  crmPriorities,
  crmSources,
  priorityLabels,
  sourceLabels,
  statusLabels,
  type CrmCategory,
  type CrmLeadStatus,
  type CrmPriority,
  type CrmSource,
} from "@/lib/crm/constants";
import {
  formatPreferredTime,
  formatPriceRange,
} from "@/lib/crm/presentation";
import type { PublicLead } from "@/lib/crm/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "./page-parts";

interface FilterState {
  category: CrmCategory | "";
  status: CrmLeadStatus | "";
  priority: CrmPriority | "";
  source: CrmSource | "";
}

const categoryIcons = {
  appliance_repair: Wrench,
  plumbing: Droplets,
  air_conditioning: Snowflake,
  common: Inbox,
};

const statusAccent: Record<CrmLeadStatus, string> = {
  new: "bg-sky-500",
  qualifying: "bg-violet-500",
  waiting_booking: "bg-amber-500",
  booked: "bg-blue-500",
  in_progress: "bg-orange-500",
  completed: "bg-emerald-500",
  cancelled: "bg-slate-400",
  human_required: "bg-red-500",
};

const priorityTone: Record<CrmPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-sky-50 text-sky-700",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-800",
};

export function KanbanBoard({
  initialLeads,
  initialRefreshedAt,
}: {
  initialLeads: PublicLead[];
  initialRefreshedAt: string;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [filters, setFilters] = useState<FilterState>({
    category: "",
    status: "",
    priority: "",
    source: "",
  });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(
    () => new Date(initialRefreshedAt),
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    if (deferredSearch.trim()) {
      params.set("search", deferredSearch.trim());
    }

    return params.toString();
  }, [deferredSearch, filters]);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/demo/leads${queryString ? `?${queryString}` : ""}`,
        { cache: "no-store", signal },
      );

      if (!response.ok) {
        throw new Error("Не удалось получить заявки");
      }

      const payload = (await response.json()) as {
        leads: PublicLead[];
        refreshedAt: string;
      };
      setLeads(payload.leads);
      setLastUpdated(new Date(payload.refreshedAt));
    } catch (refreshError) {
      if (
        refreshError instanceof DOMException &&
        refreshError.name === "AbortError"
      ) {
        return;
      }
      setError("Обновление не удалось. Показаны последние доступные данные.");
    } finally {
      if (!signal?.aborted) {
        setIsRefreshing(false);
      }
    }
  }, [queryString]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void refresh(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [refresh]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 10_000);

    return () => window.clearInterval(intervalId);
  }, [refresh]);

  const visibleStatuses = filters.status
    ? [filters.status]
    : [...crmLeadStatuses];
  const hasFilters =
    Boolean(search) || Object.values(filters).some((value) => Boolean(value));

  function clearFilters() {
    setSearch("");
    setFilters({ category: "", status: "", priority: "", source: "" });
  }

  return (
    <div className="mt-7">
      <div className="rounded-2xl border border-[#102328]/10 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(130px,0.7fr))_auto]">
          <label className="relative">
            <span className="sr-only">Поиск заявок</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#829093]"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Номер, имя или проблема"
              className="h-10 w-full rounded-xl border border-[#102328]/12 bg-[#f8f9f4] pl-9 pr-3 text-sm outline-none transition focus:border-[#6f9b45] focus:ring-2 focus:ring-[#bbf451]/30"
            />
          </label>

          <FilterSelect
            label="Категория"
            value={filters.category}
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                category: value as FilterState["category"],
              }))
            }
            options={crmCategories.map((value) => ({
              value,
              label: categoryLabels[value],
            }))}
          />
          <FilterSelect
            label="Статус"
            value={filters.status}
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                status: value as FilterState["status"],
              }))
            }
            options={crmLeadStatuses.map((value) => ({
              value,
              label: statusLabels[value],
            }))}
          />
          <FilterSelect
            label="Приоритет"
            value={filters.priority}
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                priority: value as FilterState["priority"],
              }))
            }
            options={crmPriorities.map((value) => ({
              value,
              label: priorityLabels[value],
            }))}
          />
          <FilterSelect
            label="Источник"
            value={filters.source}
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                source: value as FilterState["source"],
              }))
            }
            options={crmSources.map((value) => ({
              value,
              label: sourceLabels[value],
            }))}
          />

          <div className="flex gap-2">
            {hasFilters ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                aria-label="Сбросить фильтры"
                onClick={clearFilters}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="flex-1 bg-[#102328] text-white hover:bg-[#1d363c]"
              onClick={() => void refresh()}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("size-4", isRefreshing && "animate-spin")}
                aria-hidden="true"
              />
              Обновить
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#768386]">
          <span>
            {leads.length} заявок · автообновление каждые 10 секунд
          </span>
          <span>
            Обновлено{" "}
            {lastUpdated.toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZone: "UTC",
            })}
            {" UTC"}
          </span>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {leads.length === 0 && !isRefreshing ? (
        <div className="mt-5">
          <EmptyState
            icon={Inbox}
            title="Заявки не найдены"
            description="Измените фильтры или поисковый запрос. Новые заявки из чата появятся здесь автоматически."
          />
        </div>
      ) : (
        <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div
            className="grid min-w-max auto-cols-[minmax(280px,320px)] grid-flow-col gap-4"
            aria-label="Read-only Kanban заявок"
          >
            {visibleStatuses.map((status) => {
              const statusLeads = leads.filter((lead) => lead.status === status);

              return (
                <section
                  key={status}
                  className="rounded-2xl bg-[#e9ece5] p-3"
                  aria-labelledby={`column-${status}`}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          statusAccent[status],
                        )}
                      />
                      <h2
                        id={`column-${status}`}
                        className="text-sm font-semibold text-[#263a3f]"
                      >
                        {statusLabels[status]}
                      </h2>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#667477]">
                      {statusLeads.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {statusLeads.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#102328]/12 px-4 py-8 text-center text-xs text-[#899497]">
                        Нет заявок
                      </div>
                    ) : (
                      statusLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-[#102328]/12 bg-[#f8f9f4] px-3 text-sm text-[#34474c] outline-none transition focus:border-[#6f9b45] focus:ring-2 focus:ring-[#bbf451]/30"
      >
        <option value="">{label}: все</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LeadCard({ lead }: { lead: PublicLead }) {
  const Icon = categoryIcons[lead.category];

  return (
    <Link
      href={`/demo/leads/${lead.id}`}
      className="block rounded-xl border border-[#102328]/8 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#6f9b45]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f9b45]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#e8f5ce] text-[#315b2d]">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-mono text-xs font-semibold text-[#315b2d]">
              {lead.publicNumber}
            </p>
            <p className="mt-0.5 text-xs text-[#7a878a]">
              {categoryLabels[lead.category]}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-[10px] font-semibold",
            priorityTone[lead.priority],
          )}
        >
          {priorityLabels[lead.priority]}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-semibold leading-5 text-[#102328]">
        {lead.customerName}
      </h3>
      <p className="mt-1 line-clamp-3 text-sm leading-5 text-[#5f6e72]">
        {lead.problemDescription}
      </p>

      <div className="mt-4 border-t border-[#102328]/8 pt-3">
        <p className="text-sm font-semibold text-[#263a3f]">
          {formatPriceRange(
            lead.estimatedPriceFrom,
            lead.estimatedPriceTo,
          )}
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[#748184]">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          {lead.bookingStartsAt
            ? new Date(lead.bookingStartsAt).toLocaleString("ru-RU", {
                dateStyle: "short",
                timeStyle: "short",
                timeZone: "UTC",
              })
            : formatPreferredTime(lead.preferredDate, lead.preferredTime)}
        </div>
      </div>
    </Link>
  );
}
