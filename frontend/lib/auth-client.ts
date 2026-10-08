import APP_CONFIG from "@/app_config"

export type SessionUser = { uid: string; email: string; name?: string }
export type ChatRecord = { id: string; title: string; status: string; createdAt?: unknown }
export type ChatMessage = { id: string; req: string; res: string; status: string; model: string; createdAt?: unknown }
export type GeminiModel = { id: string; name: string }
type Session = { user: SessionUser; idToken: string; refreshToken: string; expiresIn: string }
const SESSION_KEY = "chat-session"
const apiUrl = (APP_CONFIG.api_url || "http://localhost:8080").replace(/\/+$/, "")

function saveSession(session: Session) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); return session.user }
export function getSession(): Session | null { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") } catch { return null } }

async function request(path: string, options: RequestInit = {}) {
  const session = getSession()
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.idToken}` } : {}), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "Request failed")
  return data
}

export async function loginUser(email: string, password: string) { const data = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); return saveSession({ user: { uid: data.uid, email: data.email }, ...data }) }
export async function registerUser(name: string, email: string, password: string) { const data = await request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }); return saveSession({ user: { uid: data.uid, email: data.email, name: data.name }, ...data }) }
export function logoutUser() { sessionStorage.removeItem(SESSION_KEY) }
export async function getUserSettings() { try { return (await request("/settings")).settings } catch (error) { if (error instanceof Error && error.message === "Settings not found") return null; throw error } }
export function saveUserSettings(apiKey: string, plan: string) { return request("/settings", { method: "PUT", body: JSON.stringify({ api_key: apiKey, plan }) }) }
export async function getGeminiModels(): Promise<GeminiModel[]> { return (await request("/models")).models }
export async function getChats(limit = 25): Promise<ChatRecord[]> { return (await request(`/chats?limit=${limit}`)).chats }
export async function createChat(title: string) { return request("/chats", { method: "POST", body: JSON.stringify({ title }) }) as Promise<ChatRecord> }
export function addChatMessage(chatId: string, req: string, res: string, model = "gemini-3.6-flash") { return request(`/chats/${chatId}/messages`, { method: "POST", body: JSON.stringify({ req, res, model }) }) }
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> { return (await request(`/chats/${chatId}/messages`)).messages }
