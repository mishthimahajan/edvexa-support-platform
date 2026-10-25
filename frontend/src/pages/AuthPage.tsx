
import { useState, type FormEvent } from "react";
import { Headset, LoaderCircle } from "lucide-react";
import { api } from "../api/client";

type Props = {
  onAuthenticated: () => void;
};

export default function AuthPage({ onAuthenticated }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await api.post("/auth/register", {
          name: name.trim(),
          email: email.trim(),
          password,
        });
      }

      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const token = response.data?.token;

      if (!token) {
        throw new Error("Login succeeded without a token.");
      }

      localStorage.setItem("edvexa_token", token);
      onAuthenticated();
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err
          ? (
              err as {
                response?: {
                  data?: { error?: string; message?: string };
                };
              }
            ).response?.data?.error ??
            (
              err as {
                response?: {
                  data?: { message?: string };
                };
              }
            ).response?.data?.message
          : undefined;

      setError(
        message ||
          (err instanceof Error
            ? err.message
            : "Authentication failed. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <Headset size={32} />
          <span>Edvexa</span>
        </div>

        <p className="auth-eyebrow">CUSTOMER SUPPORT PLATFORM</p>

        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>

        <p className="auth-description">
          {isRegister
            ? "Create an account to start managing your support requests."
            : "Sign in to manage your support tickets and get help."}
        </p>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <label>
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </label>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? (
              <>
                <LoaderCircle className="spinner" size={18} />
                Please wait...
              </>
            ) : isRegister ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to Edvexa?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister ? "Sign in" : "Create an account"}
          </button>
        </p>
      </section>
    </main>
  );
}
