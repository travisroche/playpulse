import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, AuthGate } from "./auth.jsx";
import PlayPulseApp from "./App.jsx";

function Root() {
  return (
    <AuthProvider>
      <AuthGate>
        <PlayPulseApp />
      </AuthGate>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
