"use client";

import { Bot, LoaderCircle, Send, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { inputSettings } from "@/components/chat/input-settings";
import { useChatSession } from "@/components/chat/use-chat-session";

const quickStarters = [
  "Стиральная машина не сливает воду",
  "Течёт кран на кухне",
  "Кондиционер не холодит",
];

/**
 * The dispatcher itself, embedded in the landing hero. A visitor starts the
 * real conversation here — same endpoints and same state machine as the full
 * /chat page — instead of being sent somewhere else to try the product.
 */
export function HeroChat() {
  const {
    result,
    messages,
    pending,
    error,
    isFinished,
    showOptions,
    sendMessage,
  } = useChatSession();
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStarted = messages.length > 1;

  const nextField = result?.missingFields[0] ?? "problemDescription";
  const input = useMemo(() => inputSettings(nextField), [nextField]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages, pending]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(value);
    setValue("");
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#0c2026]/80 shadow-2xl shadow-black/40 backdrop-blur">
        <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <span className="relative flex size-10 items-center justify-center rounded-full bg-[#bbf451] text-[#071a1f]">
            <Bot className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Диспетчер FixFlow</p>
            <p className="flex items-center gap-1.5 text-xs text-white/45">
              <span className="size-1.5 rounded-full bg-[#bbf451]" />
              Онлайн — отвечает сразу
            </p>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="h-[280px] space-y-3 overflow-y-auto px-5 py-4"
          aria-live="polite"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "customer" ? "justify-end" : "justify-start"
              }`}
            >
              <p
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                  message.sender === "customer"
                    ? "rounded-br-sm bg-[#bbf451] text-[#071a1f]"
                    : "rounded-bl-sm bg-white/8 text-white/85"
                }`}
              >
                {message.content}
              </p>
            </div>
          ))}

          {pending && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <LoaderCircle className="size-3.5 animate-spin" />
              Печатает…
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-200" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          {showOptions && result ? (
            <div className="grid max-h-[132px] gap-2 overflow-y-auto sm:grid-cols-2">
              {result.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={pending}
                  onClick={() => void sendMessage(option.value, option.label)}
                  className="rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-left text-xs font-medium text-white/85 transition hover:border-[#bbf451]/40 hover:bg-white/10 disabled:opacity-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : isFinished ? (
            <div className="flex flex-wrap gap-2">
              {result?.collectedData.leadId && (
                <Link
                  href={`/workspace/leads/${result.collectedData.leadId}`}
                  className="inline-flex h-10 items-center rounded-lg bg-[#bbf451] px-4 text-sm font-semibold text-[#071a1f]"
                >
                  Открыть заявку {result.collectedData.publicNumber}
                </Link>
              )}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="h-10 rounded-lg border border-white/15 px-4 text-sm font-semibold text-white/80"
              >
                Новая заявка
              </button>
            </div>
          ) : (
            <>
              {!hasStarted && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {quickStarters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => void sendMessage(starter)}
                      className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-[#bbf451]/40 hover:text-white"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <label className="sr-only" htmlFor="hero-chat-answer">
                  {input.label}
                </label>
                <input
                  id="hero-chat-answer"
                  type={input.type}
                  value={value}
                  min={input.min}
                  max={input.max}
                  maxLength={input.maxLength}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={input.placeholder}
                  disabled={pending}
                  required
                  className="min-w-0 flex-1 rounded-lg border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#bbf451]/50 focus:bg-white/8"
                />
                <button
                  type="submit"
                  disabled={pending || !value.trim()}
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#bbf451] text-[#071a1f] transition hover:bg-[#d0ff78] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Отправить"
                >
                  {pending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-white/40">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Тестовый диспетчер: не указывайте настоящее имя, телефон и адрес.
      </p>
    </div>
  );
}
