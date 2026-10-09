import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const backendUrl = (process.env.API_URL || "http://localhost:8080").replace(/\/+$/, "")
    const response = await fetch(`${backendUrl}/ask-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("authorization") ? { Authorization: request.headers.get("authorization")! } : {}),
      },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      return new Response(`data: ${JSON.stringify({ error: body.error || "Failed to start response stream" })}\n\ndata: [DONE]\n\n`, {
        status: 200,
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      })
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
    })
  } catch(err) {
    console.log("ERROR ARISE: ", err)
    return new Response('data: {"error":"The AI service could not be reached. Please check that the backend is running."}\n\ndata: [DONE]\n\n', {
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    })
  }
}
