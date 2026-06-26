import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, AuthGate, useAuth } from "./auth.jsx";

// This is a deliberately minimal placeholder for what's behind the
// login wall. Once the rest of PlayPulse (squads, sessions, drills,
// etc.) is wired up to Supabase, this is where that real app mounts —
// for now, it's just enough to prove sign-in actually works end to end.
function SignedInPlaceholder() {
  const { coach, isAdmin, signOut } = useAuth();

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 32, fontWeight: 700, color: "var(--turf)" }}>
        PlayPulse
      </div>
      <div style={{ fontSize: 15, color: "var(--chalk)" }}>
        You're signed in as <strong>{coach ? coach.name : "an Admin"}</strong>
        {isAdmin && <span style={{ color: "var(--amber)" }}> (Platform Admin)</span>}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        Login is working. The rest of the app connects here next.
      </div>
      <button
        onClick={signOut}
        style={{
          background: "transparent",
          border: "1px solid var(--border-2)",
          color: "var(--chalk)",
          borderRadius: 8,
          padding: "10px 18px",
          fontSize: 13.5,
          fontWeight: 500,
          marginTop: 8,
        }}
      >
        Sign out
      </button>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <SignedInPlaceholder />
      </AuthGate>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
