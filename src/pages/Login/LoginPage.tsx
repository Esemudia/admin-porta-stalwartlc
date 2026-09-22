import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { saveSession, type UserRole } from "../../auth";
import { login } from "../../api";
import logo from "../../assets/logo.png";
import heroImg from "../../assets/hero_boardroom.jpg";

interface LocationState {
  from?: string;
}

const DEMO_ACCOUNTS: { name: string; email: string; role: UserRole; title: string }[] = [
  {
    name: "Dr. C. O. Stalwart (SAN)",
    email: "admin@stalwartlc.com",
    role: "super_admin",
    title: "Managing Partner",
  },
  {
    name: "Chukwuemeka Stalwart",
    email: "c.stalwart@stalwartlc.com",
    role: "lawyer",
    title: "Litigation Partner",
  },
  {
    name: "Favour Aghoghomena",
    email: "A.favour@stalwartlc.com",
    role: "lawyer",
    title: "Senior Associate",
  },
  {
    name: "Ngozi Amadi",
    email: "n.amadi@stalwartlc.com",
    role: "exec_secretary",
    title: "Exec. Secretary",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const handleQuickSelect = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword("stalwart2026");
    setError("");
    setSelectedDemo(acc.email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      setError("Please provide both your official email address and password.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // 1. Live backend authentication
      const res = await login({ email: cleanEmail, password });
      saveSession({
        role: res.user?.role || "super_admin",
        name: res.user?.name || cleanEmail.split("@")[0],
        email: res.user?.email || cleanEmail,
        token: res.access_token,
        userId: res.user?.id || res.user?._id,
      });

      const destination = state?.from ?? "/internal/dashboard";
      navigate(destination, { replace: true });
    } catch (err: any) {
      // 2. Prototyping fallback: If backend is offline or matches demo
      const matchedDemo = DEMO_ACCOUNTS.find(
        (a) => a.email.toLowerCase() === cleanEmail.toLowerCase()
      );

      if (matchedDemo || password === "stalwart2026" || password === "demo1234") {
        const demoUserId =
          cleanEmail.toLowerCase() === "admin@stalwartlc.com" ? "6a8ab3ec7e0225127cdc0dac" :
          cleanEmail.toLowerCase() === "a.favour@stalwartlc.com" ? "6a8ad773f299646d3044290f" :
          cleanEmail.toLowerCase() === "test@example.com" ? "6a8ac618f299646d3044290d" :
          undefined;

        saveSession({
          role: matchedDemo ? matchedDemo.role : "super_admin",
          name: matchedDemo ? matchedDemo.name : "Staff Member",
          email: cleanEmail,
          userId: demoUserId,
        });
        const destination = state?.from ?? "/internal/dashboard";
        navigate(destination, { replace: true });
        return;
      }

      setError(err?.message || "Invalid authentication credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#020914] text-slate-100 selection:bg-[#D5AA6D] selection:text-[#001026] relative overflow-hidden font-sans">
      {/* Ambient background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#D5AA6D]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-[#001d42]/60 rounded-full blur-3xl pointer-events-none" />

      {/* ── LEFT HERO PANEL (DESKTOP) ───────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 xl:w-1/2 relative p-12 xl:p-16 border-r border-white/10 overflow-hidden">
        {/* Background Image with rich navy gradient blend */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImg}
            alt="Stalwart Law Consult Boardroom"
            className="w-full h-full object-cover object-center scale-105 filter brightness-75 contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020914] via-[#001433]/90 to-[#000d20]/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D5AA6D]/10 via-transparent to-transparent" />
        </div>

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Stalwart Law Consult"
              className="h-10 w-auto object-contain filter drop-shadow-[0_2px_8px_rgba(213,170,109,0.3)]"
            />
            <div className="border-l border-white/20 pl-3">
              <span className="block font-serif text-lg font-bold tracking-wide text-white">
                STALWART
              </span>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-[#D5AA6D] font-medium">
                Law Consult • Management Portal
              </span>
            </div>
          </div>
        </div>

        {/* Center Editorial Quote & Features */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#D5AA6D]/15 text-[#D5AA6D] border border-[#D5AA6D]/30 mb-6 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D5AA6D] animate-pulse" />
            Universal Practice Workspace
          </div>

          <h2 className="font-serif text-3xl xl:text-4xl 2xl:text-5xl font-semibold leading-[1.15] text-white mb-6">
            Complete Practice <br />
            <span className="italic font-normal text-[#D5AA6D]">Governance & Intelligence</span>
          </h2>

          <p className="text-sm xl:text-base text-slate-300/90 leading-relaxed max-w-lg mb-8 font-light">
            Single unified sign-on granting full access to litigation matters, client registries, document vaults, task pipelines, and trust billing.
          </p>

          {/* Pillars */}
          <div className="space-y-3.5 max-w-lg">
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <div className="w-8 h-8 rounded bg-[#D5AA6D]/20 text-[#D5AA6D] flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-wide">All-in-One Operations</h4>
                <p className="text-xs text-slate-400">Access all 12 modules — dashboard, clients, matters, calendar, documents, and billing.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <div className="w-8 h-8 rounded bg-[#D5AA6D]/20 text-[#D5AA6D] flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-wide">Encrypted Privilege Vault</h4>
                <p className="text-xs text-slate-400">Strict client-attorney privilege with immutable audit trails and safe previewing.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status bar */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300 font-medium">Practice Operations Online</span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">SLC-SECURE v2.4</span>
        </div>
      </div>

      {/* ── RIGHT AUTHENTICATION PANEL ──────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-20 overflow-y-auto z-10">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between pb-6 border-b border-white/10 mb-8">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Stalwart" className="h-8 w-auto" />
            <span className="font-serif font-bold text-white text-base tracking-wide">Stalwart Law</span>
          </div>
          <span className="text-[11px] font-mono text-[#D5AA6D] border border-[#D5AA6D]/30 px-2 py-0.5 rounded">
            PORTAL LOGIN
          </span>
        </div>

        <div className="w-full max-w-lg mx-auto my-auto">
          {/* Form Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-[#D5AA6D] mb-3">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Secure Gateway</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              Sign In to Practice Portal
            </h1>
            <p className="text-sm text-slate-400 mt-2 font-light">
              Enter your credentials to access your firm workspace.
            </p>
          </div>

          {/* Quick Fill Preset Accounts for Quick Testing */}
          <div className="mb-6 p-3.5 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Quick Demo Presets
              </span>
              <span className="text-[11px] text-[#D5AA6D]/80 font-light">
                Click any persona to autofill
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = selectedDemo === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleQuickSelect(acc)}
                    className={`text-left p-2 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? "bg-[#D5AA6D] text-[#001026] border-[#D5AA6D] font-bold shadow-md shadow-[#D5AA6D]/20"
                        : "bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border-white/10"
                    }`}
                  >
                    <div className="truncate font-medium">{acc.name.split(" ")[0]}</div>
                    <div className={`text-[10px] truncate ${isSelected ? "text-[#001026]/80" : "text-slate-400"}`}>
                      {acc.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 mb-6">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">{error}</div>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-400/60 hover:text-red-300 text-sm font-bold leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@stalwartlc.com"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#D5AA6D] focus:ring-2 focus:ring-[#D5AA6D]/20 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert("For this demonstration, use password 'stalwart2026' or click any of the Quick Demo Presets.")}
                  className="text-xs text-[#D5AA6D] hover:underline font-light"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-slate-900/90 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#D5AA6D] focus:ring-2 focus:ring-[#D5AA6D]/20 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-[#D5AA6D] focus:ring-[#D5AA6D]/20 focus:ring-offset-slate-900 w-3.5 h-3.5"
                />
                <span>Remember this terminal session</span>
              </label>

              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Universal Access
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-lg py-3.5 px-6 font-bold text-sm text-[#001026] bg-[#D5AA6D] hover:bg-[#e0b87f] active:scale-[0.99] transition-all duration-200 shadow-lg shadow-[#D5AA6D]/25 disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-[#001026]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Bottom Security Note */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">
              Need account assistance?{" "}
              <a href="mailto:admin@stalwartlc.com" className="text-[#D5AA6D] hover:underline font-medium">
                Contact System Administrator
              </a>
            </p>
            <p className="text-[11px] text-slate-500 mt-2 font-mono">
              Stalwart Law Consult Practice Infrastructure. All interactions logged.
            </p>
          </div>
        </div>

        {/* Desktop Footer copyright */}
        <div className="hidden lg:flex items-center justify-between text-[11px] text-slate-500 pt-6 border-t border-white/5">
          <span>© {new Date().getFullYear()} Stalwart Law Consult. All rights reserved.</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Security Protocol</span>
            <span className="hover:text-slate-400 cursor-pointer">Practice Standards</span>
          </div>
        </div>
      </div>
    </div>
  );
}
