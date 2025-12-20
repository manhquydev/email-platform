import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LandingPage } from "./pages/LandingPage";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { VerifyEmail } from "./pages/VerifyEmail";
import { TermsOfService, PrivacyPolicy, AcceptableUse } from "./pages/Legal";
import { MainLayout } from "./layouts/MainLayout";
import { Loading } from "./components/Loading";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { VersionCheck } from "./components/VersionCheck";

// Lazy load heavy components
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Admin = lazy(() => import("./pages/Admin").then(m => ({ default: m.Admin })));
const Authenticator = lazy(() => import("./pages/Authenticator").then(m => ({ default: m.Authenticator })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const MyDomains = lazy(() => import("./pages/MyDomains").then(m => ({ default: m.MyDomains })));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" />
        <BrowserRouter>
          <VersionCheck />
          <ErrorBoundary>
            <Suspense fallback={<Loading fullScreen />}>
              <Routes>
                {/* Public marketing page */}
                <Route path="/" element={<LandingPage />} />

                {/* Auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Legal pages */}
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/acceptable-use" element={<AcceptableUse />} />

                {/* Protected app routes */}
                <Route element={<MainLayout />}>
                  <Route path="/app" element={<Dashboard />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/authenticator" element={<Authenticator />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/my-domains" element={<MyDomains />} />
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
