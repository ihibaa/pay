"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BillPayments() {
  const router = useRouter();

  const [category, setCategory] = useState("ELECTRICITY");
  const [provider, setProvider] = useState("K-Electric");
  const [consumerNumber, setConsumerNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const providers: Record<string, string[]> = {
    ELECTRICITY: ["K-Electric", "LESCO", "IESCO"],
    GAS: ["Sui Southern Gas (SSGC)", "Sui Northern Gas (SNGPL)"],
    WATER: ["KWSB"],
  };

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!consumerNumber.trim() || !amount || Number(amount) <= 0) {
      setMessage("Please enter valid bill details.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/bill-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          provider,
          consumerNumber,
          amount: Number(amount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Payment failed.");
      } else {
        setMessage("Bill payment successful!");
        setConsumerNumber("");
        setAmount("");
        router.refresh();
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1220] p-6 text-white">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => router.push("/")}
          className="mb-8 text-sm text-teal-400 hover:text-teal-300"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold">Bill Payments</h1>
        <p className="mt-2 text-gray-400">
          Pay your utility bills securely with PayNext.
        </p>

        <form
          onSubmit={handlePayment}
          className="mt-8 space-y-6 rounded-2xl border border-slate-700 bg-[#111c2e] p-6"
        >
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Bill Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                const value = e.target.value;
                setCategory(value);
                setProvider(providers[value][0]);
              }}
              className="w-full rounded-lg border border-slate-600 bg-[#0b1220] p-3"
            >
              <option value="ELECTRICITY">Electricity</option>
              <option value="GAS">Gas</option>
              <option value="WATER">Water</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Service Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-[#0b1220] p-3"
            >
              {providers[category].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Consumer / Reference Number
            </label>
            <input
              value={consumerNumber}
              onChange={(e) => setConsumerNumber(e.target.value)}
              placeholder="Enter consumer number"
              className="w-full rounded-lg border border-slate-600 bg-[#0b1220] p-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Bill Amount (PKR)
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter bill amount"
              className="w-full rounded-lg border border-slate-600 bg-[#0b1220] p-3"
            />
          </div>

          {message && (
            <p className="rounded-lg bg-slate-800 p-3 text-sm text-teal-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-500 py-3 font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Pay Bill"}
          </button>

          <p className="text-center text-xs text-gray-500">
            Educational demo only. No real utility bill is paid.
          </p>
        </form>
      </div>
    </main>
  );
}