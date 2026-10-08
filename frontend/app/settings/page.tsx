"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { getUserSettings, saveUserSettings } from "@/lib/auth-client";

export default function SettingsPage() {
  const { user: authUser, loading, logout, refreshSettings } = useAuth();
  const router = useRouter();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [plan, setPlan] = useState("free");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!authUser) return;
    getUserSettings().then((settings) => {
      if (settings) {
        setApiKey(settings.api_key || "");
        setPlan(settings.plan || "free");
      }
    });
  }, [authUser]);

  if (loading || !authUser) return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading...</div>;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );

    if (!confirmed) return;

    // TODO: Call delete account API
    console.log("Delete account");
  };

  const generateApiKey = () => {
    // TODO: Replace this with your API key generation API
    const randomKey =
      "sk-chatbot-" +
      Math.random().toString(36).substring(2, 22);

    setApiKey(randomKey);
  };

  const handleSaveSettings = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      await saveUserSettings(apiKey, plan);
      await refreshSettings();
      setMessage("Settings saved.");
    } catch {
      setMessage("Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const copyApiKey = async () => {
    await navigator.clipboard.writeText(apiKey);
    alert("API key copied.");
  };

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="mb-5 inline-flex text-sm text-gray-500 hover:text-black"
          >
            ← Back to chatbot
          </Link>

          <h1 className="text-3xl font-semibold tracking-tight">
            Settings
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Manage your profile, API access, subscription and account.
          </p>
        </div>

        <div className="space-y-6">
          {/* ================= PROFILE ================= */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="font-semibold">Profile</h2>
              <p className="mt-1 text-sm text-gray-500">
                Your account information.
              </p>
            </div>

            <div className="space-y-5 px-6 py-6">
              {/* Username */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Username
                </label>

                <input
                  type="text"
                  value={authUser.name || "Not set"}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Email
                </label>

                <input
                  type="email"
                  value={authUser.email || "Not set"}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 outline-none"
                />
              </div>

              {/* Account created */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Account created
                </label>

                <p className="text-sm text-gray-500">
                  Account profile created with Firebase
                </p>
              </div>
            </div>
          </section>

          {/* ================= API KEY ================= */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="font-semibold">API Key</h2>

              <p className="mt-1 text-sm text-gray-500">
                Use your API key to connect your applications to the
                chatbot API.
              </p>
            </div>

            <div className="px-6 py-6">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium">
                  Your API key
                </label>

                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  Private
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 font-mono text-sm outline-none"
                />

                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium hover:bg-gray-50"
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>

                <button
                  onClick={copyApiKey}
                  className="rounded-lg border border-black bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Copy
                </button>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <label htmlFor="plan" className="text-sm font-medium">Plan</label>
                <select id="plan" value={plan} onChange={(event) => setPlan(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
                <button type="button" onClick={handleSaveSettings} disabled={saving || !apiKey.trim()} className="ml-auto rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white disabled:bg-gray-300">
                  {saving ? "Saving..." : "Save settings"}
                </button>
              </div>
              {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}

              <p className="mt-3 text-xs text-gray-500">
                Never share your API key publicly or commit it to
                source control.
              </p>

              <div className="mt-5">
                <button
                  onClick={generateApiKey}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  Generate new key
                </button>
              </div>
            </div>
          </section>

          {/* ================= PLAN ================= */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="font-semibold">Plan & Billing</h2>

              <p className="mt-1 text-sm text-gray-500">
                Manage your chatbot usage and subscription.
              </p>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {/* Free */}
              <div className="rounded-xl border border-gray-300 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">Free</h3>

                    <p className="mt-1 text-sm text-gray-500">
                      For getting started.
                    </p>
                  </div>

                  <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                    Current
                  </span>
                </div>

                <div className="mt-5">
                  <span className="text-2xl font-semibold">
                    $0
                  </span>

                  <span className="text-sm text-gray-500">
                    /month
                  </span>
                </div>

                <ul className="mt-5 space-y-3 text-sm text-gray-600">
                  <li>✓ 100 messages / month</li>
                  <li>✓ Basic chatbot access</li>
                  <li>✓ Personal API key</li>
                  <li>✓ Basic support</li>
                </ul>
              </div>

              {/* Pro */}
              <div className="rounded-xl border-2 border-black p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">Pro</h3>

                    <p className="mt-1 text-sm text-gray-500">
                      For regular users and developers.
                    </p>
                  </div>

                  <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                    Upgrade
                  </span>
                </div>

                <div className="mt-5">
                  <span className="text-2xl font-semibold">
                    $15
                  </span>

                  <span className="text-sm text-gray-500">
                    /month
                  </span>
                </div>

                <ul className="mt-5 space-y-3 text-sm text-gray-600">
                  <li>✓ 10,000 messages / month</li>
                  <li>✓ Advanced chatbot models</li>
                  <li>✓ Higher API limits</li>
                  <li>✓ Priority support</li>
                </ul>

                <button
                  className="mt-6 w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
                  onClick={() => {
                    // TODO: Connect Stripe/payment checkout
                    console.log("Upgrade to Pro");
                  }}
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </section>

          {/* ================= ACCOUNT ACTIONS ================= */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="font-semibold">Account</h2>

              <p className="mt-1 text-sm text-gray-500">
                Manage your account session and data.
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {/* Logout */}
              <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium">
                    Log out
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Sign out from this account on this device.
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  Log out
                </button>
              </div>

              {/* Delete */}
              <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium text-red-600">
                    Delete account
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Permanently delete your account and associated
                    data.
                  </p>
                </div>

                <button
                  onClick={handleDeleteAccount}
                  className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete account
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="py-8 text-center text-xs text-gray-400">
          Chatbot Platform · Account Settings
        </div>
      </div>
    </main>
  );
}
