"use client"
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function ApiKeyRequiredModal() {
  const [open, setOpen] = useState(true)
  const ctaRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!open) return
    ctaRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-modal-title"
        aria-describedby="api-key-modal-desc"
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)] ring-1 ring-slate-200"
      >
        <div className="h-1.5 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-400" />
        <div className="px-7 pb-7 pt-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7.5" cy="15.5" r="4.5" />
              <path d="m10.7 12.3 9.8-9.8M16 7l3 3M14 9l2 2" />
            </svg>
          </div>
          <h2 id="api-key-modal-title" className="mt-5 text-xl font-semibold tracking-tight text-slate-900">Add your API key to start chatting</h2>
          <p id="api-key-modal-desc" className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Sending messages needs your Gemini API key. Add it in settings, then come back and ask anything.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row-reverse">
            <Link
              ref={ctaRef}
              href="/settings"
              className="flex h-11 flex-1 items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/60 focus-visible:ring-offset-2"
            >
              Add API key
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 flex-1 rounded-xl px-5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/60"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}