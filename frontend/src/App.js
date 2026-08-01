import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n";
import { AuthProvider } from "@/auth";
import Header from "@/components/Header";
import Dashboard from "@/pages/Dashboard";
import Sources from "@/pages/Sources";
import Timeline from "@/pages/Timeline";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App min-h-screen bg-[#050505] text-white">
            <Header />
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#0A0A0A",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 0,
                  color: "#F8FAFC",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                },
              }}
            />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
