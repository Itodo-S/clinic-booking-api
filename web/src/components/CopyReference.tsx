import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { focusRing } from "../ui";

export function CopyReference({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <code className="truncate font-mono text-xs text-slate-600">{id}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Reference copied" : "Copy reference"}
        className={`grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-brand-700 ${focusRing}`}
      >
        {copied ? (
          <Check aria-hidden className="size-4 text-emerald-600" />
        ) : (
          <Copy aria-hidden className="size-4" />
        )}
      </button>
    </span>
  );
}
