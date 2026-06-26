import React, { useState, useEffect, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

/* =====================================================================
   SUPABASE CLIENT — placeholder config
   =====================================================================
   Swap these two values for your real project's URL and anon key once
   the Supabase project exists (Project Settings → API in the Supabase
   dashboard). Nothing else in this file needs to change when you do —
   every screen below talks to `supabase`, not to these constants
   directly.
   ===================================================================== */

const SUPABASE_URL = "https://hmsdtkqebhbqpzncjbov.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Mio9qwMSOwwkgm03_AGUvA_QuWDYngZ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/* =====================================================================
   AUTH CONTEXT — tracks the logged-in coach across the whole app
   =====================================================================
   Wrap the app in <AuthProvider>. Anything inside can call
   useAuth() to read the current session and coach profile, or to
   sign out. This is the seam where the rest of PlayPulse plugs in:
   once `coach` is non-null, the real app renders; until then, the
   screens in this file do.
   ===================================================================== */

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [coach, setCoach] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadCoachProfile(userId) {
    // A coach row and a platform_admins row are mutually exclusive —
    // check both, since an Admin account may not have a coaches row.
    const [{ data: coachRow }, { data: adminRow }] = await Promise.all([
      supabase.from("coaches").select("*").eq("id", userId).maybeSingle(),
      supabase.from("platform_admins").select("*").eq("id", userId).maybeSingle(),
    ]);
    setCoach(coachRow || null);
    setIsAdmin(!!adminRow);
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      if (session?.user) {
        loadCoachProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadCoachProfile(session.user.id);
      } else {
        setCoach(null);
        setIsAdmin(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCoach(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ session, coach, isAdmin, loading, signOut, refreshCoach: () => session?.user && loadCoachProfile(session.user.id) }}>
      {children}
    </AuthContext.Provider>
  );
}


/* =====================================================================
   AUTH GATE — the top-level switch between "logged out" and "the app"
   =====================================================================
   Drop this where the rest of PlayPulse currently starts rendering
   (where TeamGate / MainApp live today). While logged out, this shows
   sign-in, sign-up, or forgot-password. Once logged in with a coach
   or admin profile loaded, it renders whatever you pass as children.
   ===================================================================== */

export function AuthGate({ children }) {
  const { session, coach, isAdmin, loading } = useAuth();
  const [screen, setScreen] = useState("signin"); // signin | signup | forgot

  if (loading) {
    return (
      <div style={S.authWrap}>
        <div style={S.loadingMark}>PlayPulse</div>
      </div>
    );
  }

  if (!session) {
    if (screen === "signup") return <SignUpScreen onBackToSignIn={() => setScreen("signin")} />;
    if (screen === "forgot") return <ForgotPasswordScreen onBackToSignIn={() => setScreen("signin")} />;
    return <SignInScreen onGoToSignUp={() => setScreen("signup")} onGoToForgot={() => setScreen("forgot")} />;
  }

  // Logged in, but no coach or admin profile exists for this account yet.
  // This shouldn't normally happen (profiles are created at invite time),
  // but it's a real state worth handling rather than showing a blank screen.
  if (!coach && !isAdmin) {
    return <NoProfileScreen />;
  }

  return children;
}


/* =====================================================================
   SIGN IN
   ===================================================================== */

function SignInScreen({ onGoToSignUp, onGoToForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "That email or password isn't right. Try again, or reset your password."
        : error.message);
    }
    // On success, AuthProvider's onAuthStateChange picks up the new
    // session automatically — no manual redirect needed here.
  };

  return (
    <div style={S.authWrap}>
      <div style={S.authCard}>
        <div style={S.authBrandRow}>
          <div style={S.authBrandMark}>PlayPulse</div>
          <div style={S.authBrandSub}>Sign in to your coaching dashboard</div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={S.fieldLabel}>Email</label>
          <div style={S.inputIconWrap}>
            <Mail size={15} color="var(--text-tertiary)" />
            <input
              style={S.inputBare}
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="coach@yourclub.com.au"
              autoFocus
            />
          </div>

          <label style={S.fieldLabel}>Password</label>
          <div style={S.inputIconWrap}>
            <Lock size={15} color="var(--text-tertiary)" />
            <input
              style={S.inputBare}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button type="button" style={S.inputIconBtn} onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {error && (
            <div style={S.authError}><AlertCircle size={13} /> {error}</div>
          )}

          <button type="submit" style={S.btnPrimaryFull} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={S.authLinkRow}>
          <button style={S.linkBtn} onClick={onGoToForgot}>Forgot your password?</button>
        </div>
        <div style={S.authDivider} />
        <div style={S.authFooterText}>
          New coach with an invite? <button style={S.linkBtn} onClick={onGoToSignUp}>Set up your account</button>
        </div>
      </div>
    </div>
  );
}


/* =====================================================================
   SIGN UP  (for a coach who's been invited and is setting a password
   for the first time)
   =====================================================================
   How a coach actually gets here in the real flow: an Owner or Admin
   adds them in the Coaches tab with their email. That triggers a
   Supabase invite email containing a secure link, which lands the
   coach here with a valid session already partially established —
   this screen's job is just to let them set their password and
   confirm their name. It is NOT a general public sign-up form; there's
   no "create a brand new account from scratch" path, intentionally,
   since every coach should be invited into a specific club rather than
   self-registering.
   ===================================================================== */

function SignUpScreen({ onBackToSignIn }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Enter your name."); return; }
    if (password.length < 8) { setError("Password needs to be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }

    setLoading(true);
    // This assumes the coach arrived via a Supabase invite link, which
    // already authenticates them — we're just attaching a password and
    // their display name to that existing, pending account.
    const { data, error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }
    // Fill in the display name on their coach profile row, which an
    // Owner/Admin will have already created with email + club + access
    // when they sent the invite.
    if (data?.user) {
      await supabase.from("coaches").update({ name: name.trim() }).eq("id", data.user.id);
    }
    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div style={S.authWrap}>
        <div style={S.authCard}>
          <div style={S.authSuccessIcon}><CheckCircle2 size={28} color="var(--turf)" /></div>
          <div style={S.authSuccessTitle}>You're all set</div>
          <div style={S.authSuccessBody}>Your account is ready. You can sign in with your email and new password from now on.</div>
          <button style={S.btnPrimaryFull} onClick={onBackToSignIn}>Go to sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.authWrap}>
      <div style={S.authCard}>
        <button style={S.authBackBtn} onClick={onBackToSignIn}><ArrowLeft size={14} /> Back to sign in</button>
        <div style={S.authBrandRow}>
          <div style={S.authBrandMark}>PlayPulse</div>
          <div style={S.authBrandSub}>Finish setting up your coach account</div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={S.fieldLabel}>Your name</label>
          <input
            style={S.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First and last name"
            autoFocus
          />

          <label style={S.fieldLabel}>Set a password</label>
          <div style={S.inputIconWrap}>
            <Lock size={15} color="var(--text-tertiary)" />
            <input
              style={S.inputBare}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <button type="button" style={S.inputIconBtn} onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <label style={S.fieldLabel}>Confirm password</label>
          <div style={S.inputIconWrap}>
            <Lock size={15} color="var(--text-tertiary)" />
            <input
              style={S.inputBare}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Same password again"
            />
          </div>

          {error && (
            <div style={S.authError}><AlertCircle size={13} /> {error}</div>
          )}

          <button type="submit" style={S.btnPrimaryFull} disabled={loading}>
            {loading ? "Setting up…" : "Set up my account"}
          </button>
        </form>
      </div>
    </div>
  );
}


/* =====================================================================
   FORGOT PASSWORD
   ===================================================================== */

function ForgotPasswordScreen({ onBackToSignIn }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Enter your email."); return; }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);

    // Deliberately show the same "check your email" message whether or
    // not the address is real — never reveal which emails have accounts.
    if (error) {
      setError("Something went wrong sending that email. Try again in a moment.");
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div style={S.authWrap}>
        <div style={S.authCard}>
          <div style={S.authSuccessIcon}><Mail size={28} color="var(--turf)" /></div>
          <div style={S.authSuccessTitle}>Check your email</div>
          <div style={S.authSuccessBody}>If an account exists for {email.trim()}, a password reset link is on its way.</div>
          <button style={S.btnPrimaryFull} onClick={onBackToSignIn}>Back to sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.authWrap}>
      <div style={S.authCard}>
        <button style={S.authBackBtn} onClick={onBackToSignIn}><ArrowLeft size={14} /> Back to sign in</button>
        <div style={S.authBrandRow}>
          <div style={S.authBrandMark}>PlayPulse</div>
          <div style={S.authBrandSub}>Reset your password</div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={S.fieldLabel}>Email</label>
          <div style={S.inputIconWrap}>
            <Mail size={15} color="var(--text-tertiary)" />
            <input
              style={S.inputBare}
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="coach@yourclub.com.au"
              autoFocus
            />
          </div>

          {error && (
            <div style={S.authError}><AlertCircle size={13} /> {error}</div>
          )}

          <button type="submit" style={S.btnPrimaryFull} disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
}


/* =====================================================================
   NO PROFILE  (logged in, but nobody set them up as a coach yet)
   ===================================================================== */

function NoProfileScreen() {
  const { signOut } = useAuth();
  return (
    <div style={S.authWrap}>
      <div style={S.authCard}>
        <div style={S.authSuccessIcon}><AlertCircle size={28} color="var(--amber)" /></div>
        <div style={S.authSuccessTitle}>No coach profile found</div>
        <div style={S.authSuccessBody}>
          Your login worked, but there's no coach profile linked to this account yet. Ask whoever manages your club's coaches in PlayPulse to add you, then try signing in again.
        </div>
        <button style={S.btnGhostFull} onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}


/* =====================================================================
   STYLES — matches the existing PlayPulse "pitch at night" theme
   ===================================================================== */

const S = {
  authWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--pitch)" },
  authCard: { width: "100%", maxWidth: 400, background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 14, padding: 32, position: "relative" },
  authBrandRow: { textAlign: "center", marginBottom: 28 },
  authBrandMark: { fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 32, letterSpacing: "0.01em", color: "var(--turf)", lineHeight: 1, marginBottom: 8 },
  authBrandSub: { fontSize: 13, color: "var(--text-secondary)" },
  authBackBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 12.5, fontWeight: 500, padding: 0, marginBottom: 16 },
  loadingMark: { fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 32, letterSpacing: "0.01em", color: "var(--turf)" },

  fieldLabel: { display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 500, marginTop: 14 },
  input: { width: "100%", background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 8, padding: "10px 12px", color: "var(--chalk)", fontSize: 13.5 },
  inputIconWrap: { display: "flex", alignItems: "center", gap: 8, background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 8, padding: "10px 12px" },
  inputBare: { flex: 1, background: "transparent", border: "none", color: "var(--chalk)", fontSize: 13.5, minWidth: 0 },
  inputIconBtn: { background: "transparent", border: "none", color: "var(--text-tertiary)", display: "flex", padding: 0, flexShrink: 0 },

  authError: { display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12.5, color: "var(--blood)", marginTop: 14, lineHeight: 1.4 },
  authLinkRow: { textAlign: "center", marginTop: 18 },
  authDivider: { height: 1, background: "var(--border-1)", margin: "20px 0" },
  authFooterText: { textAlign: "center", fontSize: 13, color: "var(--text-secondary)" },
  linkBtn: { background: "transparent", border: "none", color: "var(--turf)", fontSize: "inherit", fontWeight: 500, padding: 0, display: "inline" },

  authSuccessIcon: { display: "flex", justifyContent: "center", marginBottom: 14 },
  authSuccessTitle: { textAlign: "center", fontFamily: "Oswald, sans-serif", fontSize: 20, fontWeight: 600, marginBottom: 10 },
  authSuccessBody: { textAlign: "center", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 24 },

  btnPrimaryFull: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--turf)", color: "#08130A", border: "none", borderRadius: 8, padding: "12px 16px", fontSize: 14, fontWeight: 600, marginTop: 20, cursor: "pointer" },
  btnGhostFull: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", color: "var(--chalk)", border: "1px solid var(--border-2)", borderRadius: 8, padding: "12px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer" },
};
