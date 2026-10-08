
const dotEnv = require('dotenv')
dotEnv.config()

const express = require('express')
const cors = require('cors')
const { initializeCallToAPI, askGemini, askGeminiWithStreaming, getGeminiErrorMessage } = require('./src/config/gemini')
const authRoutes = require('./src/routes/auth')
const settingsRoutes = require('./src/routes/settings')

const app = express()
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
        return callback(new Error('Origin is not allowed by CORS'))
    },
    credentials: true,
}))
app.options(/.*/, cors())

app.use(express.json())
app.use('/auth', authRoutes)
app.use('/settings', settingsRoutes)

app.get("/", (req, res) => {
    console.log("API CALLED")
    res.send("Hello")
})

app.post('/ask', async (req, res) => {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    
    try {
        const answer = await askGemini(prompt);
        res.json({ answer: answer?.trim() || "" });
    } catch (err) {
        console.error(err);
        res.status(err?.statusCode === 429 ? 429 : 500).json({ error: getGeminiErrorMessage(err) });
    }
})

app.post('/ask-stream', askGeminiWithStreaming)

app.get('/send-stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let count = 0;

    const interval = setInterval(() => {
        count++;

        res.write(`data: Message_${count}\n`);

        if(count == 5) {clearInterval(interval); res.end()}
    }, 1000);
})

app.listen(8080, () => {
    console.log("Server is running")
})
