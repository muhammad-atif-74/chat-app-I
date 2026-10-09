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

async function listGeminiModels(apiKey) {
    const excludedKeywords = [
        'tts', 'image', 'banana', 'embedding', 'transcribe',
        'robotics', 'computer-use', 'lyria', 'veo', 'clip',
        'omni', 'antigravity', 'deep-research', 'aqa'
    ];
    const tiers = { budget: [], balanced: [], higher: [] };
    const pager = await getGeminiClient(apiKey).models.list();
    for await (const model of pager) {
        const id = model.name?.replace(/^models\//, "").toLowerCase();
        if (!id || excludedKeywords.some((keyword) => id.includes(keyword))) continue;
        const item = { id, name: model.displayName || id };
        if (id.includes('lite')) tiers.budget.push({ ...item, tier: 'Budget', badge: 'Lowest Cost / Ultra-Fast' });
        else if (id.includes('pro') || id.includes('gemma')) tiers.higher.push({ ...item, tier: 'Higher', badge: 'Deep Reasoning / Complex Logic' });
        else if (id.includes('flash')) tiers.balanced.push({ ...item, tier: 'Balanced', badge: 'Best All-Around Value' });
    }
    return tiers;
}


async function askGeminiWithStreaming(req, res, apiKey) {
    try {
        console.log("Streaming api called. with req: ", req.body)
        const { prompt } = req.body;
        const model = typeof req.body?.model === "string" && req.body.model.trim() ? req.body.model.trim() : "gemini-3.6-flash";
        if (!prompt) return res.status(400).json({ error: "Prompt is required" });
        console.log("prompt: ", prompt, " key: ", apiKey)

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const stream = await getGeminiClient(apiKey).interactions.create({
            model,
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

module.exports = { initializeCallToAPI, askGemini, askGeminiWithStreaming, listGeminiModels, getGeminiErrorMessage }
