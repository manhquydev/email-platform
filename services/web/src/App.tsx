import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { RealtimeProvider } from "./context/RealtimeContext";
import { LandingPage } from "./pages/LandingPage";
import { TermsOfService, PrivacyPolicy, AcceptableUse, GDPR } from "./pages/Legal";
import { Support, Contact } from "./pages/Support";
import { Sales } from "./pages/Sales";
import { SupportTicketDetailPage } from "./pages/SupportTicketDetailPage";
import { MainLayout } from "./layouts/MainLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { Loading } from "./components/Loading";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LazyMotionProvider } from "./components/LazyMotionProvider";
import { VersionCheck } from "./components/VersionCheck";
import { ErrorPage } from "./pages/ErrorPage";
import { ScrollToTop } from "./components/ScrollToTop";

// Lazy load public pages for better initial bundle size
const Features = lazy(() => import("./pages/Features").then(m => ({ default: m.Features })));
const API = lazy(() => import("./pages/API").then(m => ({ default: m.API })));
const Pricing = lazy(() => import("./pages/Pricing").then(m => ({ default: m.Pricing })));
const Docs = lazy(() => import("./pages/Docs").then(m => ({ default: m.Docs })));

// Lazy load auth pages
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then(m => ({ default: m.Register })));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail").then(m => ({ default: m.VerifyEmail })));
const MagicLinkVerify = lazy(() => import("./pages/MagicLinkVerify").then(m => ({ default: m.MagicLinkVerify })));
const AnonymousRegister = lazy(() => import("./pages/AnonymousRegister").then(m => ({ default: m.AnonymousRegister })));
const AnonymousLogin = lazy(() => import("./pages/AnonymousLogin").then(m => ({ default: m.AnonymousLogin })));
const SsoCallback = lazy(() => import("./pages/auth/SsoCallback").then(m => ({ default: m.SsoCallback })));

// Lazy load app pages
const InboxManager = lazy(() => import("./pages/InboxManager").then(m => ({ default: m.InboxManager })));
const FocusDashboard = lazy(() => import("./pages/FocusDashboard").then(m => ({ default: m.FocusDashboard })));
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Admin = lazy(() => import("./pages/Admin").then(m => ({ default: m.Admin })));
const Authenticator = lazy(() => import("./pages/Authenticator").then(m => ({ default: m.Authenticator })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const MyDomains = lazy(() => import("./pages/MyDomains").then(m => ({ default: m.MyDomains })));
const Forwarding = lazy(() => import("./pages/Forwarding").then(m => ({ default: m.Forwarding })));
const Plans = lazy(() => import("./pages/Plans").then(m => ({ default: m.Plans })));
const InboxViewer = lazy(() => import("./pages/InboxViewer").then(m => ({ default: m.InboxViewer })));
const EphemeralInbox = lazy(() => import("./pages/EphemeralInbox").then(m => ({ default: m.EphemeralInbox })));
const IdentitySuite = lazy(() => import("./pages/IdentitySuite").then(m => ({ default: m.IdentitySuite })));
const DeveloperPortal = lazy(() => import("./pages/DeveloperPortal").then(m => ({ default: m.DeveloperPortal })));

function App() {
  return (
    <ThemeProvider>
      <LazyMotionProvider>
      <AuthProvider>
        <RealtimeProvider>
          {/* ARIA live region for dynamic announcements */}
          <div
            id="aria-live-announcer"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          />
          {/* Skip to main content link for accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none"
          >
            Bỏ qua đến nội dung chính
          </a>
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
                    <Route path="/support/tickets/:id" element={<SupportTicketDetailPage />} />
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
                    <Route path="/anonymous" element={<AnonymousRegister />} />
                    <Route path="/anonymous/login" element={<AnonymousLogin />} />
                    <Route path="/auth/sso" element={<SsoCallback />} />
                  </Route>

                  {/* Classic Dashboard (Wireframe Implementation) */}
                  <Route path="/app" element={<Dashboard />} />
                  <Route path="/app/sent" element={<Dashboard />} />

                  {/* Inbox Manager */}
                  <Route path="/app/manager" element={<InboxManager />} />

                  {/* Legacy Focus Stream Dashboard */}
                  <Route path="/app/stream" element={<FocusDashboard />} />

                  {/* Public Ephemeral Inbox - No auth required */}
                  <Route path="/e/:token?" element={<EphemeralInbox />} />

                  {/* Public Inbox Viewer */}
                  <Route path="/inbox-viewer/:email?" element={<InboxViewer />} />

                  {/* Protected app routes */}
                  <Route element={<MainLayout />}>
                    <Route path="/admin/*" element={<Admin />} />
                    <Route path="/authenticator" element={<Authenticator />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/my-domains" element={<MyDomains />} />
                    <Route path="/forwarding" element={<Forwarding />} />
                    {/* Redirect /teams to /settings?tab=teams for consolidated navigation */}
                    <Route path="/teams" element={<Navigate to="/settings?tab=teams" replace />} />
                    <Route path="/plans" element={<Plans />} />
                    <Route path="/app/identity" element={<IdentitySuite />} />
                    <Route path="/app/developer" element={<DeveloperPortal />} />
                  </Route>

                  {/* Error Pages */}
                  <Route element={<PublicLayout />}>
                    <Route path="/403" element={<ErrorPage code={403} />} />
                    <Route path="/503" element={<ErrorPage code={503} />} />
                  </Route>

                  {/* 404 Fallback */}
                  <Route path="*" element={<ErrorPage code={404} />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
      </LazyMotionProvider>
    </ThemeProvider>
  );
}

export default App;
