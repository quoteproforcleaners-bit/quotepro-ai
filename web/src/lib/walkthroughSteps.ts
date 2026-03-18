import {
  Zap,
  LayoutDashboard,
  FileText,
  Inbox,
  Users,
  Settings,
  TrendingUp,
  Wand2,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  navigateTo?: string;
  ctaLabel?: string;
  ctaPath?: string;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "welcome",
    title: "Welcome to QuotePro!",
    description:
      "You're a few minutes away from your first professional cleaning quote. Let's take a quick look around so you know where everything is — this will only take a minute.",
    icon: Zap,
    iconColor: "#2563EB",
  },
  {
    id: "dashboard",
    title: "Your Home Base",
    description:
      "This is your Dashboard. It shows everything happening in your cleaning business at a glance — open quotes, follow-ups due, revenue totals, and what needs attention today.",
    icon: LayoutDashboard,
    iconColor: "#2563EB",
    navigateTo: "/dashboard",
  },
  {
    id: "quotes",
    title: "Create & Manage Quotes",
    description:
      "Build professional residential quotes in under 60 seconds. Pick your services, add-ons, and pricing tier — then send directly to the customer from here. Every quote is tracked automatically.",
    icon: FileText,
    iconColor: "#0891b2",
    navigateTo: "/quotes",
    ctaLabel: "New Quote",
    ctaPath: "/quotes/new",
  },
  {
    id: "intake",
    title: "Intake & Quote Requests",
    description:
      "Send customers a personalized intake link and they fill in their own job details. Those answers flow straight into a new quote — no phone tag, no back-and-forth, no guessing.",
    icon: Inbox,
    iconColor: "#7c3aed",
    navigateTo: "/intake-requests",
    ctaLabel: "View Intake",
    ctaPath: "/intake-requests",
  },
  {
    id: "customers",
    title: "Your Customer Records",
    description:
      "Every customer you quote or work with gets their own record. See their full history, add notes, re-quote in one click, and never lose track of a contact again.",
    icon: Users,
    iconColor: "#059669",
    navigateTo: "/customers",
    ctaLabel: "Add Customer",
    ctaPath: "/customers/new",
  },
  {
    id: "pricing",
    title: "Price Settings",
    description:
      "This is where your quote math lives. Set your hourly rates, service types, add-ons, and pricing tiers. Everything you configure here flows automatically into every quote you build.",
    icon: Settings,
    iconColor: "#d97706",
    navigateTo: "/settings",
    ctaLabel: "Open Settings",
    ctaPath: "/settings",
  },
  {
    id: "growth",
    title: "Follow-ups & Growth",
    description:
      "Never let a lead go cold. Track pending follow-ups, monitor your conversion rate, find revenue hiding in old quotes, and run reactivation campaigns — all from the Grow section.",
    icon: TrendingUp,
    iconColor: "#16a34a",
    navigateTo: "/follow-ups",
  },
  {
    id: "ai",
    title: "AI Tools That Save Time",
    description:
      "Speed up the hard parts. \"Quote from Notes\" turns a voice memo or walkthrough notes into a structured quote. The Sales Assistant drafts follow-up messages. The Objection Assistant handles pushback so you don't have to.",
    icon: Wand2,
    iconColor: "#7c3aed",
    navigateTo: "/walkthrough-ai",
    ctaLabel: "Try Quote from Notes",
    ctaPath: "/walkthrough-ai",
  },
  {
    id: "done",
    title: "You're All Set!",
    description:
      "Start with your first quote — it takes less than 60 seconds. Come back here anytime you want to explore a feature, and restart this tour from the sidebar whenever you need a refresher.",
    icon: CheckCircle,
    iconColor: "#16a34a",
    ctaLabel: "Create First Quote",
    ctaPath: "/quotes/new",
  },
];

export const TOTAL_STEPS = WALKTHROUGH_STEPS.length;
