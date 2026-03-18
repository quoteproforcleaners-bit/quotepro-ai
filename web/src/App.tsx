import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { SubscriptionProvider } from "./lib/subscription";
import { ThemeProvider } from "./lib/theme";
import { WalkthroughProvider } from "./lib/walkthrough";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProGate } from "./components/ProGate";
import { Layout } from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PaywallPage from "./pages/PaywallPage";
import PricingPage from "./pages/PricingPage";
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
import LeadCapturePage from "./pages/LeadCapturePage";
import LeadFinderPage from "./pages/LeadFinderPage";
import LeadFinderDetailPage from "./pages/LeadFinderDetailPage";
import LeadFinderSettingsPage from "./pages/LeadFinderSettingsPage";
import RevenuePage from "./pages/RevenuePage";
import ClosingAssistantPage from "./pages/ClosingAssistantPage";
import CommercialQuotePage from "./pages/CommercialQuotePage";
import ReactivationPage from "./pages/ReactivationPage";
import AutomationsHubPage from "./pages/AutomationsHubPage";
import SalesStrategyPage from "./pages/SalesStrategyPage";
import WeeklyRecapPage from "./pages/WeeklyRecapPage";
import TasksQueuePage from "./pages/TasksQueuePage";
import ReviewsReferralsPage from "./pages/ReviewsReferralsPage";
import QBOSettingsPage from "./pages/QBOSettingsPage";
import JobberPage from "./pages/JobberPage";
import QuotePreferencesPage from "./pages/QuotePreferencesPage";
import ProSetupChecklistPage from "./pages/ProSetupChecklistPage";

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
    <ThemeProvider>
    <WalkthroughProvider>
    <SubscriptionProvider>
      <Routes>
        {/* Public marketing funnel — unauthenticated visitors land here */}
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
          }
        />
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
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/upgrade" element={<Navigate to="/pricing" replace />} />
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
          <Route path="/lead-capture" element={<ProGate feature="Lead Capture Link"><LeadCapturePage /></ProGate>} />
          <Route path="/lead-finder" element={<ProGate feature="Local Lead Finder"><LeadFinderPage /></ProGate>} />
          <Route path="/lead-finder/settings" element={<ProGate feature="Local Lead Finder"><LeadFinderSettingsPage /></ProGate>} />
          <Route path="/lead-finder/:id" element={<ProGate feature="Local Lead Finder"><LeadFinderDetailPage /></ProGate>} />
          <Route path="/revenue" element={<ProGate feature="Revenue Intelligence"><RevenuePage /></ProGate>} />
          <Route path="/closing-assistant" element={<ClosingAssistantPage />} />
          <Route path="/commercial-quote" element={<ProGate feature="Commercial Quoting"><CommercialQuotePage /></ProGate>} />
          <Route path="/reactivation" element={<ProGate feature="Reactivation Campaigns"><ReactivationPage /></ProGate>} />
          <Route path="/automations" element={<ProGate feature="Automations"><AutomationsHubPage /></ProGate>} />
          <Route path="/sales-strategy" element={<ProGate feature="Sales Strategy"><SalesStrategyPage /></ProGate>} />
          <Route path="/weekly-recap" element={<ProGate feature="Weekly Recap"><WeeklyRecapPage /></ProGate>} />
          <Route path="/tasks-queue" element={<ProGate feature="Growth Tasks"><TasksQueuePage /></ProGate>} />
          <Route path="/reviews-referrals" element={<ProGate feature="Reviews &amp; Referrals"><ReviewsReferralsPage /></ProGate>} />
          <Route path="/qbo-settings" element={<ProGate feature="QuickBooks Integration"><QBOSettingsPage /></ProGate>} />
          <Route path="/jobber" element={<ProGate feature="Jobber Integration"><JobberPage /></ProGate>} />
          <Route path="/quote-preferences" element={<QuotePreferencesPage />} />
          <Route path="/pro-setup" element={<ProSetupChecklistPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Public intake form — no auth required */}
        <Route path="/intake/:businessId" element={<IntakePage />} />

        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
      </Routes>
    </SubscriptionProvider>
    </WalkthroughProvider>
    </ThemeProvider>
  );
}
