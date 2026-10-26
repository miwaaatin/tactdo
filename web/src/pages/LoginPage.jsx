import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { Navigate } from "react-router-dom";
import { LOGIN, SIGNUP } from "../graphql";
import { useAuth } from "../useAuth";
import { Logo } from "../components/Background";

export default function LoginPage() {
  const { token, signIn } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [login, { loading: loggingIn }] = useMutation(LOGIN);
  const [signup, { loading: signingUp }] = useMutation(SIGNUP);
  const loading = loggingIn || signingUp;
  const isLogin = mode === "login";

  if (token) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await (isLogin ? login : signup)({
        variables: { email, password },
      });
      signIn(isLogin ? data.login : data.signup);
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <Logo className="mb-8 justify-center" />
        <section className="glass rounded-3xl p-8 sm:p-10">
          <h1 className="text-3xl font-semibold tracking-tight">
            {isLogin ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-2 text-slate-400">
            {isLogin
              ? "Sign in to manage your tasks."
              : "Start organising your day in seconds."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-300">Email</span>
              <input
                id="email-input"
                type="email"
                required
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-300">
                Password
              </span>
              <input
                id="password-input"
                type="password"
                required
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 animate-fade-up"
              >
                {error}
              </p>
            )}

            <button
              id="auth-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {isLogin ? "Sign in" : "Sign up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              id="auth-toggle"
              type="button"
              className="font-medium text-brand-300 hover:text-brand-400 cursor-pointer"
              onClick={() => {
                setMode(isLogin ? "signup" : "login");
                setError("");
              }}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
