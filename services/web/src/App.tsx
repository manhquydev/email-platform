import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LandingPage } from "./pages/LandingPage";
import { Features } from "./pages/Features";
import { API } from "./pages/API";
import { Pricing } from "./pages/Pricing";
import { Docs } from "./pages/Docs";
import { TermsOfService, PrivacyPolicy, AcceptableUse, GDPR } from "./pages/Legal";
import { Support, Contact, Sales } from "./pages/Support";
import { MainLayout } from "./layouts/MainLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { Loading } from "./components/Loading";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { VersionCheck } from "./components/VersionCheck";

// Lazy load pages
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then(m => ({ default: m.Register })));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail").then(m => ({ default: m.VerifyEmail })));
const MagicLinkVerify = lazy(() => import("./pages/MagicLinkVerify").then(m => ({ default: m.MagicLinkVerify })));
const InboxManager = lazy(() => import("./pages/InboxManager").then(m => ({ default: m.InboxManager })));
const FocusDashboard = lazy(() => import("./pages/FocusDashboard").then(m => ({ default: m.FocusDashboard })));
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Admin = lazy(() => import("./pages/Admin").then(m => ({ default: m.Admin })));
const Authenticator = lazy(() => import("./pages/Authenticator").then(m => ({ default: m.Authenticator })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const MyDomains = lazy(() => import("./pages/MyDomains").then(m => ({ default: m.MyDomains })));
const Forwarding = lazy(() => import("./pages/Forwarding").then(m => ({ default: m.Forwarding })));
const Plans = lazy(() => import("./pages/Plans").then(m => ({ default: m.Plans })));

import { ScrollToTop } from "./components/ScrollToTop";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" />
        <BrowserRouter>
          <ScrollToTop />
          <VersionCheck />
          <ErrorBoundary>
            <Suspense fallback={<Loading fullScreen />}>
              <Routes>
                {/* Public pages with shared nav + footer */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/api" element={<API />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/acceptable-use" element={<AcceptableUse />} />
                  <Route path="/gdpr" element={<GDPR />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/docs" element={<Docs />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/auth/magic-link/verify" element={<MagicLinkVerify />} />
                </Route>

                {/* Auth pages with minimal footer */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Route>

                {/* Classic Dashboard (Wireframe Implementation) */}
                <Route path="/app" element={<Dashboard />} />

                {/* Inbox Manager */}
                <Route path="/app/manager" element={<InboxManager />} />

                {/* Legacy Focus Stream Dashboard */}
                <Route path="/app/stream" element={<FocusDashboard />} />

                {/* Protected app routes */}
                <Route element={<MainLayout />}>
                  <Route path="/admin/*" element={<Admin />} />
                  <Route path="/authenticator" element={<Authenticator />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/my-domains" element={<MyDomains />} />
                  <Route path="/forwarding" element={<Forwarding />} />
                  <Route path="/plans" element={<Plans />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

