import type { Metadata } from "next";
import { Search, Bell, Settings } from "lucide-react"; // Import des icônes pour le Header
import Sidebar from "@/components/Sidebar"; // Import de ta nouvelle Sidebar
import Footer from "@/components/Footer"; // Import de ton nouveau Footer

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
            --primary: #006670;
            --surface: #f8fafb;
            --surface-container: #f2f4f5;
            --on-surface: #3d494b;
            --on-surface-variant: #6c797b;
            --surface-container-low: #f1f5f9;
            --error: #ba1a1a;
            --font-headline: 'Space Grotesk', sans-serif;
            --font-label: 'Inter', sans-serif;
          }
          .material-symbols-outlined { font-family: 'Material Symbols Outlined'; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .material-symbols-outlined.fill-icon { font-variation-settings: 'FILL' 1; }
        `}</style>
      </head>
      <body style={{ margin: 0, background: "var(--surface)", fontFamily: "Inter, sans-serif", color: "var(--on-surface)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        
        {/* TOP NAVIGATION (Header) */}
        <header style={{ height: 64, background: "rgba(248,250,251,0.8)", backdropFilter: "blur(12px)", position: "fixed", top: 0, width: "100%", zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, color: "#155e75", fontSize: 20, fontFamily: "var(--font-headline)" }}>WATCHMAN_OS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <Search size={18} color="#64748b" />
              <Bell size={18} color="#64748b" />
              <Settings size={18} color="#64748b" />
            </div>
            <div style={{ height: 32, width: 32, borderRadius: "50%", background: "#e2e8f0" }} /> {/* Avatar fictif */}
          </div>
        </header>

        {/* STRUCTURE CENTRALE */}
        <div style={{ display: "flex", minHeight: "calc(100vh - 64px)", paddingTop: 64 }}>
          {/* SIDEBAR */}
          <Sidebar />

          {/* ZONE DE CONTENU PRINCIPAL + FOOTER */}
          <div style={{ marginLeft: 256, flex: 1, display: "flex", flexDirection: "column" }}>
            <main style={{ padding: 32, flex: 1 }}>
              {children}
            </main>
            {/* FOOTER */}
            <Footer />
          </div>
        </div>

      </body>
    </html>
  );
}