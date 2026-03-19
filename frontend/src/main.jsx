import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "var(--surface)",
          color: "var(--text1)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          fontSize: "14px",
          fontFamily: "var(--font-body)",
        },
        success: { iconTheme: { primary: "var(--accent)", secondary: "var(--bg)" } },
        error:   { iconTheme: { primary: "#ff5b5b",       secondary: "#fff" } },
      }}
    />
  </StrictMode>
);
