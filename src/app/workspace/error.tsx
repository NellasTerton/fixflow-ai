"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DemoError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-[#102328]">
          Не удалось загрузить данные
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#687679]">
          CRM осталась read-only. Попробуйте повторить безопасный запрос к
          демонстрационной базе.
        </p>
        <Button
          className="mt-6 bg-[#102328] text-white"
          onClick={unstable_retry}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Повторить
        </Button>
      </div>
    </div>
  );
}
