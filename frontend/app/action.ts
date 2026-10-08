"use server"

import APP_CONFIG from "@/app_config"

type AskResponse = {
    answer: string
}

export const ask_gpt = async (prompt: string): Promise<AskResponse> => {
    const normalizedPrompt = prompt.trim()
    if (!normalizedPrompt) {
        throw new Error("Prompt is required")
    }

    const apiUrl = (APP_CONFIG.api_url || "http://localhost:8080").replace(/\/+$/, "")
    const response = await fetch(`${apiUrl}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: normalizedPrompt }),
        cache: "no-store",
    })

    const data = await response.json()
    if (!response.ok) {
        throw new Error(data?.error || "Failed to get response")
    }
    if (typeof data?.answer !== "string") {
        throw new Error("Invalid response from backend")
    }

    return data
}


export const ask_gpt_stream = async (prompt: string) => {
    const normalizedPrompt = prompt.trim()
    if (!normalizedPrompt) {
        throw new Error("Prompt is required")
    }

    const apiUrl = (APP_CONFIG.api_url || "http://localhost:8080").replace(/\/+$/, "");

    const response = await fetch(`${apiUrl}/send-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: normalizedPrompt })
    })

    if (!response.ok || !response.body) {
        throw new Error("Failed to start response stream")
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let result = "";

    while(true){
        const {done, value} = await reader?.read();

        if(done) break;

        const chunk = decoder.decode(value);

        result+= chunk;

        console.log(result)
    }
}
