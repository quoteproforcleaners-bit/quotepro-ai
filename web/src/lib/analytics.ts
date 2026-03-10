import { apiPost } from "./api";

type ToolkitEvent =
  | "toolkit_page_view"
  | "toolkit_email_signup"
  | "calculator_click"
  | "template_download"
  | "quotepro_trial_click";

interface EventParams {
  page?: string;
  resource_name?: string;
  resource_type?: string;
  source?: string;
  [key: string]: any;
}

export async function trackEvent(
  name: ToolkitEvent | string,
  params?: EventParams
): Promise<void> {
  const payload = {
    ...params,
    timestamp: new Date().toISOString(),
  };

  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${name}`, payload);
  }

  try {
    await apiPost("/api/analytics/events", {
      eventName: name,
      properties: payload,
    });
  } catch {
  }
}
