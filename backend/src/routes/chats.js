const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase-admin");
const { requireAuth } = require("../middleware/require-auth");

const router = express.Router();
router.use(requireAuth);

async function getOwnedChat(chatId, userId) {
  const reference = db.collection("chats").doc(chatId);
  const snapshot = await reference.get();
  if (!snapshot.exists || snapshot.data().user_id !== userId) return null;
  return reference;
}

router.post("/", async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, 80) : "New chat";
  const reference = await db.collection("chats").add({
    user_id: req.user.uid,
    title: title || "New chat",
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  res.status(201).json({ id: reference.id, title: title || "New chat" });
});

router.get("/", async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 25, 100);
  let snapshot;
  try {
    snapshot = await db.collection("chats")
      .where("user_id", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
  } catch (error) {
    if (error.code !== 9) throw error;
    snapshot = await db.collection("chats")
      .where("user_id", "==", req.user.uid)
      .limit(limit)
      .get();
  }
  res.json({ chats: snapshot.docs.map((document) => ({ id: document.id, ...document.data() })), hasMore: snapshot.size === limit });
});

router.post("/:chatId/messages", async (req, res) => {
  const chat = await getOwnedChat(req.params.chatId, req.user.uid);
  if (!chat) return res.status(404).json({ error: "Chat not found" });

  const request = typeof req.body?.req === "string" ? req.body.req.trim() : "";
  const response = typeof req.body?.res === "string" ? req.body.res.trim() : "";
  if (!request || !response) return res.status(400).json({ error: "Both req and res are required" });

  const message = {
    req: request,
    res: response,
    model: typeof req.body?.model === "string" ? req.body.model : "unknown",
    status: "completed",
    createdAt: FieldValue.serverTimestamp(),
  };
  const reference = await chat.collection("messages").add(message);
  await chat.update({ updatedAt: FieldValue.serverTimestamp() });
  const saved = await reference.get();
  res.status(201).json({ id: reference.id, chat_id: chat.id, ...saved.data() });
});

router.get("/:chatId/messages", async (req, res) => {
  const chat = await getOwnedChat(req.params.chatId, req.user.uid);
  if (!chat) return res.status(404).json({ error: "Chat not found" });
  const snapshot = await chat.collection("messages").orderBy("createdAt", "asc").get();
  res.json({ messages: snapshot.docs.map((document) => ({ id: document.id, ...document.data() })) });
});

module.exports = router;
