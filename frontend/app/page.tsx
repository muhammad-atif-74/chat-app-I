"use client"
import { useEffect, useRef, useState } from "react";
import { FormattedResponse } from "@/components/formatted-response";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addChatMessage, createChat, getChatMessages, getChats, type ChatRecord } from "@/lib/auth-client";

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<{ prompt: string; response: string }[]>([])
  const [recentChats, setRecentChats] = useState<ChatRecord[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [loadingChats, setLoadingChats] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamStarted, setStreamStarted] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [streamVersion, setStreamVersion] = useState(0)
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

  if (authLoading || !user) return <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">Loading...</div>

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: normalizedPrompt }),
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
      await addChatMessage(chatId, normalizedPrompt, streamedResponse)
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
  return (
    <section className="min-h-[100dvh] bg-[#f4f5f7] text-zinc-900">
      <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-white">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-950 p-4 text-zinc-300 md:flex">
          <div className="flex items-center gap-2 px-2 py-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-zinc-950">C</div>
            <span className="font-semibold tracking-tight">Customized GPT</span>
          </div>
          <button type="button" className="mt-6 flex h-10 items-center justify-center rounded-lg bg-white px-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200" onClick={() => { setSelectedChatId(null); setMessages([]); setError(""); router.replace("/") }}>
            + New chat
          </button>
          <div className="mt-7 flex-1">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Recent chats</p>
            <div className="mt-3 space-y-1">
              {loadingChats && <div className="flex justify-center px-3 py-3"><span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-transparent" aria-label="Loading chats" /></div>}
              {!loadingChats && recentChats.map((chat) => (
                <button type="button" key={chat.id} onClick={async () => { router.replace(`/?chat=${chat.id}`); setSelectedChatId(chat.id); setLoadingMessages(true); try { const loaded = await getChatMessages(chat.id); setMessages(loaded.map((message) => ({ prompt: message.req, response: message.res }))) } finally { setLoadingMessages(false) } }} className={`w-full truncate rounded-lg px-3 py-2.5 text-left text-sm transition ${selectedChatId === chat.id ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}>
                  {chat.title}
                </button>
              ))}
              {!loadingChats && !recentChats.length && <p className="px-3 py-2 text-xs text-zinc-600">No saved chats yet.</p>}
            </div>
          </div>
          <div className="space-y-1 border-t border-zinc-800 pt-3">
            <Link href={"/settings"}>
              <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white">⚙ Settings</button>
            </Link>
            <Link href={"/login"}>
            <button type="button" onClick={() => { logout(); router.replace("/login") }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white">↪ Log out</button>
            </Link>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 sm:px-28">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">AI assistant</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">New conversation</h1>
            </div>
            <div className="hidden items-center gap-2 text-xs text-zinc-400 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" />Ready</div>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-zinc-50/70 px-4 py-6 sm:px-28">
          {loadingMessages ? (
            <div className="flex h-full items-center justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" aria-label="Loading messages" />
            </div>
          ) : <>
          {!settingsLoading && !hasSettings && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>Add your API key in settings to finish setup.</span>
              <Link href="/settings" className="shrink-0 font-semibold underline underline-offset-4">Open settings</Link>
            </div>
          )}
            {messages.map((message, index) => (
              <div className="space-y-2" key={`${message.prompt}-${index}`}>
                <div className="flex justify-end">
                  <p className="max-w-[88%] rounded-2xl rounded-br-md bg-zinc-900 px-4 py-3 text-sm leading-6 text-white shadow-sm whitespace-pre-wrap sm:max-w-[70%]">
                    {message.prompt}
                  </p>
                </div>
                {message.response && (
                  <div className="flex justify-start">
                    <div key={`${message.prompt}-${index}-${index === messages.length - 1 ? streamVersion : 0}`} className="animate-stream-chunk group relative max-w-[88%] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-4 py-3 pb-10 text-sm leading-6 text-zinc-700 shadow-sm sm:max-w-[70%]">
                      <FormattedResponse content={message.response} />
                      <button
                        type="button"
                        aria-label={copiedIndex === index ? "Response copied" : "Copy response"}
                        className="absolute bottom-2 right-3 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                        onClick={() => handleCopy(message.response, index)}
                      >
                        {copiedIndex === index ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
            {isLoading && !streamStarted && (
              <div className="flex items-center gap-1 px-2 py-2 text-zinc-400" aria-label="Waiting for response">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
              </div>
            )}
            {!messages.length && !error && (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">Start a conversation</div>
            )}
          </>}
          <div ref={messagesEndRef} />
          </div>

          <form className="shrink-0 border-t border-zinc-100 bg-white p-4 sm:p-5 sm:px-28" onSubmit={handleAskAI}>
            <div className="flex items-end gap-2 rounded-xl border border-zinc-300 bg-zinc-50 p-2 transition focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-100">
              <textarea
                ref={promptInputRef}
                className="max-h-32 min-h-11 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2 text-sm leading-5 text-zinc-900 outline-none placeholder:text-zinc-400"
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
              <button disabled={isLoading || !prompt.trim()} className="h-10 shrink-0 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300">
                {isLoading ? "..." : "Send"}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-400">Press Enter to send · Shift + Enter for a new line</p>
          </form>
        </main>
      </div>
    </section>
  );
}
