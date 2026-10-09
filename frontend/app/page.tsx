"use client"
import { useEffect, useRef, useState } from "react";
import { FormattedResponse } from "@/components/formatted-response";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addChatMessage, createChat, getChatMessages, getChats, getGeminiModels, getSession, type ChatRecord, type GeminiModelTiers } from "@/lib/auth-client";

/* ---------- Presentation helpers (no app logic) ---------- */

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/60"

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg {...iconProps} className={className}><path d="M12 5v14M5 12h14" /></svg>
}
function SlidersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M3 6h9M16 6h5M3 12h3M10 12h11M3 18h11M18 18h3" />
      <circle cx="14" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="16" cy="18" r="2" />
    </svg>
  )
}
function LogoutIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg {...iconProps} className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
}
function CopyIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <rect width="13" height="13" x="8" y="8" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  )
}
function MenuIcon({ className = "h-5 w-5" }: { className?: string }) { return <svg {...iconProps} className={className}><path d="M4 6h16M4 12h16M4 18h16" /></svg> }
function CloseIcon({ className = "h-5 w-5" }: { className?: string }) { return <svg {...iconProps} className={className}><path d="m6 6 12 12M18 6 6 18" /></svg> }
function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <svg {...iconProps} className={className}><path d="m5 12 4 4L19 6" /></svg>
}
function ArrowUpIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg {...iconProps} className={className}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
}
function Spinner({ className = "h-4 w-4", label }: { className?: string; label?: string }) {
  return <span role={label ? "status" : undefined} aria-label={label} className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />
}
function Avatar({ letter, className = "" }: { letter: string; className?: string }) {
  return <div className={`flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700 ${className}`}>{letter}</div>
}

/* ---------- Page ---------- */

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<{ prompt: string; response: string }[]>([])
  const [recentChats, setRecentChats] = useState<ChatRecord[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [loadingChats, setLoadingChats] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [modelTiers, setModelTiers] = useState<GeminiModelTiers>({ budget: [], balanced: [], higher: [] })
  const [selectedTier, setSelectedTier] = useState<keyof GeminiModelTiers>("balanced")
  const [selectedModel, setSelectedModel] = useState("gemini-3.6-flash")
  const [loadingModels, setLoadingModels] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamStarted, setStreamStarted] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [streamVersion, setStreamVersion] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const promptInputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user, loading: authLoading, settingsLoading, hasSettings, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login")
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    const timer = window.setTimeout(() => {
      setLoadingChats(true)
      getChats().then(setRecentChats).catch(() => setRecentChats([])).finally(() => setLoadingChats(false))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [user])

  useEffect(() => {
    if (!hasSettings) return
    const timer = window.setTimeout(() => {
      setLoadingModels(true)
      getGeminiModels().then((tiers) => {
        setModelTiers(tiers)
        const defaultModel = tiers.balanced.find((model) => model.id === "gemini-3.6-flash")
        const firstModel = defaultModel || tiers.balanced[0] || tiers.budget[0] || tiers.higher[0]
        if (firstModel) setSelectedModel(firstModel.id)
      }).catch(() => setModelTiers({ budget: [], balanced: [], higher: [] })).finally(() => setLoadingModels(false))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [hasSettings])

  const availableModels = modelTiers[selectedTier]

  useEffect(() => {
    if (!user) return
    const timer = window.setTimeout(() => {
      const chatId = new URLSearchParams(window.location.search).get("chat")
      if (!chatId) {
        setSelectedChatId(null)
        setMessages([])
        return
      }

      setSelectedChatId(chatId)
      setLoadingMessages(true)
      getChatMessages(chatId)
        .then((loaded) => setMessages(loaded.map((message) => ({ prompt: message.req, response: message.res }))))
        .catch(() => { setSelectedChatId(null); setMessages([]); router.replace("/") })
        .finally(() => setLoadingMessages(false))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [user, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (authLoading || !user) return <div className="flex min-h-screen items-center justify-center bg-white"><Spinner className="h-6 w-6 text-teal-700" label="Loading" /></div>

  const handleCopy = async (response: string, index: number) => {
    await navigator.clipboard.writeText(response)
    setCopiedIndex(index)
    window.setTimeout(() => setCopiedIndex(null), 1500)
  }

  const handleAskAI = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedPrompt = prompt.trim()
    if (!normalizedPrompt) return
    setError("")
    setIsLoading(true)
    setStreamStarted(false)
    setPrompt("")
    if (promptInputRef.current) promptInputRef.current.style.height = "44px"
    setMessages((current) => [...current, { prompt: normalizedPrompt, response: "" }])
    try {
      const chatId = selectedChatId || (await createChat(normalizedPrompt.replace(/\s+/g, " ").slice(0, 60) || "New chat")).id
      setSelectedChatId(chatId)
      router.replace(`/?chat=${chatId}`)
      const response = await fetch("/api/ask-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getSession()?.idToken || ""}` },
        body: JSON.stringify({ prompt: normalizedPrompt, model: selectedModel }),
      })
      if (!response.ok || !response.body) throw new Error("Failed to start response stream")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let streamedResponse = ""
      let pendingWords = ""

      const updateResponse = (chunk: string, flush = false) => {
        pendingWords += chunk
        const words = pendingWords.match(/\S+\s*/g) || []
        const wordCount = flush ? words.length : Math.floor(words.length / 4) * 4
        if (!wordCount) return

        streamedResponse += words.slice(0, wordCount).join("")
        pendingWords = words.slice(wordCount).join("")
        setStreamStarted(true)
        setMessages((current) => {
          const last = current[current.length - 1]
          return last?.prompt === normalizedPrompt
            ? current.map((message, index) => index === current.length - 1 ? { ...message, response: streamedResponse } : message)
            : [...current, { prompt: normalizedPrompt, response: streamedResponse }]
        })
        setStreamVersion((version) => version + 1)
      }

      while (true) {
        const { done, value } = await reader.read()
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
        const events = buffer.split("\n\n")
        buffer = events.pop() || ""

        for (const event of events) {
          const data = event.split("\n").find((line) => line.startsWith("data: "))?.slice(6)
          if (!data || data === "[DONE]") continue
          try {
            const payload = JSON.parse(data)
            if (payload.error) throw new Error(payload.error)
            const text = payload.text || payload.delta?.text || payload.output_text || payload.delta
            if (typeof text === "string") updateResponse(text)
          } catch {
            updateResponse(data)
          }
        }
        if (done) break
      }

      updateResponse("", true)
      if (!streamedResponse) throw new Error("The AI returned an empty response")
      setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, response: streamedResponse } : message))
      await addChatMessage(chatId, normalizedPrompt, streamedResponse, selectedModel)
      getChats().then(setRecentChats).catch(() => undefined)
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to get response"
      let message = rawMessage
      try {
        const parsed = JSON.parse(rawMessage)
        if (typeof parsed?.error === "string") message = parsed.error
      } catch {
        // Keep the original message when it is not JSON.
      }
      setError(message)
    } finally {
      setIsLoading(false)
      setStreamStarted(false)
    }
  }
  const activeChatTitle = recentChats.find((chat) => chat.id === selectedChatId)?.title || "New conversation"
  const userInitial = (user.name || user.email || "U").slice(0, 1).toUpperCase()

  return (
    <section className="min-h-[100dvh] bg-white text-slate-900 antialiased">
      <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden">
        {/* ---------- Sidebar ---------- */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50 md:flex">
          <div className="flex items-center gap-3 px-5 pb-4 pt-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-sm font-semibold text-white shadow-sm">M</div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-slate-900">MY AI</p>
              <p className="text-xs text-slate-500">Personal workspace</p>
            </div>
          </div>

          <div className="px-3">
            <button
              type="button"
              className={`flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 ${focusRing}`}
              onClick={() => { setSelectedChatId(null); setMessages([]); setError(""); router.replace("/") }}
            >
              <PlusIcon className="h-4 w-4 text-teal-700" /> New chat
            </button>
          </div>

          <nav className="mt-6 min-h-0 flex-1 overflow-y-auto px-3" aria-label="Recent chats">
            <div className="flex items-center justify-between px-2">
              <p className="text-xs font-medium text-slate-500">Recent chats</p>
              <span className="text-xs tabular-nums text-slate-400">{recentChats.length || ""}</span>
            </div>
            <div className="mt-2 space-y-0.5">
              {loadingChats && <div className="flex justify-center px-3 py-4"><Spinner className="h-4 w-4 text-slate-400" label="Loading chats" /></div>}
              {!loadingChats && recentChats.map((chat) => (
                <button
                  type="button"
                  key={chat.id}
                  aria-current={selectedChatId === chat.id ? "page" : undefined}
                  onClick={async () => { setMobileNavOpen(false); router.replace(`/?chat=${chat.id}`); setSelectedChatId(chat.id); setLoadingMessages(true); try { const loaded = await getChatMessages(chat.id); setMessages(loaded.map((message) => ({ prompt: message.req, response: message.res }))) } finally { setLoadingMessages(false) } }}
                  className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition ${focusRing} ${selectedChatId === chat.id ? "bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"}`}
                >
                  {chat.title}
                </button>
              ))}
              {!loadingChats && !recentChats.length && <p className="px-3 py-2 text-sm text-slate-500">No saved chats yet.</p>}
            </div>
          </nav>

          <div className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-3 px-2 pb-3 pt-1">
              <Avatar letter={userInitial} className="h-8 w-8 text-xs" />
              <p className="min-w-0 truncate text-sm text-slate-600" title={user.email}>{user.email}</p>
            </div>
            <div className="space-y-0.5">
              <Link href="/settings" onClick={() => setMobileNavOpen(false)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-200/60 hover:text-slate-900 ${focusRing}`}>
                <SlidersIcon className="h-4 w-4 text-slate-400" />Settings
              </Link>
              <button type="button" onClick={() => { logout(); router.replace("/login") }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-200/60 hover:text-slate-900 ${focusRing}`}>
                <LogoutIcon className="h-4 w-4 text-slate-400" />Log out
              </button>
            </div>
          </div>
        </aside>

        {mobileNavOpen && <div className="fixed inset-0 z-40 bg-slate-950/20 md:hidden" onClick={() => setMobileNavOpen(false)} />}
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col border-r border-slate-200 bg-slate-50 shadow-xl transition-transform duration-200 md:hidden ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between px-5 pb-4 pt-5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-sm font-semibold text-white">M</div><div><p className="text-sm font-semibold text-slate-900">MY AI</p><p className="text-xs text-slate-500">Personal workspace</p></div></div><button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className={`rounded-lg p-2 text-slate-500 hover:bg-slate-200 ${focusRing}`}><CloseIcon /></button></div>
          <div className="px-3"><button type="button" onClick={() => { setMobileNavOpen(false); setSelectedChatId(null); setMessages([]); setError(""); router.replace("/") }} className={`flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm ${focusRing}`}><PlusIcon className="h-4 w-4 text-teal-700" />New chat</button></div>
          <nav className="mt-6 min-h-0 flex-1 overflow-y-auto px-3" aria-label="Recent chats"><p className="px-2 text-xs font-medium text-slate-500">Recent chats</p><div className="mt-2 space-y-0.5">{loadingChats ? <div className="flex justify-center py-4"><Spinner className="h-4 w-4 text-slate-400" label="Loading chats" /></div> : recentChats.map((chat) => <button type="button" key={chat.id} onClick={async () => { setMobileNavOpen(false); router.replace(`/?chat=${chat.id}`); setSelectedChatId(chat.id); setLoadingMessages(true); try { const loaded = await getChatMessages(chat.id); setMessages(loaded.map((message) => ({ prompt: message.req, response: message.res }))) } finally { setLoadingMessages(false) } }} className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${selectedChatId === chat.id ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-200/60"}`}>{chat.title}</button>)}</div></nav>
          <div className="border-t border-slate-200 p-3"><p className="truncate px-2 pb-2 text-xs text-slate-500">{user.email}</p><Link href="/settings" onClick={() => setMobileNavOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-200/60 ${focusRing}`}><SlidersIcon className="h-4 w-4 text-slate-400" />Settings</Link><button type="button" onClick={() => { logout(); router.replace("/login") }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-200/60 ${focusRing}`}><LogoutIcon className="h-4 w-4 text-slate-400" />Log out</button></div>
        </aside>

        {/* ---------- Main ---------- */}
        <main className="flex min-w-0 flex-1 flex-col bg-white">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white md:hidden ${focusRing}`}><MenuIcon className="h-4 w-4" /></button>
              <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900">{activeChatTitle}</h1>
            </div>
            <Avatar letter={userInitial} className="h-8 w-8 text-xs" />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
              {loadingMessages ? (
                <div className="flex flex-1 items-center justify-center">
                  <Spinner className="h-6 w-6 text-slate-400" label="Loading messages" />
                </div>
              ) : <>
                {!settingsLoading && !hasSettings && (
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <span>Add your API key in settings to finish setup.</span>
                    <Link href="/settings" className={`shrink-0 rounded font-semibold underline underline-offset-4 ${focusRing}`}>Open settings</Link>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div className="space-y-6" key={`${message.prompt}-${index}`}>
                    <div className="flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-slate-100 px-4 py-2.5 text-[15px] leading-6 text-slate-900 sm:max-w-[75%]">{message.prompt}</p>
                    </div>
                    {message.response && (
                      <div className="flex gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-xs font-semibold text-white">M</div>
                        <div className="min-w-0 flex-1">
                          <div key={`${message.prompt}-${index}-${index === messages.length - 1 ? streamVersion : 0}`} className="animate-stream-chunk text-[15px] leading-7 text-slate-800">
                            <FormattedResponse content={message.response} />
                          </div>
                          <div className="mt-2 flex items-center">
                            <button
                              type="button"
                              aria-label={copiedIndex === index ? "Response copied" : "Copy response"}
                              title={copiedIndex === index ? "Response copied" : "Copy response"}
                              className={`-ml-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition hover:bg-slate-100 ${focusRing} ${copiedIndex === index ? "text-teal-700" : "text-slate-400 hover:text-slate-700"}`}
                              onClick={() => handleCopy(message.response, index)}
                            >
                              {copiedIndex === index ? <CheckIcon /> : <CopyIcon />}
                              {copiedIndex === index ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

                {isLoading && !streamStarted && (
                  <div className="flex items-center gap-3" aria-label="Waiting for response">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-xs font-semibold text-white">M</div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                    </div>
                  </div>
                )}

                {!messages.length && !error && (
                  <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-lg font-semibold text-white shadow-sm">M</div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">What can I help with?</h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Ask a question, explore an idea, or start something new.</p>
                    <div className="mt-7 flex flex-wrap justify-center gap-2">
                      {["Explain a concept", "Help me write", "Brainstorm ideas"].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => { setPrompt(suggestion); promptInputRef.current?.focus() }}
                          className={`rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-teal-600/40 hover:bg-teal-50 hover:text-teal-800 ${focusRing}`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* ---------- Composer ---------- */}
          <form className="shrink-0 px-4 pb-4 pt-2 sm:px-6 sm:pb-6" onSubmit={handleAskAI}>
            <div className="mx-auto w-full max-w-3xl">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.18)] transition focus-within:border-teal-600/60 focus-within:ring-4 focus-within:ring-teal-600/10">
                <textarea
                  ref={promptInputRef}
                  className="block max-h-32 min-h-11 w-full resize-none overflow-y-auto rounded-t-2xl bg-transparent px-4 py-2.5 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Ask anything..."
                  rows={1}
                  onChange={(e) => {
                    e.currentTarget.style.height = "auto"
                    e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 128)}px`
                    setPrompt(e.target.value)
                  }}
                  value={prompt}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      e.currentTarget.form?.requestSubmit()
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-3 px-2.5 pb-2.5 pt-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <select
                      aria-label="Model tier"
                      value={selectedTier}
                      onChange={(event) => { const tier = event.target.value as keyof GeminiModelTiers; setSelectedTier(tier); setSelectedModel(modelTiers[tier][0]?.id || "gemini-3.6-flash") }}
                      disabled={loadingModels}
                      className={`h-8 max-w-28 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                    >
                      <option value="budget">Budget</option>
                      <option value="balanced">Balanced</option>
                      <option value="higher">Higher</option>
                    </select>
                    <select
                      aria-label="Model"
                      value={selectedModel}
                      onChange={(event) => setSelectedModel(event.target.value)}
                      disabled={loadingModels || !availableModels.length}
                      className={`h-8 min-w-0 max-w-40 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-56 ${focusRing}`}
                    >
                      {!availableModels.length && <option value="gemini-3.6-flash">{loadingModels ? "Loading..." : "No models"}</option>}
                      {availableModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !prompt.trim()}
                    className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-teal-700 pl-4 pr-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none ${focusRing}`}
                  >
                    {isLoading ? <Spinner className="mr-1 h-4 w-4" label="Sending" /> : <>Send<ArrowUpIcon className="h-4 w-4" /></>}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">Press Enter to send. Use Shift + Enter for a new line.</p>
            </div>
          </form>
        </main>
      </div>
    </section>
  );
}
