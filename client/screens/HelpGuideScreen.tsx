import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";

interface Section {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  content: string[];
}

function getGuideData(isEnglish: boolean): Section[] {
  if (isEnglish) {
    return [
      {
        id: "getting-started",
        icon: "play-circle",
        title: "Getting Started",
        content: [
          "Create your account using Email, Google, or Apple Sign-In.",
          "During onboarding, enter your business name and set your hourly rate and minimum charge.",
          "These settings form the foundation of your quote calculations. You can always change them later in Settings.",
        ],
      },
      {
        id: "home-dashboard",
        icon: "home",
        title: "Home Dashboard",
        content: [
          "Your command center. See today's follow-ups, at-risk quotes, and your follow-up streak at a glance.",
          "Use the AI Command Bar at the top to type natural language commands or tap quick action chips.",
          "Recent Quotes shows your latest quotes with status. Tap any quote to see details.",
          "The Opportunities Summary shows dormant customers and recoverable revenue.",
        ],
      },
      {
        id: "creating-quotes",
        icon: "file-text",
        title: "Creating Quotes",
        content: [
          "Step 1 - Customer Info: Select an existing customer or create a new one with name, phone, email, and address.",
          "Step 2 - Home Details: Enter square footage, bedrooms, bathrooms, home type, number of people, cleanliness rating, and pet info.",
          "Step 3 - Add-Ons: Toggle extra services like Inside Fridge, Inside Oven, Interior Windows, Baseboards Detail, and more. Choose cleaning frequency (one-time, weekly, bi-weekly, monthly, quarterly).",
          "Step 4 - Preview: See Good/Better/Best pricing options. Select an option, review AI or manual email/SMS drafts, then save.",
          "Free users get copy-paste email and SMS drafts. QuotePro AI subscribers get AI-written messages and direct sending.",
        ],
      },
      {
        id: "quote-actions",
        icon: "send",
        title: "Quote Actions",
        content: [
          "From Quote Details, you can change the status (Draft, Sent, Accepted, Declined, Expired).",
          "Copy Payment Link: If Stripe is connected, generate a link for customers to pay online.",
          "Export PDF: Create a branded PDF with your logo, pricing, and terms to share with customers.",
          "Generate AI Messages: Create follow-up messages, thank you notes, or other communications.",
          "Venmo and Cash App links can also be copied if configured in Settings.",
        ],
      },
      {
        id: "customers",
        icon: "users",
        title: "Managing Customers",
        content: [
          "The Customers tab is your built-in CRM. Search by name or filter by status (Lead, Active, Inactive).",
          "Tap any customer to see their full profile with contact info, notes, tags, quotes, jobs, and communication history.",
          "Add private notes (preferences, access codes) and custom tags (VIP, Monthly, Referred) to organize your client list.",
          "Customers are also created automatically when you build a new quote.",
        ],
      },
      {
        id: "jobs",
        icon: "calendar",
        title: "Scheduling Jobs",
        content: [
          "Create jobs with customer, job type (Standard, Deep Clean, Move In/Out, Post Construction, Airbnb Turnover), date, duration, and address.",
          "Set jobs to recur Weekly, Biweekly, or Monthly. When you complete a recurring job, the next one is automatically scheduled.",
          "Use checklists to track tasks during each job. Check items off as you go.",
          "Take before/after photos to document your work. Add captions to describe each photo.",
          "If Google Calendar is connected, jobs sync automatically to your calendar.",
        ],
      },
      {
        id: "growth",
        icon: "trending-up",
        title: "Growth Dashboard",
        content: [
          "Your Growth Score (0-100) shows your business momentum based on tasks, completions, and close rate.",
          "Pipeline Snapshot displays open quote value, forecasted revenue, close rate, and confidence level.",
          "Today's Focus shows your top 3 priority tasks. Growth Opportunities shows counts for Reviews, Upsells, Rebook, and Reactivation.",
          "Quick actions let you jump to Generate Tasks, Send Campaign, or View Automations.",
        ],
      },
      {
        id: "follow-ups",
        icon: "phone-call",
        title: "Follow-Up Queue",
        content: [
          "Filter by Overdue, Due Today, or Upcoming to prioritize your outreach.",
          "For each follow-up: send an SMS, email, or call. Mark as Contacted to update your streak, or Snooze to push it back.",
          "QuotePro provides 5 age-based message templates that auto-fill with customer name, quote amount, and other details.",
          "Building a daily follow-up streak encourages consistent engagement and helps close more deals.",
        ],
      },
      {
        id: "weekly-recap",
        icon: "bar-chart-2",
        title: "Weekly Recap",
        content: [
          "See your weekly performance stats including quotes sent, accepted, and revenue.",
          "Navigate between weeks using the arrow buttons.",
          "At-Risk Quotes highlights quotes that may expire soon without a response.",
          "Set a Weekly Goal and track your progress with a visual progress bar.",
        ],
      },
      {
        id: "opportunities",
        icon: "target",
        title: "Opportunities",
        content: [
          "Dormant Customers: People who haven't booked within your configured threshold (default 90 days). Tap Reach Out to contact them.",
          "Lost Quotes: Quotes sent but never accepted. Tap Recover to send a follow-up.",
          "Each opportunity shows estimated recovery value so you can prioritize the biggest wins.",
          "Mark customers as Do Not Contact if they've asked not to be reached out to.",
        ],
      },
      {
        id: "tasks-queue",
        icon: "check-square",
        title: "Growth Tasks",
        content: [
          "7 task types: Quote Follow-Up, Abandoned Recovery, Rebook Nudge, Review Request, Referral Ask, Upsell Deep Clean, and Reactivation.",
          "Each task has a priority score (0-100) with High (red), Medium (yellow), or Low (gray) badges.",
          "Escalation dots show which stage a task is in. Tasks escalate automatically if not acted on.",
          "Complete, Skip, or Escalate each task. Filter by type using the buttons at the top.",
        ],
      },
      {
        id: "reviews",
        icon: "star",
        title: "Reviews & Referrals",
        content: [
          "Track which customers have been sent review requests and whether they've responded.",
          "Set your Google Review Link in Settings or the Automations Hub so customers go to the right place.",
          "Send referral requests to your best customers and track who refers new clients.",
        ],
      },
      {
        id: "upsells",
        icon: "arrow-up-circle",
        title: "Upsell Opportunities",
        content: [
          "QuotePro analyzes customer history to find upsell candidates (e.g., regular customers due for a deep clean).",
          "See the estimated revenue for each upsell opportunity.",
          "QuotePro AI subscribers can generate a personalized upsell message with one tap.",
        ],
      },
      {
        id: "reactivation",
        icon: "refresh-cw",
        title: "Reactivation Campaigns",
        content: [
          "Win back dormant customers and recover lost quotes with targeted campaigns.",
          "Create campaigns with a name, target segment, channel (email/SMS), and message.",
          "See estimated recovery value for each dormant customer or lost quote.",
        ],
      },
      {
        id: "automations",
        icon: "settings",
        title: "Automations Hub",
        content: [
          "Marketing Mode is the master toggle for all automations. Turn it on to have QuotePro automatically create growth tasks.",
          "Enable/disable individual workflows: Quote follow-ups, Abandoned recovery, Rebook nudges, Review requests, Referral asks, Upsell suggestions, and Reactivation.",
          "Guardrails keep you safe: set max sends per day, quiet hours, cooldown periods, and max follow-ups per quote.",
        ],
      },
      {
        id: "sales-strategy",
        icon: "message-circle",
        title: "Sales Strategy",
        content: [
          "4 communication profiles: Professional (polished), Friendly (warm/casual), Premium (luxury), and Urgent (time-sensitive).",
          "Escalation Engine auto-increases urgency through 4 stages: Soft Touch, Value Add, Urgency, and Final.",
          "Preview how messages sound before they're sent to real customers.",
        ],
      },
      {
        id: "settings",
        icon: "sliders",
        title: "Settings",
        content: [
          "Business Profile: Company name, email, phone, address, and logo.",
          "Branding: Sender name, title, booking link, email/SMS signatures.",
          "Pricing & Services: Hourly rates, minimum charge, frequency discounts, add-on prices, and Good/Better/Best service tiers.",
          "Quote Preferences: Control what appears on your quotes and PDFs.",
          "Integrations: Connect Google Calendar (job sync) and Stripe (online payments). Configure Venmo and Cash App.",
          "Notifications: Daily follow-up reminders, weekly recap, quiet hours.",
          "Language: Separate settings for app language and customer message language (English/Spanish).",
        ],
      },
      {
        id: "subscription",
        icon: "zap",
        title: "Free vs. QuotePro AI",
        content: [
          "Free Plan: Unlimited quotes, customer management, manual email/SMS drafts, PDF export, job scheduling.",
          "QuotePro AI ($14.99/mo): Everything in Free, plus AI-written messages, direct sending, smart descriptions, one-tap regeneration, Growth Dashboard, Growth Tasks, Automations Hub, Sales Strategy, Reactivation Campaigns, Upsell Detection, and Reviews/Referral management.",
          "Subscribe, manage, or cancel anytime from Settings.",
        ],
      },
      {
        id: "tips",
        icon: "award",
        title: "Tips for Success",
        content: [
          "Build your follow-up streak by following up every day.",
          "Use Good/Better/Best pricing - customers often pick the middle option.",
          "Take before/after photos on every job to build trust.",
          "Set up recurring jobs so the next visit is auto-scheduled when you complete one.",
          "Connect Google Calendar and Stripe for seamless scheduling and payments.",
          "Customize your branding with logo, sender info, and signatures for a professional look.",
          "Check your Weekly Recap and set goals to keep improving.",
        ],
      },
    ];
  }

  return [
    {
      id: "getting-started",
      icon: "play-circle",
      title: "Primeros Pasos",
      content: [
        "Crea tu cuenta usando correo, Google o Apple.",
        "Durante la configuracion, ingresa el nombre de tu negocio y establece tu tarifa por hora y cargo minimo.",
        "Puedes cambiar estos ajustes mas tarde en Configuracion.",
      ],
    },
    {
      id: "home-dashboard",
      icon: "home",
      title: "Panel Principal",
      content: [
        "Tu centro de control. Ve los seguimientos del dia, cotizaciones en riesgo y tu racha de seguimiento.",
        "Usa la barra de comandos AI para escribir instrucciones o toca los botones de accion rapida.",
        "Cotizaciones Recientes muestra tus ultimas cotizaciones con su estado.",
        "El Resumen de Oportunidades muestra clientes inactivos e ingresos recuperables.",
      ],
    },
    {
      id: "creating-quotes",
      icon: "file-text",
      title: "Crear Cotizaciones",
      content: [
        "Paso 1 - Info del Cliente: Selecciona un cliente existente o crea uno nuevo.",
        "Paso 2 - Detalles del Hogar: Ingresa pies cuadrados, habitaciones, banos, tipo de hogar, personas, limpieza actual y mascotas.",
        "Paso 3 - Extras: Activa servicios adicionales como Interior del Refrigerador, Interior del Horno, Ventanas, y mas. Elige la frecuencia de limpieza.",
        "Paso 4 - Vista Previa: Ve las opciones Bueno/Mejor/Premium. Selecciona una opcion, revisa los borradores y guarda.",
        "Usuarios gratis obtienen borradores para copiar y pegar. Suscriptores de QuotePro AI obtienen mensajes escritos por IA y envio directo.",
      ],
    },
    {
      id: "quote-actions",
      icon: "send",
      title: "Acciones de Cotizacion",
      content: [
        "Cambia el estado (Borrador, Enviada, Aceptada, Rechazada, Expirada).",
        "Copia el enlace de pago si Stripe esta conectado.",
        "Exporta PDF con tu logo, precios y terminos.",
        "Genera mensajes AI de seguimiento o agradecimiento.",
        "Tambien puedes copiar enlaces de Venmo y Cash App si estan configurados.",
      ],
    },
    {
      id: "customers",
      icon: "users",
      title: "Gestion de Clientes",
      content: [
        "La pestana Clientes es tu CRM integrado. Busca por nombre o filtra por estado.",
        "Ve el perfil completo con info de contacto, notas, etiquetas, cotizaciones, trabajos e historial de comunicacion.",
        "Agrega notas privadas y etiquetas personalizadas para organizar tu lista de clientes.",
      ],
    },
    {
      id: "jobs",
      icon: "calendar",
      title: "Programar Trabajos",
      content: [
        "Crea trabajos con cliente, tipo, fecha, duracion y direccion.",
        "Configura trabajos recurrentes (Semanal, Quincenal, Mensual). Al completar uno, el siguiente se programa automaticamente.",
        "Usa listas de verificacion y toma fotos de antes/despues para documentar tu trabajo.",
        "Si Google Calendar esta conectado, los trabajos se sincronizan automaticamente.",
      ],
    },
    {
      id: "growth",
      icon: "trending-up",
      title: "Panel de Crecimiento",
      content: [
        "Tu Puntuacion de Crecimiento (0-100) muestra el impulso de tu negocio.",
        "Vista del Pipeline muestra valor de cotizaciones, ingresos pronosticados y tasa de cierre.",
        "Enfoque de Hoy muestra tus 3 tareas prioritarias. Oportunidades muestra conteos para Resenas, Ventas Adicionales, Reagendar y Reactivacion.",
      ],
    },
    {
      id: "follow-ups",
      icon: "phone-call",
      title: "Cola de Seguimiento",
      content: [
        "Filtra por Vencidos, Para Hoy o Proximos.",
        "Envia SMS, correo o llama. Marca como Contactado o Posponer.",
        "QuotePro provee 5 plantillas de mensajes basadas en la antiguedad de la cotizacion.",
      ],
    },
    {
      id: "settings",
      icon: "sliders",
      title: "Configuracion",
      content: [
        "Perfil del Negocio: Nombre, correo, telefono, direccion y logo.",
        "Marca: Nombre del remitente, titulo, enlace de reserva, firmas de correo/SMS.",
        "Precios y Servicios: Tarifas por hora, cargo minimo, descuentos por frecuencia y niveles de servicio.",
        "Integraciones: Conecta Google Calendar y Stripe. Configura Venmo y Cash App.",
        "Idioma: Configuraciones separadas para el idioma de la app y los mensajes al cliente.",
      ],
    },
    {
      id: "subscription",
      icon: "zap",
      title: "Gratis vs. QuotePro AI",
      content: [
        "Plan Gratis: Cotizaciones ilimitadas, gestion de clientes, borradores manuales, exportar PDF, programacion de trabajos.",
        "QuotePro AI ($14.99/mes): Todo lo gratis mas mensajes AI, envio directo, descripciones inteligentes, Panel de Crecimiento, Tareas, Automatizaciones, Estrategia de Ventas y mas.",
        "Suscribete, administra o cancela en cualquier momento desde Configuracion.",
      ],
    },
    {
      id: "tips",
      icon: "award",
      title: "Consejos para el Exito",
      content: [
        "Construye tu racha de seguimiento dando seguimiento cada dia.",
        "Usa precios Bueno/Mejor/Premium - los clientes suelen elegir la opcion intermedia.",
        "Toma fotos de antes/despues en cada trabajo.",
        "Configura trabajos recurrentes para que el siguiente se programe automaticamente.",
        "Conecta Google Calendar y Stripe para programacion y pagos sin problemas.",
      ],
    },
  ];
}

export default function HelpGuideScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sections = getGuideData(language === "en");

  const toggleSection = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}25` }]}>
          <View style={[styles.headerIcon, { backgroundColor: theme.primary }]}>
            <Feather name="book-open" size={22} color="#FFFFFF" />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.md }}>
            {language === "en" ? "QuotePro User Guide" : "Guia del Usuario QuotePro"}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs, textAlign: "center" }}>
            {language === "en"
              ? "Tap any section below to learn more about each feature."
              : "Toca cualquier seccion para aprender mas sobre cada funcion."}
          </ThemedText>
        </View>

        {sections.map((section) => {
          const isExpanded = expandedId === section.id;
          return (
            <View key={section.id}>
              <Pressable
                onPress={() => toggleSection(section.id)}
                style={[
                  styles.sectionHeader,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: isExpanded ? `${theme.primary}40` : theme.border,
                  },
                ]}
                testID={`guide-section-${section.id}`}
              >
                <View style={[styles.sectionIcon, { backgroundColor: isExpanded ? `${theme.primary}15` : `${theme.textSecondary}10` }]}>
                  <Feather name={section.icon} size={18} color={isExpanded ? theme.primary : theme.textSecondary} />
                </View>
                <ThemedText
                  type="body"
                  style={{ flex: 1, fontWeight: "600", color: isExpanded ? theme.primary : theme.text }}
                >
                  {section.title}
                </ThemedText>
                <Feather
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={isExpanded ? theme.primary : theme.textSecondary}
                />
              </Pressable>

              {isExpanded ? (
                <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderColor: `${theme.primary}20` }]}>
                  {section.content.map((item, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <View style={[styles.bullet, { backgroundColor: theme.primary }]} />
                      <ThemedText type="small" style={{ flex: 1, lineHeight: 20, color: theme.textSecondary }}>
                        {item}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  headerCard: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionContent: {
    marginTop: -4,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    borderWidth: 1,
    borderTopWidth: 0,
    gap: Spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
});
