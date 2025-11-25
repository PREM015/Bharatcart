/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock } from "lucide-react";

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, mode: "login" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (typeof window !== "undefined") {
        (window as any).authToken = data.token;
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-md w-full mx-auto"
    >
      <div className="bg-white shadow-lg p-8 rounded-2xl border border-gray-200">
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-900">
          Welcome Back 👋
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Log in to continue
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email/Phone */}
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Email or Phone Number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none shadow-sm"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none shadow-sm"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md text-center">
              {error}
            </p>
          )}

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </motion.button>
        </form>

        {/* Links */}
        <div className="mt-6 flex justify-between text-sm text-gray-600">
          <Link
            href="/forgot-password"
            className="text-blue-600 hover:underline font-medium"
          >
            Forgot Password?
          </Link>
          <Link
            href="/register"
            className="text-blue-600 hover:underline font-medium"
          >
            Create Account
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
