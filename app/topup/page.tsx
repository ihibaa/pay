
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const networks = [
  { name: "Jazz", color: "bg-red-500" },
  { name: "Zong", color: "bg-green-600" },
  { name: "Telenor", color: "bg-sky-500" },
  { name: "Ufone", color: "bg-orange-500" },
];

const amounts = [100, 200, 300, 500, 1000, 2000];

export default function TopUpPage() {
  const [network, setNetwork] = useState("Jazz");
  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState(200);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleTopUp() {
    setError("");
    setMessage("");

    if (!/^03\d{9}$/.test(mobile)) {
      setError("Please enter a valid 11-digit Pakistani mobile number.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, network, amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Top-up failed.");
      }

      setMessage(data.message || "Top-up successful!");
      setMobile("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-700"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
            <Smartphone size={28} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Mobile Top-up
          </h1>

          <p className="mt-2 text-slate-500">
            Recharge any Pakistani mobile network securely.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-7">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Select Network
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {networks.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setNetwork(item.name)}
                  className={`rounded-xl border p-4 text-center font-semibold transition ${
                    network === item.name
                      ? "border-teal-600 bg-teal-50 text-teal-800"
                      : "border-slate-200 text-slate-600 hover:border-teal-300"
                  }`}
                >
                  <span
                    className={`mx-auto mb-2 block h-3 w-3 rounded-full ${item.color}`}
                  />
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-7">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Mobile Number
            </label>

            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="03XXXXXXXXX"
              maxLength={11}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="mb-7">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              Select Amount
            </h2>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {amounts.map((value) => (
                <button
                  key={value}
                  onClick={() => setAmount(value)}
                  className={`rounded-xl border py-3 text-sm font-semibold transition ${
                    amount === value
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-slate-200 text-slate-700 hover:border-teal-400"
                  }`}
                >
                  Rs. {value}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 rounded-2xl bg-slate-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">Network</span>
              <span className="font-semibold text-slate-800">{network}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Amount</span>
              <span className="text-xl font-bold text-teal-700">
                Rs. {amount.toLocaleString("en-PK")}
              </span>
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {message && (
            <p className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 size={18} />
              {message}
            </p>
          )}

          <button
            onClick={handleTopUp}
            disabled={loading}
            className="w-full rounded-xl bg-teal-700 py-4 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Processing..." : "Confirm Top-up"}
          </button>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={15} />
            Secure educational demo transaction
          </div>
        </div>
      </div>
    </main>
  );
}
