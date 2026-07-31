"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyExample({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = (await copyWithClipboardApi(text)) || copyWithFallback(text);

    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[#102328]/12 bg-[#f7f8f3] px-4 py-3 text-left transition hover:border-[#477233]/40 hover:bg-[#eef4e9]"
    >
      <span className="font-mono text-sm leading-6 text-[#263a3f]">
        {text}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#477233]">
        {copied ? (
          <>
            <Check className="size-3.5" aria-hidden="true" />
            Скопировано
          </>
        ) : (
          <>
            <Copy className="size-3.5" aria-hidden="true" />
            Копировать
          </>
        )}
      </span>
    </button>
  );
}

async function copyWithClipboardApi(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Some browser contexts deny the async Clipboard API outright; execCommand
 * still works there as long as it runs inside the click's user gesture. */
function copyWithFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  document.body.removeChild(textarea);
  return ok;
}
