import { useState } from "react";
import { Form, useActionData, useNavigation, Link } from "react-router";
import { useSignIn } from "@clerk/react-router";
import { Lock, XCircle, Loader2 } from 'lucide-react';
import type { Route } from "./+types/route";

interface ActionData {
  error?: string;
  success?: boolean;
}

export async function action({ request }: any) {
  // フォームデータの処理はクライアントサイドで行う
  return { success: true };
}

export const meta: Route.MetaFunction = ({ data }) => {
  return [
    { title: "Login" },
  ];
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { signIn, setActive } = useSignIn();
  const navigation = useNavigation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (!signIn) {
        throw new Error("Sign-in functionality is not available");
      }

      // Execute email/password login with Clerk
      const result = await signIn.create({
        identifier: email.trim(),
        password: password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Redirect is handled by root.tsx loader
        window.location.href = "/";
      } else {
        // If additional authentication steps are required
        console.log("Additional authentication required:", result);
        setError("Additional steps required to complete login");
      }
    } catch (err: any) {
      console.error("Login error:", err);

      // Convert Clerk error messages to English
      let errorMessage = "Login failed";

      if (err.errors && err.errors[0]) {
        const clerkError = err.errors[0];
        if (clerkError.code === "form_identifier_not_found") {
          errorMessage = "This email address is not registered";
        } else if (clerkError.code === "form_password_incorrect") {
          errorMessage = "Incorrect password";
        } else if (clerkError.code === "form_identifier_exists") {
          errorMessage = "This email address is already in use";
        } else {
          errorMessage = clerkError.message || errorMessage;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please log in to access your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="your@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                  Signing in...
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Create Account
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
