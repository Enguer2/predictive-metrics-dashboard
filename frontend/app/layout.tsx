import type { Metadata } from "next";
import { Search, Bell, Settings } from "lucide-react";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Aero Watchman | Global Server Monitoring",
  description: "High-Altitude Observability & Predictive Analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

          :root {
            --primary:                  #006670;
            --surface:                  #f8fafb;
            --surface-container:        #f2f4f5;
            --surface-container-low:    #f1f5f9;
            --surface-container-lowest: #ffffff;
            --surface-container-high:   #e8edf0;
            --surface-container-highest:#dde3e6;
            --on-surface:               #3d494b;
            --on-surface-variant:       #6c797b;
            --secondary-container:      #e0f2fe;
            --on-secondary-container:   #0369a1;
            --error:                    #ba1a1a;
            --font-headline:            'Space Grotesk', sans-serif;
            --font-label:               'Inter', sans-serif;
          }

          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; }

          .material-symbols-outlined { font-family: 'Material Symbols Outlined'; }
          .material-symbols-outlined.fill-icon { font-variation-settings: 'FILL' 1; }
          .no-scrollbar::-webkit-scrollbar { display: none; }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
          }
          .animate-pulse { animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }

          @keyframes ping {
            75%, 100% { transform: scale(1.8); opacity: 0; }
          }
          .animate-ping { animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite; }
        `}</style>
      </head>
      <body style={{
        background: "var(--surface)",
        fontFamily: "Inter, sans-serif",
        color: "var(--on-surface)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* ── Fixed top header ─────────────────────────────────────────── */}
        <header style={{
          height: 64,
          background: "rgba(248,250,251,0.9)",
          backdropFilter: "blur(12px)",
          position: "fixed", top: 0, width: "100%", zIndex: 50,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0 24px",
          borderBottom: "1px solid #e2e8f0",
        }}>
          <div style={{ fontWeight: 800, color: "#155e75", fontSize: 20, fontFamily: "var(--font-headline)" }}>
            WATCHMAN PREDICTIVE
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          </div>
        </header>

        {/* ── Page content (Sidebar + main injected by page.tsx) ───────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}