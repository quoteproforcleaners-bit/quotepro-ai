import { TourDefinition } from "@/context/TutorialContext";

export const DASHBOARD_TOUR: TourDefinition = {
  id: "dashboard_tour",
  name: "Dashboard Tour",
  triggerOnce: true,
  steps: [
    {
      id: "welcome",
      title: "Welcome to QuotePro!",
      description: "Let's take a quick look around so you know where everything is. This will only take a minute.",
      position: "center",
      icon: "star",
    },
    {
      id: "dashboard_overview",
      title: "Your Home Base",
      description: "This is your dashboard. It shows everything happening in your cleaning business at a glance - follow-ups, revenue, jobs, and more.",
      position: "top",
      icon: "home",
    },
    {
      id: "quick_actions",
      title: "Quick Actions",
      description: "Need to do something fast? Use these shortcuts to create a new quote, check follow-ups, view bookings, or draft a reply.",
      targetRef: "widget-quick-actions",
      position: "top",
      icon: "zap",
    },
    {
      id: "create_quote",
      title: "Create Your First Quote",
      description: "Tap the + button anytime to create a new cleaning quote. You can do residential or commercial - it only takes a minute.",
      targetRef: "fab-new-quote",
      position: "top",
      icon: "file-plus",
    },
    {
      id: "tabs_overview",
      title: "Navigate Your App",
      description: "Use the bottom tabs to jump between your Dashboard, Customers, Quotes, Jobs, Growth stats, and Settings.",
      position: "bottom",
      icon: "navigation",
    },
  ],
};

export const QUOTES_TOUR: TourDefinition = {
  id: "quotes_tour",
  name: "Quotes Tour",
  triggerOnce: true,
  steps: [
    {
      id: "quotes_intro",
      title: "Your Quotes",
      description: "This is where all your quotes live. You can filter by status (Draft, Sent, Accepted) and type (Residential or Commercial).",
      position: "center",
      icon: "file-text",
    },
    {
      id: "quote_filters",
      title: "Filter & Find",
      description: "Use the status filter at the top to quickly find what you need. The type filter below lets you separate residential and commercial quotes.",
      position: "top",
      icon: "filter",
    },
    {
      id: "quote_actions",
      title: "Tap to See Details",
      description: "Tap any quote card to see the full breakdown, send it to your customer, or export it as a PDF.",
      position: "center",
      icon: "eye",
    },
    {
      id: "quote_settings",
      title: "Customize Your Quote Settings",
      description: "Head over to Settings to set your hourly rates, service types, add-ons, and pricing tiers. Your quotes will use these rates automatically so every estimate is consistent.",
      position: "center",
      icon: "sliders",
    },
  ],
};

export const CUSTOMERS_TOUR: TourDefinition = {
  id: "customers_tour",
  name: "Customers Tour",
  triggerOnce: true,
  steps: [
    {
      id: "customers_intro",
      title: "Your Customer List",
      description: "Keep track of everyone you've quoted or worked with. Add contact info, notes, and see their full history in one place.",
      position: "center",
      icon: "users",
    },
    {
      id: "add_customer",
      title: "Add Customers",
      description: "Tap the + button to add a new customer. Their info will auto-fill when you create quotes for them later.",
      position: "top",
      icon: "user-plus",
    },
  ],
};

export const GROWTH_TOUR: TourDefinition = {
  id: "growth_tour",
  name: "Growth Tour",
  triggerOnce: true,
  steps: [
    {
      id: "growth_intro",
      title: "Grow Your Business",
      description: "Track your business performance with revenue stats, conversion rates, and smart recommendations to help you close more jobs.",
      position: "center",
      icon: "trending-up",
    },
    {
      id: "opportunities",
      title: "Find Opportunities",
      description: "Dormant customers and lost quotes are money on the table. We'll show you who to reach out to and help you win them back.",
      position: "center",
      icon: "target",
    },
  ],
};

export const COMMERCIAL_TOUR: TourDefinition = {
  id: "commercial_tour",
  name: "Commercial Quoting Tour",
  triggerOnce: true,
  steps: [
    {
      id: "commercial_intro",
      title: "Commercial Quoting",
      description: "You've enabled commercial quoting! This lets you create professional proposals for offices, retail spaces, gyms, and more.",
      position: "center",
      icon: "briefcase",
    },
    {
      id: "commercial_walkthrough",
      title: "Guided Walkthrough",
      description: "The commercial flow walks you through a 6-step site survey - from basics to floors, frequency, supplies, and notes.",
      position: "center",
      icon: "clipboard",
    },
    {
      id: "commercial_tiers",
      title: "Good / Better / Best",
      description: "Automatically build three pricing tiers to give your clients options. Customize names, tasks, and prices for each tier.",
      position: "center",
      icon: "layers",
    },
    {
      id: "commercial_proposal",
      title: "Professional Proposals",
      description: "Preview, export as PDF, and even attach your COI and W-9 documents. Use AI to generate scope descriptions and scan for pricing risks.",
      position: "center",
      icon: "file",
    },
  ],
};

export const SETTINGS_TOUR: TourDefinition = {
  id: "settings_tour",
  name: "Settings Tour",
  triggerOnce: true,
  steps: [
    {
      id: "settings_intro",
      title: "Your Settings",
      description: "This is where you customize everything about QuotePro - your business profile, pricing, notifications, and more.",
      position: "center",
      icon: "settings",
    },
    {
      id: "business_profile",
      title: "Business Profile",
      description: "Add your company name, logo, and branding so your quotes look professional when you send them to customers.",
      position: "center",
      icon: "briefcase",
    },
    {
      id: "quote_settings",
      title: "Quote Settings",
      description: "This is a big one! Set your hourly rates, service types, add-ons, and pricing tiers here. Everything you configure flows into your quotes automatically.",
      position: "center",
      icon: "sliders",
    },
    {
      id: "payment_options",
      title: "Payment Options",
      description: "Choose which payment methods you accept (cash, check, Venmo, Zelle, etc.) and they'll show up on your quotes and invoices.",
      position: "center",
      icon: "credit-card",
    },
    {
      id: "follow_up_settings",
      title: "Follow-Up Behavior",
      description: "Set how aggressively you want to follow up with customers. Choose your cadence, tone, and let the app remind you so no lead falls through the cracks.",
      position: "center",
      icon: "bell",
    },
    {
      id: "features_toggle",
      title: "Enable Features",
      description: "Turn on Commercial Quoting to unlock proposals for offices, gyms, and retail spaces. You can also manage AI data sharing and replay these guided tours anytime.",
      position: "center",
      icon: "toggle-right",
    },
  ],
};

export const ALL_TOURS = [
  DASHBOARD_TOUR,
  QUOTES_TOUR,
  CUSTOMERS_TOUR,
  GROWTH_TOUR,
  COMMERCIAL_TOUR,
  SETTINGS_TOUR,
];
