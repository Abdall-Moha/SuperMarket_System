import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSigningIn(true);

    try {
      const result = await login(email.trim(), password);

      if (result.ok === false) {
        setError(result.message);
        setIsSigningIn(false);
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      setError("Could not connect to the server.");
      setIsSigningIn(false);
    }
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#07111F] flex items-center justify-center p-4">
      <div className="w-full max-w-md min-w-0 bg-white rounded-xl shadow-2xl px-6 py-8 sm:px-10 sm:py-12">
        <h2 className="text-2xl font-semibold text-[#07111F]">Welcome back</h2>
        <p className="text-sm text-slate-500 mt-1">Sign in to continue</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={function (event) {
                  setEmail(event.target.value);
                }}
                placeholder="admin@hogaan.com"
                className="w-full min-w-0 rounded-md border border-slate-200 bg-white pl-10 pr-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={function (event) {
                  setPassword(event.target.value);
                }}
                placeholder="Enter your password"
                className="w-full min-w-0 rounded-md border border-slate-200 bg-white pl-10 pr-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full rounded-md bg-[#1B4F72] text-white py-3 text-base font-medium hover:bg-[#163E59] disabled:opacity-70"
          >
            {isSigningIn ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
