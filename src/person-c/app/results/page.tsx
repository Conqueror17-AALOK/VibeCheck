"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { VibeCheckData, VibeCheckElement } from "@vibecheck/shared";

type Detail = {
  id: string;
  type: string;
  status: "matched" | "missing" | "unexpected" | "mismatched";
  mismatches: { message: string; severity: "warning" | "error" }[];
};
type Result = {
  expected: VibeCheckData;
  actual: VibeCheckData;
  diff: { score: number; summary: string; matchedCount: number; mismatchCount: number; details: Detail[] };
  prompt: string;
  code: string;
};
const RESULT_KEY = "vibecheck-result";

function LoginPreview({ data, label }: { data: VibeCheckData; label: string }) {
  const element = (id: string) => data.elements.find((item) => item.id === id) as VibeCheckElement;
  const heading = element("login_heading");
  const email = element("email_input");
  const password = element("password_input");
  const button = element("submit_button");
  const css = (item: VibeCheckElement) => ({
    color: item.style?.color,
    backgroundColor: item.style?.background_color,
    borderRadius: item.style?.border_radius,
    fontSize: item.style?.font_size,
    fontWeight: item.style?.font_weight,
    padding: item.style?.padding,
  });

  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3"><span className="text-sm font-semibold text-slate-800">{label}</span><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /></div>
    <div className="bg-slate-50 p-6">
      <div className="mx-auto max-w-xs rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 style={css(heading)} className="mb-6 leading-tight">{heading.text}</h3>
        <input readOnly aria-label="Email address" placeholder={email.text} style={css(email)} className="mb-3 w-full border border-slate-200 outline-none placeholder:opacity-100" />
        <input readOnly aria-label="Password" placeholder={password.text} style={css(password)} type="password" className="mb-5 w-full border border-slate-200 outline-none placeholder:opacity-100" />
        <button type="button" style={css(button)} className="w-full shadow-sm transition">{button.text}</button>
      </div>
    </div>
  </article>;
}

export default function ResultsPage() {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(RESULT_KEY);
    if (!saved) return;
    try { setResult(JSON.parse(saved) as Result); } catch { sessionStorage.removeItem(RESULT_KEY); }
  }, []);

  function clearAndReturn() {
    sessionStorage.removeItem(RESULT_KEY);
    window.location.assign("/");
  }

  if (!result) return <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-white">
    <div className="max-w-md"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-2xl">✓</div><h1 className="mt-6 text-3xl font-bold">No VibeCheck yet</h1><p className="mt-3 text-slate-400">Run a comparison first and your visual report will appear here.</p><Link href="/" className="mt-7 inline-block rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Start a VibeCheck</Link></div>
  </main>;

  const mismatch = result.diff.details.find((detail) => detail.id === "submit_button");
  const matched = result.diff.details.filter((detail) => detail.status === "matched");

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/" className="flex items-center gap-3 font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white">✓</span>VibeCheck</Link><button onClick={clearAndReturn} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Run another check</button></div></header>
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <section className="mb-10 grid gap-6 rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:grid-cols-[1fr_auto] sm:items-center sm:p-9">
        <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">VibeCheck complete</p><h1 className="mt-2 text-3xl font-bold">Almost there — one detail needs attention.</h1><p className="mt-3 max-w-2xl text-slate-300">{result.diff.summary}</p></div>
        <div className="rounded-2xl bg-white/10 px-7 py-5 text-center ring-1 ring-white/10"><div className="text-5xl font-bold text-cyan-300">{result.diff.score}%</div><div className="mt-1 text-sm text-slate-300">visual match score</div></div>
      </section>

      <section><div className="mb-5 flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">The visual comparison</p><h2 className="mt-1 text-2xl font-bold">Expected vs. what shipped</h2></div><span className="hidden rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700 sm:block">1 mismatch found</span></div>
        <div className="grid gap-6 lg:grid-cols-2"><LoginPreview data={result.expected} label="Expected design" /><LoginPreview data={result.actual} label="Actual extraction" /></div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6"><div className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-500 font-bold text-white">!</span><div><p className="font-bold text-rose-950">Submit button color mismatch</p><p className="mt-2 leading-6 text-rose-900">The expected button uses <code className="rounded bg-white px-1.5 py-0.5 font-semibold">#2563EB</code> blue, but the shipped version uses <code className="rounded bg-white px-1.5 py-0.5 font-semibold">#DC2626</code> red. Update the button background to restore the intended primary action.</p>{mismatch?.mismatches[0] && <p className="mt-3 text-sm text-rose-700">{mismatch.mismatches[0].message}</p>}</div></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">What matched</h2><p className="mt-1 text-sm text-slate-500">{result.diff.matchedCount} elements align with the design.</p><ul className="mt-4 space-y-3">{matched.map((detail) => <li key={detail.id} className="flex items-center gap-3 text-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700">✓</span><span className="font-medium capitalize">{detail.id.replaceAll("_", " ")}</span><span className="ml-auto text-slate-400">{detail.type}</span></li>)}</ul></div>
      </section>
      {result.prompt && <p className="mt-8 text-center text-xs text-slate-400">Checked: “{result.prompt}”</p>}
    </div>
  </main>;
}
