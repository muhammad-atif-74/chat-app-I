const express = require("express");
const { db } = require("../config/firebase-admin");
const { requireAuth } = require("../middleware/require-auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const snapshot = await db.collection("settings").doc(req.user.uid).get();
  if (!snapshot.exists) return res.status(404).json({ error: "Settings not found" });
  res.json({ settings: snapshot.data() });
});

router.put("/", async (req, res) => {
  const apiKey = typeof req.body?.api_key === "string" ? req.body.api_key.trim() : "";
  const plan = typeof req.body?.plan === "string" ? req.body.plan.trim() : "free";
  if (!apiKey) return res.status(400).json({ error: "API key is required" });

  const settings = { user_id: req.user.uid, api_key: apiKey, plan, updatedAt: new Date() };
  await db.collection("settings").doc(req.user.uid).set(settings, { merge: true });
  res.json({ settings });
});

module.exports = router;
