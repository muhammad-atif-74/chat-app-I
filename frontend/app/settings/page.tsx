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

  if (loading || !authUser) return <div className="flex min-h-screen items-center justify-center bg-white"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-teal-700" aria-label="Loading" /></div>;

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
    <main className="min-h-[100dvh] bg-slate-50 text-slate-900">
      <div className="flex min-h-[100dvh] w-full flex-col overflow-hidden bg-white">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-xs font-semibold text-white md:hidden">M</div><h1 className="truncate text-sm font-semibold tracking-tight text-slate-900">Settings</h1></div><div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800">{(authUser.name || authUser.email || "U").slice(0, 1).toUpperCase()}</div></header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-4 py-7 sm:px-12 lg:px-20">
        <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <p className="mt-1 text-sm text-zinc-500">
            Manage your profile, API access and account.
          </p>
          <Link href="/" className="shrink-0 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-800">Back to chat</Link>
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
                  className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-medium text-white hover:bg-teal-800"
                >
                  Copy
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Never share your API key publicly or commit it to
                source control.
              </p>

              <div className="mt-5 flex items-center gap-3">
                {/* <label htmlFor="plan" className="text-sm font-medium">Plan</label>
                <select id="plan" value={plan} onChange={(event) => setPlan(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select> */}
                <button type="button" onClick={handleSaveSettings} disabled={saving || !apiKey.trim()} className="ml-auto rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400">
                  {saving ? "Saving..." : "Save settings"}
                </button>
              </div>
              {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}

            
              <div className="mt-5">
                <a target="_blank" href="https://ai.google.dev/gemini-api/docs/api-key?utm_source=google&utm_medium=cpc&utm_campaign=Cloud-SS-DR-AIS-FY26-global-gsem-1713578&utm_content=text-ad&utm_term=KW_gemini%20api%20key&gad_source=1&gad_campaignid=23417416052&gbraid=0AAAAACn9t648lkvfse4G36SL1JwvpmS4v&gclid=CjwKCAjwoaLWBhAWEiwAnyitu4KKNnfl3UUtHMV7U2w8nktO3_mpmoxt6MoqrRRb7RimQa3ex9wHqRoCQUUQAvD_BwE">
                <button
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
                  >
                  Generate new key
                </button>
                  </a>
              </div>
            </div>
          </section>

          {/* ================= PLAN ================= */}
          <section className="rounded-2xl border border-gray-200 bg-white hidden">
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

                  <span className="rounded-full bg-teal-700 px-3 py-1 text-xs font-medium text-white">
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
              <div className="rounded-xl border-2 border-teal-700 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">Pro</h3>

                    <p className="mt-1 text-sm text-gray-500">
                      For regular users and developers.
                    </p>
                  </div>

                  <span className="rounded-full bg-teal-700 px-3 py-1 text-xs font-medium text-white">
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
                  className="mt-6 w-full rounded-lg bg-teal-700 px-4 py-3 text-sm font-medium text-white hover:bg-teal-800"
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
        <div className="py-8 text-center text-xs text-slate-400">
          My AI Chat · Account Settings
        </div>
      </div>
      </div>
      </div>
    </main>
  );
}
