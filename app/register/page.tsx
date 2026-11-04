
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  User,
  Mail,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-5">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">

        {/* Left Section */}
        <section className="hidden flex-col justify-between bg-[#10243b] p-10 text-white md:flex">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-500 p-3">
              <Wallet size={26} />
            </div>
            <h1 className="text-2xl font-bold">
              Pay<span className="text-teal-400">Next</span>
            </h1>
          </div>

          <div>
            <ShieldCheck size={48} className="mb-6 text-teal-400" />
            <h2 className="text-4xl font-bold leading-tight">
              Start Your
              <br />
              Secure Journey.
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              Create your PayNext account and experience a smarter way to manage digital payments.
            </p>
          </div>

          <p className="text-xs text-slate-400">
            © 2026 PayNext · Educational Project
          </p>
        </section>

        {/* Registration Form */}
        <section className="flex items-center justify-center p-8 py-12 sm:p-12">
          <div className="w-full max-w-md">

            <div className="mb-7">
              <div className="mb-4 inline-flex rounded-xl bg-teal-100 p-3 text-teal-700 md:hidden">
                <Wallet size={27} />
              </div>

              <p className="text-sm font-bold text-teal-600">
                JOIN PAYNEXT
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-800">
                Create Account
              </h2>

              <p className="mt-3 text-sm text-slate-500">
                Enter your details to get started.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">

              {/* Full Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-teal-500">
                  <User size={19} className="text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-teal-500">
                  <Mail size={19} className="text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone Number
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-teal-500">
                  <Phone size={19} className="text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03XXXXXXXXX"
                    required
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-teal-500">
                  <LockKeyhole size={19} className="text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {loading ? "Creating Account..." : "Create Account"}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-teal-600"
              >
                Sign In
              </Link>
            </p>

            <div className="mt-7 flex justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={16} className="text-teal-600" />
              PayNext Authentication
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}
