"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const RESULT_KEY = "vibecheck-result";

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("A crisp, modern login experience for a productivity app");
  const [code, setCode] = useState("<main class=\"login-card\">\n  <h1>Welcome back</h1>\n  <input placeholder=\"Email address\" />\n  <input type=\"password\" placeholder=\"Password\" />\n  <button>Sign in</button>\n</main>");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/vibecheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, code }),
      });
      if (!response.ok) throw new Error("We couldn't complete this VibeCheck.");
      const result = await response.json();
      sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
      router.push("/results");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100 sm:px-8 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg shadow-lg shadow-blue-500/30">✓</span>
            <span>VibeCheck</span>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300">Design QA, simplified</span>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1fr_0.78fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Visual fidelity, in minutes</p>
            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Did what shipped match the <span className="text-cyan-300">vibe</span>?</h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-400">Give us the intent and the UI code. VibeCheck turns the comparison into a clear, visual report your whole team can understand.</p>
            <div className="mt-8 flex gap-6 text-sm text-slate-400"><span>✦ Visual comparisons</span><span>✦ Actionable feedback</span></div>
          </div>

          <form onSubmit={runCheck} className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
            <div className="mb-6"><h2 className="text-xl font-bold">Start a VibeCheck</h2><p className="mt-1 text-sm text-slate-400">Your demo is ready to compare.</p></div>
            <label className="block text-sm font-medium text-slate-200">What should this UI feel like?
              <input value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20" placeholder="Describe the intended experience" required />
            </label>
            <label className="mt-5 block text-sm font-medium text-slate-200">Paste generated HTML or code
              <textarea value={code} onChange={(event) => setCode(event.target.value)} className="mt-2 min-h-44 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-slate-300 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20" placeholder="&lt;main&gt;...&lt;/main&gt;" required />
            </label>
            {error && <div role="alert" className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error} <button type="button" onClick={() => setError("")} className="ml-2 underline">Dismiss</button></div>}
            <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3.5 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70">
              {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" /> Checking the vibe…</> : <>Run VibeCheck <span>→</span></>}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
