
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DashboardData = {
  stats: {
    totalUsers: number;
    totalTransactions: number;
    pendingKyc: number;
    totalFraudAlerts: number;
  };
  recentTransactions: {
    id: string;
    reference: string;
    amount: string;
    type: string;
    status: string;
    sender: { fullName: string; email: string };
  }[];
  recentAlerts: {
    id: string;
    riskScore: number;
    reason: string;
    status: string;
  }[];
  recentLogs: {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
  }[];
};

type KycApplication = {
  id: string;
  submittedAt: string;
  user: {
    fullName: string;
    email: string;
    phone: string;
  };
};

type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  wallet: {
    balance: string;
    currency: string;
  } | null;
  kyc: {
    status: string;
    submittedAt: string;
  } | null;
  _count: {
    sentTransactions: number;
    receivedTransactions: number;
  };
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [kycApplications, setKycApplications] = useState<KycApplication[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [userError, setUserError] = useState("");
  const [kycMessage, setKycMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState("");

  // Load all registered users
  async function loadUsers() {
    try {
      const response = await fetch("/api/admin/users");
      const result = await response.json();

      if (!response.ok) {
        setUserError(result.error || "Unable to load users.");
        return;
      }

      setUsers(result.users || []);
      setUserError("");
    } catch {
      setUserError("Unable to connect to user service.");
    }
  }

  // Load KYC applications
  async function loadKyc() {
    try {
      const response = await fetch("/api/admin/kyc");
      const result = await response.json();

      if (!response.ok) {
        setKycMessage(result.error || "Unable to load KYC.");
        return;
      }

      setKycApplications(result.applications || []);
      setKycMessage("");
    } catch {
      setKycMessage("Unable to connect to KYC service.");
    }
  }

  // Load dashboard statistics
  async function loadDashboard() {
    try {
      const response = await fetch("/api/admin/overview");
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to load dashboard.");
        return;
      }

      setData(result);
      setError("");
    } catch {
      setError("Server connection failed.");
    } finally {
      setLoading(false);
    }
  }

  // Approve or reject KYC
  async function reviewKyc(
    applicationId: string,
    status: "APPROVED" | "REJECTED"
  ) {
    let rejectionNote = "";

    if (status === "REJECTED") {
      rejectionNote = window.prompt("Enter rejection reason:") || "";

      if (!rejectionNote.trim()) return;
    }

    setReviewing(applicationId);
    setKycMessage("");

    try {
      const response = await fetch("/api/admin/kyc", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId,
          status,
          rejectionNote,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setKycMessage(result.error || "Unable to review application.");
        return;
      }

      setKycMessage(result.message);

      await Promise.all([
        loadKyc(),
        loadDashboard(),
        loadUsers(),
      ]);
    } catch {
      setKycMessage("Server connection failed.");
    } finally {
      setReviewing("");
    }
  }

  // Initial dashboard loading
  useEffect(() => {
    loadDashboard();
    loadKyc();
    loadUsers();
  }, []);

  // Search users
  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase().trim();

    return (
      user.fullName.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.phone.includes(search)
    );
  });

  // Dashboard statistic cards
  const cards = data
    ? [
        {
          title: "Total Users",
          value: data.stats.totalUsers,
          icon: "👥",
        },
        {
          title: "Transactions",
          value: data.stats.totalTransactions,
          icon: "💳",
        },
        {
          title: "Pending KYC",
          value: data.stats.pendingKyc,
          icon: "📋",
        },
        {
          title: "Fraud Alerts",
          value: data.stats.totalFraudAlerts,
          icon: "🛡️",
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-[#0b1220] p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <Link
          href="/"
          className="text-sm text-teal-400 hover:text-teal-300"
        >
          ← Back to PayNext
        </Link>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-teal-400">
              PAYNEXT / ADMIN PANEL
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-gray-400">
              Monitor platform activity and security.
            </p>
          </div>

          <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm text-teal-300">
            ● Admin Access
          </span>
        </div>

        {loading ? (
          <p className="mt-12 text-gray-400">
            Loading dashboard...
          </p>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
            {error}
          </div>
        ) : data ? (
          <>

            {/* Statistics */}
            <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-700 bg-[#111c2e] p-6"
                >
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-400">
                      {card.title}
                    </p>
                    <span>{card.icon}</span>
                  </div>

                  <h2 className="mt-4 text-3xl font-bold">
                    {card.value}
                  </h2>
                </div>
              ))}
            </section>

            {/* USER MANAGEMENT */}
            <section className="mt-8 rounded-2xl border border-slate-700 bg-[#111c2e] p-6">

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    User Management
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    View and monitor registered PayNext users.
                  </p>
                </div>

                <span className="rounded-full bg-teal-500/10 px-3 py-1 text-sm text-teal-300">
                  {users.length} Registered Users
                </span>
              </div>

              {/* Search Bar */}
              <div className="mt-6">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Search by name, email or phone..."
                  className="w-full rounded-xl border border-slate-700 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-teal-500"
                />
              </div>

              {userError && (
                <p className="mt-4 text-sm text-red-300">
                  {userError}
                </p>
              )}

              {/* Users Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">

                  <thead>
                    <tr className="border-b border-slate-700 text-gray-400">
                      <th className="px-4 py-4">User</th>
                      <th className="px-4 py-4">Role</th>
                      <th className="px-4 py-4">Wallet Balance</th>
                      <th className="px-4 py-4">KYC Status</th>
                      <th className="px-4 py-4">Transactions</th>
                      <th className="px-4 py-4">Joined</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          {users.length === 0
                            ? "No registered users found."
                            : "No users match your search."}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-slate-800 transition hover:bg-slate-800/40"
                        >

                          {/* User Details */}
                          <td className="px-4 py-4">
                            <p className="font-semibold">
                              {user.fullName}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              {user.email}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {user.phone}
                            </p>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs ${
                                user.role === "ADMIN"
                                  ? "bg-purple-500/10 text-purple-300"
                                  : "bg-blue-500/10 text-blue-300"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>

                          {/* Wallet */}
                          <td className="px-4 py-4 font-medium text-teal-300">
                            {user.wallet
                              ? `${user.wallet.currency} ${Number(
                                  user.wallet.balance
                                ).toLocaleString()}`
                              : "No wallet"}
                          </td>

                          {/* KYC */}
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs ${
                                user.kyc?.status === "APPROVED"
                                  ? "bg-teal-500/10 text-teal-300"
                                  : user.kyc?.status === "REJECTED"
                                  ? "bg-red-500/10 text-red-300"
                                  : user.kyc?.status === "PENDING"
                                  ? "bg-yellow-500/10 text-yellow-300"
                                  : "bg-slate-700 text-gray-300"
                              }`}
                            >
                              {user.kyc?.status || "NOT SUBMITTED"}
                            </span>
                          </td>

                          {/* Transaction Count */}
                          <td className="px-4 py-4 text-gray-300">
                            {user._count.sentTransactions +
                              user._count.receivedTransactions}
                          </td>

                          {/* Registration Date */}
                          <td className="px-4 py-4 text-xs text-gray-400">
                            {new Date(
                              user.createdAt
                            ).toLocaleDateString()}
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-gray-500">
                Showing {filteredUsers.length} of {users.length} users.
              </p>

            </section>

            {/* KYC MANAGEMENT */}
            <section className="mt-8 rounded-2xl border border-slate-700 bg-[#111c2e] p-6">

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    KYC Management
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    Review pending verification applications.
                  </p>
                </div>

                <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-sm text-yellow-300">
                  {kycApplications.length} Pending
                </span>
              </div>

              {kycMessage && (
                <p className="mt-4 text-sm text-teal-300">
                  {kycMessage}
                </p>
              )}

              <div className="mt-5 space-y-4">
                {kycApplications.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No pending KYC applications.
                  </p>
                ) : (
                  kycApplications.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-xl border border-slate-700 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">
                            {app.user.fullName}
                          </h3>

                          <p className="mt-1 text-sm text-gray-400">
                            {app.user.email}
                          </p>

                          <p className="text-sm text-gray-400">
                            {app.user.phone}
                          </p>

                          <p className="mt-2 text-xs text-gray-500">
                            Submitted:{" "}
                            {new Date(app.submittedAt).toLocaleString()}
                          </p>
                        </div>

                        <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-300">
                          PENDING
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          disabled={reviewing === app.id}
                          onClick={() => reviewKyc(app.id, "APPROVED")}
                          className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
                        >
                          {reviewing === app.id
                            ? "Processing..."
                            : "Approve"}
                        </button>

                        <button
                          disabled={reviewing === app.id}
                          onClick={() => reviewKyc(app.id, "REJECTED")}
                          className="rounded-lg bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </section>

            {/* TRANSACTIONS AND FRAUD ALERTS */}
            <section className="mt-8 grid gap-6 lg:grid-cols-2">

              {/* Recent Transactions */}
              <div className="rounded-2xl border border-slate-700 bg-[#111c2e] p-6">
                <h2 className="text-xl font-semibold">
                  Recent Transactions
                </h2>

                <div className="mt-5 space-y-4">
                  {data.recentTransactions.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      No transactions yet.
                    </p>
                  ) : (
                    data.recentTransactions.map((item) => (
                      <div
                        key={item.id}
                        className="border-b border-slate-700 pb-3"
                      >
                        <p className="font-medium">
                          {item.sender.fullName}
                        </p>

                        <p className="mt-1 text-sm text-gray-400">
                          {item.type} · PKR{" "}
                          {Number(item.amount).toLocaleString()}
                        </p>

                        <p className="text-xs text-teal-400">
                          {item.status}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Fraud Alerts */}
              <div className="rounded-2xl border border-slate-700 bg-[#111c2e] p-6">
                <h2 className="text-xl font-semibold">
                  Fraud Alerts
                </h2>

                <div className="mt-5 space-y-4">
                  {data.recentAlerts.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      No fraud alerts found.
                    </p>
                  ) : (
                    data.recentAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="border-b border-slate-700 pb-3"
                      >
                        <p className="font-medium text-red-300">
                          Risk Score: {alert.riskScore}
                        </p>

                        <p className="mt-1 text-sm text-gray-400">
                          {alert.reason}
                        </p>

                        <p className="text-xs text-teal-400">
                          {alert.status}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </section>

            {/* SECURITY LOGS */}
            <section className="mt-8 rounded-2xl border border-slate-700 bg-[#111c2e] p-6">

              <h2 className="text-xl font-semibold">
                Security Activity Logs
              </h2>

              <div className="mt-5 space-y-4">
                {data.recentLogs.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No security logs found.
                  </p>
                ) : (
                  data.recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border-b border-slate-700 pb-3"
                    >
                      <p className="font-medium">
                        {log.action}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        {log.details || "No additional details"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

            </section>

          </>
        ) : null}

      </div>
    </main>
  );
}
