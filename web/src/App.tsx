import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { SubscriptionProvider } from "./lib/subscription";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProGate } from "./components/ProGate";
import { Layout } from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PaywallPage from "./pages/PaywallPage";
import DashboardPage from "./pages/DashboardPage";
import QuotesListPage from "./pages/QuotesListPage";
import QuoteDetailPage from "./pages/QuoteDetailPage";
import QuoteCreatePage from "./pages/QuoteCreatePage";
import CustomersListPage from "./pages/CustomersListPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import CustomerCreatePage from "./pages/CustomerCreatePage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import SettingsPage from "./pages/SettingsPage";
import FollowUpsPage from "./pages/FollowUpsPage";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import GrowthDashboardPage from "./pages/GrowthDashboardPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import WalkthroughAIPage from "./pages/WalkthroughAIPage";
import ToolkitPage from "./pages/ToolkitPage";
import IntakePage from "./pages/IntakePage";
import IntakeRequestsPage from "./pages/IntakeRequestsPage";
import LeadFinderPage from "./pages/LeadFinderPage";
import LeadFinderDetailPage from "./pages/LeadFinderDetailPage";
import LeadFinderSettingsPage from "./pages/LeadFinderSettingsPage";

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SubscriptionProvider>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <RegisterPage />
            )
          }
        />
        <Route path="/upgrade" element={
          isAuthenticated ? <PaywallPage /> : <Navigate to="/login" replace />
        } />
        <Route path="/subscription/success" element={
          isAuthenticated ? <PaywallPage /> : <Navigate to="/login" replace />
        } />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/quotes" element={<QuotesListPage />} />
          <Route path="/quotes/new" element={<QuoteCreatePage />} />
          <Route path="/quotes/:id" element={<QuoteDetailPage />} />
          <Route path="/customers" element={<ProGate feature="Customer Management"><CustomersListPage /></ProGate>} />
          <Route path="/customers/new" element={<ProGate feature="Customer Management"><CustomerCreatePage /></ProGate>} />
          <Route path="/customers/:id" element={<ProGate feature="Customer Management"><CustomerDetailPage /></ProGate>} />
          <Route path="/jobs" element={<ProGate feature="Job Management"><JobsPage /></ProGate>} />
          <Route path="/jobs/:id" element={<ProGate feature="Job Management"><JobDetailPage /></ProGate>} />
          <Route path="/growth" element={<ProGate feature="Growth Dashboard"><GrowthDashboardPage /></ProGate>} />
          <Route path="/follow-ups" element={<FollowUpsPage />} />
          <Route path="/opportunities" element={<ProGate feature="Opportunities"><OpportunitiesPage /></ProGate>} />
          <Route path="/ai-assistant" element={<ProGate feature="AI Sales Assistant"><AIAssistantPage /></ProGate>} />
          <Route path="/walkthrough-ai" element={<WalkthroughAIPage />} />
          <Route path="/toolkit" element={<ToolkitPage />} />
          <Route path="/intake-requests" element={<IntakeRequestsPage />} />
          <Route path="/lead-finder" element={<LeadFinderPage />} />
          <Route path="/lead-finder/settings" element={<LeadFinderSettingsPage />} />
          <Route path="/lead-finder/:id" element={<LeadFinderDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Public intake form — no auth required */}
        <Route path="/intake/:businessId" element={<IntakePage />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </SubscriptionProvider>
  );
}
