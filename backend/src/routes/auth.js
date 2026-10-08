const express = require("express");
const { auth, db } = require("../config/firebase-admin");

const router = express.Router();
const identityToolkitUrl = "https://identitytoolkit.googleapis.com/v1/accounts";

async function firebasePasswordRequest(path, body) {
  const response = await fetch(`${identityToolkitUrl}:${path}?key=${process.env.FIREBASE_WEB_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, returnSecureToken: true }),
  });
  const data = await response.json();
  if (!response.ok) {
    const code = data?.error?.message || "AUTH_ERROR";
    const status = code === "EMAIL_EXISTS" ? 409 : code === "INVALID_LOGIN_CREDENTIALS" ? 401 : 400;
    const error = new Error(code);
    error.status = status;
    throw error;
  }
  return data;
}

router.post("/register", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required" });

  try {
    const session = await firebasePasswordRequest("signUp", { email, password });
    const user = await auth.verifyIdToken(session.idToken);
    await db.collection("users").doc(user.uid).set({
      uid: user.uid,
      name,
      email: user.email,
      createdAt: new Date(),
    });
    res.status(201).json({ uid: user.uid, name, email: user.email, idToken: session.idToken, refreshToken: session.refreshToken, expiresIn: session.expiresIn });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to register user", err: error });
  }
});

router.post("/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  try {
    const session = await firebasePasswordRequest("signInWithPassword", { email, password });
    res.json({ uid: session.localId, email: session.email, idToken: session.idToken, refreshToken: session.refreshToken, expiresIn: session.expiresIn });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? "Invalid email or password" : "Unable to log in" });
  }
});

module.exports = router;
