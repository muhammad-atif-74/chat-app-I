const { GoogleGenAI } = require("@google/genai");
const dotEnv = require('dotenv')
dotEnv.config()


const clients = new Map();

function getGeminiClient(apiKey = process.env.GEMINI_API_KEY) {
    if (!apiKey) throw new Error("No Gemini API key configured");
    if (!clients.has(apiKey)) clients.set(apiKey, new GoogleGenAI({ apiKey }));
    return clients.get(apiKey);
}

function getGeminiErrorMessage(error) {
    if (error?.statusCode === 429 || error?.status === 429) {
        const retryAfter = Number(error?.headers?.get?.("retry-after"));
        const hours = retryAfter ? Math.ceil(retryAfter / 3600) : null;
        return hours
            ? `Daily AI limit reached. Please try again in about ${hours} hour${hours === 1 ? "" : "s"}.`
            : "Daily AI limit reached. Please try again later.";
    }
    return "The AI service is temporarily unavailable. Please try again shortly.";
}

async function initializeCallToAPI() {
    try {
        console.log("calling: ", process.env.GEMINI_API_KEY)

        const interaction = await getGeminiClient().interactions.create({
            model: "gemini-3.6-flash",
            input: "When did pakistan came into being and who took great part in it. Concise.",
            stream: true
        });
        console.log(interaction.output_text);
    }
    catch (err) {
        console.log("Error", err)
    }
}

async function askGemini(prompt, apiKey) {
    try {
        const interaction = await getGeminiClient(apiKey).interactions.create({
            model: "gemini-3.6-flash",
            input: prompt,
            stream: false
        });
        return interaction.output_text;
    } catch (err) {
        throw err;
    }
}


async function askGeminiWithStreaming(req, res, apiKey) {
    try {
        console.log("Streaming api called. with req: ", req.body)
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: "Prompt is required" });
        console.log("prompt: ", prompt, " key: ", apiKey)

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const stream = await getGeminiClient(apiKey).interactions.create({
            model: "gemini-3.5-flash",
            input: prompt,
            stream: true
        });

        for await (const event of stream) {
            console.log("EVENT: ", event)
            res.write(`data: ${JSON.stringify(event)}\n\n`)
        }

        res.write(`data: [DONE]\n\n`);
        res.end()
    } catch (error) {
        console.error(error);

        if (!res.headersSent) {
            res.status(error?.statusCode === 429 ? 429 : 500).json({ error: getGeminiErrorMessage(error) });
        } else {
            res.write(`data: ${JSON.stringify({ error: getGeminiErrorMessage(error) })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
        }
    }
}

module.exports = { initializeCallToAPI, askGemini, askGeminiWithStreaming, getGeminiErrorMessage }
