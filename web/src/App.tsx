import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { isLoggedIn } from "./lib/employeeApi";
import { applyLanguage } from "./lib/i18n";
import LanguagePickerModal from "./components/LanguagePickerModal";
import { I18nDebugOverlay } from "./components/I18nDebugOverlay";
import { SubscriptionProvider } from "./lib/subscription";
import { ThemeProvider } from "./lib/theme";
import { WalkthroughProvider } from "./lib/walkthrough";
import { WebAIConsentProvider } from "./lib/webAIConsent";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProGate } from "./components/ProGate";
import { Layout } from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PaywallPage from "./pages/PaywallPage";
import PricingPage from "./pages/PricingPage";
import PricingSuccessPage from "./pages/PricingSuccessPage";
import PricingCancelPage from "./pages/PricingCancelPage";
import DashboardPage from "./pages/DashboardPage";
import QuotesListPage from "./pages/QuotesListPage";
import QuoteDetailPage from "./pages/QuoteDetailPage";
import QuoteCreatePage from "./pages/QuoteCreatePage";
import CustomersListPage from "./pages/CustomersListPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import CustomerCreatePage from "./pages/CustomerCreatePage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import FollowUpsPage from "./pages/FollowUpsPage";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import GrowthDashboardPage from "./pages/GrowthDashboardPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import WalkthroughAIPage from "./pages/WalkthroughAIPage";
import ToolkitPage from "./pages/ToolkitPage";
import IntakePage from "./pages/IntakePage";
import LeadLinkPage from "./pages/LeadLinkPage";
import IntakeRequestsPage from "./pages/IntakeRequestsPage";
import LeadCapturePage from "./pages/LeadCapturePage";
import LeadFinderPage from "./pages/LeadFinderPage";
import LeadFinderDetailPage from "./pages/LeadFinderDetailPage";
import LeadFinderSettingsPage from "./pages/LeadFinderSettingsPage";
import RevenuePage from "./pages/RevenuePage";
import ClosingAssistantPage from "./pages/ClosingAssistantPage";
import CommercialQuotePage from "./pages/CommercialQuotePage";
import CommercialSettingsPage from "./pages/CommercialSettingsPage";
import CommercialCalculatorPage from "./pages/CommercialCalculatorPage";
import ResidentialCalculatorPage from "./pages/ResidentialCalculatorPage";
import ReactivationPage from "./pages/ReactivationPage";
import AutopilotPage from "./pages/AutopilotPage";
import AutomationsHubPage from "./pages/AutomationsHubPage";
import SalesStrategyPage from "./pages/SalesStrategyPage";
import WeeklyRecapPage from "./pages/WeeklyRecapPage";
import TasksQueuePage from "./pages/TasksQueuePage";
import ReviewsReferralsPage from "./pages/ReviewsReferralsPage";
import QBOSettingsPage from "./pages/QBOSettingsPage";
import QuotePreferencesPage from "./pages/QuotePreferencesPage";
import ProSetupChecklistPage from "./pages/ProSetupChecklistPage";
import AccountSettingsPage from "./pages/AccountSettingsPage";
import FileLibraryPage from "./pages/FileLibraryPage";
import EmailSequencesPage from "./pages/EmailSequencesPage";
import PricingLogicPage from "./pages/PricingLogicPage";
import EmployeesPage from "./pages/EmployeesPage";
import SchedulePublishPage from "./pages/SchedulePublishPage";
import ScheduleAckPage from "./pages/ScheduleAckPage";
import WinLossFeedbackPage from "./pages/WinLossFeedbackPage";
import WinLossPage from "./pages/WinLossPage";
import ReferralPage from "./pages/ReferralPage";
import LocationsPage from "./pages/LocationsPage";
import TipPage from "./pages/TipPage";
import OnboardingWizardPage from "./pages/OnboardingWizardPage";
import QuoteDoctorPage from "./pages/QuoteDoctorPage";
import JobCheckinPage from "./pages/JobCheckinPage";
import LeadPendingPage from "./pages/LeadPendingPage";
import QuoteBookingPage from "./pages/QuoteBookingPage";
import CustomerPortalPage from "./pages/CustomerPortalPage";
import PreferencesPage from "./pages/portal/PreferencesPage";
import ReschedulePage from "./pages/portal/ReschedulePage";
import EmployeeLogin from "./pages/employee/EmployeeLogin";
import EmployeeHome from "./pages/employee/EmployeeHome";
import EmployeeJobDetail from "./pages/employee/EmployeeJobDetail";
import EmployeeCheckin from "./pages/employee/EmployeeCheckin";
import EmployeeCheckout from "./pages/employee/EmployeeCheckout";
import EmployeeSchedule from "./pages/employee/EmployeeSchedule";
import EmployeeProfile from "./pages/employee/EmployeeProfile";
import FieldStatusPage from "./pages/FieldStatusPage";
import RecurringSchedulesPage from "./pages/RecurringSchedulesPage";
import StaffManagementPage from "./pages/StaffManagementPage";
import BookingWidgetPage from "./pages/BookingWidgetPage";
import NPSDashboardPage from "./pages/NPSDashboardPage";
import PhantomAccountsPage from "./pages/PhantomAccountsPage";
import WhatsNewModal from "./components/WhatsNewModal";
import FinancePage from "./pages/FinancePage";

function EmployeeGuard({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/employee/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, isLoading, business, needsOnboarding } = useAuth();

  useEffect(() => {
    const dbLang = (business as any)?.appLanguage;
    const languageSelected = (business as any)?.languageSelected;
    if (languageSelected && dbLang) {
      applyLanguage(dbLang);
    }
  }, [business]);

  // Employee portal uses PIN-based JWT — never wait for admin session check
  const isEmployeePath = window.location.pathname.startsWith("/employee");

  if (isLoading && !isEmployeePath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ThemeProvider>
    <WalkthroughProvider>
    <SubscriptionProvider>
    <WebAIConsentProvider>
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
        <Route path="/checkin/:token" element={<JobCheckinPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/upgrade" element={<Navigate to="/pricing" replace />} />
        <Route path="/pricing/success" element={
          isAuthenticated ? <PricingSuccessPage /> : <Navigate to="/login" replace />
        } />
        <Route path="/pricing/cancel" element={<PricingCancelPage />} />
        <Route path="/subscription/success" element={
          isAuthenticated ? <PaywallPage /> : <Navigate to="/login" replace />
        } />

        {/* Onboarding wizard — full-screen, outside Layout */}
        <Route
          path="/onboarding"
          element={
            isAuthenticated ? (
              !needsOnboarding ? <Navigate to="/dashboard" replace /> : <OnboardingWizardPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <DashboardPage />}
          />
          <Route path="/quotes" element={<QuotesListPage />} />
          <Route path="/quotes/new" element={<QuoteCreatePage />} />
          <Route path="/quotes/:id" element={<QuoteDetailPage />} />
          <Route path="/customers" element={<ProGate feature="Customer Management"><CustomersListPage /></ProGate>} />
          <Route path="/customers/new" element={<ProGate feature="Customer Management"><CustomerCreatePage /></ProGate>} />
          <Route path="/customers/:id" element={<ProGate feature="Customer Management"><CustomerDetailPage /></ProGate>} />
          <Route path="/jobs" element={<ProGate feature="Job Management"><JobsPage /></ProGate>} />
          <Route path="/jobs/:id" element={<ProGate feature="Job Management"><JobDetailPage /></ProGate>} />
          <Route path="/recurring-schedules" element={<RecurringSchedulesPage />} />
          <Route path="/staff" element={<StaffManagementPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/team" element={<FieldStatusPage />} />
          <Route path="/calendar" element={<ProGate feature="Job Management"><CalendarPage /></ProGate>} />
          <Route path="/schedule-publish" element={<SchedulePublishPage />} />
          <Route path="/growth" element={<ProGate feature="Growth Dashboard"><GrowthDashboardPage /></ProGate>} />
          <Route path="/follow-ups" element={<FollowUpsPage />} />
          <Route path="/opportunities" element={<ProGate feature="Opportunities"><OpportunitiesPage /></ProGate>} />
          <Route path="/ai-assistant" element={<ProGate feature="AI Sales Assistant"><AIAssistantPage /></ProGate>} />
          <Route path="/walkthrough-ai" element={<WalkthroughAIPage />} />
          <Route path="/toolkit" element={<ToolkitPage />} />
          <Route path="/intake-requests" element={<IntakeRequestsPage />} />
          <Route path="/lead-capture" element={<ProGate feature="Lead Capture Link"><LeadCapturePage /></ProGate>} />
          <Route path="/booking-widget" element={<BookingWidgetPage />} />
          <Route path="/nps-dashboard" element={<NPSDashboardPage />} />
          <Route path="/phantom-accounts" element={<PhantomAccountsPage />} />
          <Route path="/lead-finder" element={<ProGate feature="Local Lead Finder"><LeadFinderPage /></ProGate>} />
          <Route path="/lead-finder/settings" element={<ProGate feature="Local Lead Finder"><LeadFinderSettingsPage /></ProGate>} />
          <Route path="/lead-finder/:id" element={<ProGate feature="Local Lead Finder"><LeadFinderDetailPage /></ProGate>} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/revenue" element={<ProGate feature="Revenue Intelligence"><RevenuePage /></ProGate>} />
          <Route path="/quote-doctor" element={<QuoteDoctorPage />} />
          <Route path="/closing-assistant" element={<ClosingAssistantPage />} />
          <Route path="/commercial-quote" element={<ProGate feature="Commercial Quoting"><CommercialQuotePage /></ProGate>} />
          <Route path="/commercial-settings" element={<ProGate feature="Commercial Quoting"><CommercialSettingsPage /></ProGate>} />
          <Route path="/reactivation" element={<ProGate feature="Reactivation Campaigns"><ReactivationPage /></ProGate>} />
          <Route path="/win-loss" element={<ProGate feature="Win/Loss Analysis"><WinLossPage /></ProGate>} />
          <Route path="/referral" element={<ReferralPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/autopilot" element={<AutopilotPage />} />
          <Route path="/automations" element={<ProGate feature="Automations"><AutomationsHubPage /></ProGate>} />
          <Route path="/sales-strategy" element={<ProGate feature="Sales Strategy"><SalesStrategyPage /></ProGate>} />
          <Route path="/weekly-recap" element={<ProGate feature="Weekly Recap"><WeeklyRecapPage /></ProGate>} />
          <Route path="/tasks-queue" element={<ProGate feature="Growth Tasks"><TasksQueuePage /></ProGate>} />
          <Route path="/reviews-referrals" element={<ProGate feature="Reviews &amp; Referrals"><ReviewsReferralsPage /></ProGate>} />
          <Route path="/qbo-settings" element={<ProGate feature="QuickBooks Integration"><QBOSettingsPage /></ProGate>} />
          <Route path="/quote-preferences" element={<QuotePreferencesPage />} />
          <Route path="/pro-setup" element={<ProSetupChecklistPage />} />
          <Route path="/file-library" element={<FileLibraryPage />} />
          <Route path="/email-sequences" element={<EmailSequencesPage />} />
          <Route path="/pricing-logic" element={<PricingLogicPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/account-settings" element={<AccountSettingsPage />} />
        </Route>

        {/* Public commercial cleaning cost calculator — no auth required */}
        <Route path="/commercial-cleaning-calculator" element={<CommercialCalculatorPage />} />
        <Route path="/residential-cleaning-cost-calculator" element={<ResidentialCalculatorPage />} />

        {/* Public intake form — no auth required */}
        <Route path="/intake/:businessId" element={<IntakePage />} />

        {/* Lead Link microsite — slug-based branded quote request page */}
        <Route path="/request/:slug" element={<LeadLinkPage />} />
        <Route path="/request/:slug/pending" element={<LeadPendingPage />} />

        {/* Quote email booking — token-based slot confirmation */}
        <Route path="/book/:token" element={<QuoteBookingPage />} />

        {/* Public cleaner schedule acknowledgment page */}
        <Route path="/schedule-ack/:token" element={<ScheduleAckPage />} />

        {/* Public win/loss feedback page — customers rate why they didn't book */}
        <Route path="/feedback/:token" element={<WinLossFeedbackPage />} />

        {/* Public customer tip page */}
        <Route path="/tip/:token" element={<TipPage />} />

        {/* Public customer portal — no auth required */}
        <Route path="/home/:token" element={<CustomerPortalPage />} />
        <Route path="/home/:token/preferences" element={<PreferencesPage />} />
        <Route path="/home/:token/reschedule" element={<ReschedulePage />} />

        {/* Employee portal — separate auth (PIN-based JWT), no admin session required */}
        <Route path="/employee/login" element={<EmployeeLogin />} />
        <Route path="/employee/home" element={<EmployeeGuard><EmployeeHome /></EmployeeGuard>} />
        <Route path="/employee/jobs/:assignmentId" element={<EmployeeGuard><EmployeeJobDetail /></EmployeeGuard>} />
        <Route path="/employee/jobs/:assignmentId/checkin" element={<EmployeeGuard><EmployeeCheckin /></EmployeeGuard>} />
        <Route path="/employee/jobs/:assignmentId/checkout" element={<EmployeeGuard><EmployeeCheckout /></EmployeeGuard>} />
        <Route path="/employee/schedule" element={<EmployeeGuard><EmployeeSchedule /></EmployeeGuard>} />
        <Route path="/employee/profile" element={<EmployeeGuard><EmployeeProfile /></EmployeeGuard>} />
        <Route path="/employee" element={<Navigate to="/employee/login" replace />} />

        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
      </Routes>
      {isAuthenticated && <WhatsNewModal />}
      {isAuthenticated && <LanguagePickerModal />}
      {import.meta.env.DEV && <I18nDebugOverlay />}
    </WebAIConsentProvider>
    </SubscriptionProvider>
    </WalkthroughProvider>
    </ThemeProvider>
  );
}
