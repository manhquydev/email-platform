import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LandingPage } from "./pages/LandingPage";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { PublicSignup } from "./pages/PublicSignup";
import { VerifyEmail } from "./pages/VerifyEmail";
import PricingPage from "./pages/PricingPage";
import { TermsOfService, PrivacyPolicy, AcceptableUse } from "./pages/Legal";
import { DocumentationPage } from "./pages/DocumentationPage";
import SupportPage from "./pages/SupportPage";
import { MainLayout } from "./layouts/MainLayout";
import { Loading } from "./components/Loading";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy load heavy components
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Admin = lazy(() => import("./pages/Admin").then(m => ({ default: m.Admin })));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" />
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<Loading fullScreen />}>
              <Routes>
                {/* Public marketing page */}
                <Route path="/" element={<LandingPage />} />

                {/* Documentation */}
                <Route path="/docs/*" element={<DocumentationPage />} />

                {/* Support */}
                <Route path="/support" element={<SupportPage />} />

                {/* Auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/signup" element={<PublicSignup />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Pricing page */}
                <Route path="/pricing" element={<PricingPage />} />

                {/* Legal pages */}
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/acceptable-use" element={<AcceptableUse />} />

                {/* Protected app routes */}
                <Route element={<MainLayout />}>
                  <Route path="/app" element={<Dashboard />} />
                  <Route path="/admin" element={<Admin />} />
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
