import { useState } from "react";
import { apiPost } from "../lib/api";
import {
  MapPin,
  Copy,
  Navigation,
  Phone,
  Mail,
  CheckCircle,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import { Card, CardHeader, Button } from "./ui";

export interface DispatchData {
  customerName?: string;
  address?: string;
  serviceType?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  total?: number;
  phone?: string;
  email?: string;
  notes?: string;
  customerId?: string;
}

function formatJobDetails(d: DispatchData): string {
  const lines: string[] = [];
  if (d.customerName) lines.push(d.customerName);
  if (d.address) lines.push(d.address);
  if (d.serviceType) lines.push(d.serviceType);
  if (d.scheduledDate) {
    const date = new Date(d.scheduledDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (d.startTime && d.endTime) {
      const fmt = (t: string) =>
        new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      lines.push(`${date}, ${fmt(d.startTime)}–${fmt(d.endTime)}`);
    } else if (d.startTime) {
      const fmt = (t: string) =>
        new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      lines.push(`${date}, ${fmt(d.startTime)}`);
    } else {
      lines.push(date);
    }
  }
  if (d.total) lines.push(`$${Number(d.total).toLocaleString()}`);
  if (d.notes) lines.push(`Notes: ${d.notes}`);
  return lines.join("\n");
}

function formatSmsText(d: DispatchData): string {
  const lines: string[] = ["Hi — here's your job info:"];
  if (d.customerName) lines.push(d.customerName);
  if (d.address) lines.push(d.address);
  if (d.serviceType) lines.push(d.serviceType);
  if (d.scheduledDate) {
    const date = new Date(d.scheduledDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (d.startTime && d.endTime) {
      const fmt = (t: string) =>
        new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      lines.push(`${date}, ${fmt(d.startTime)}–${fmt(d.endTime)}`);
    } else {
      lines.push(date);
    }
  }
  if (d.notes) lines.push(`Notes: ${d.notes}`);
  return lines.join("\n");
}

function mapsUrl(address: string, provider: "google" | "apple" | "waze") {
  const q = encodeURIComponent(address);
  if (provider === "google") return `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (provider === "apple") return `https://maps.apple.com/?address=${q}`;
  return `https://waze.com/ul?q=${q}`;
}

interface Props {
  data: DispatchData;
  onToast?: (msg: string, variant?: "success" | "error" | "info") => void;
}

export default function DispatchCard({ data, onToast }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [sending, setSending] = useState<"sms" | "email" | null>(null);

  const toast = (msg: string, variant: "success" | "error" | "info" = "success") => {
    onToast?.(msg, variant);
  };

  const copyText = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast(`${label} copied!`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast("Copy failed — please try again", "error");
    }
  };

  const sendViaPlatform = async (channel: "sms" | "email") => {
    if (!data.customerId) {
      toast("No customer linked", "error");
      return;
    }
    setSending(channel);
    const body = channel === "sms" ? formatSmsText(data) : formatJobDetails(data);
    try {
      await apiPost("/api/communications", {
        customerId: data.customerId,
        type: channel,
        channel,
        content: body,
        ...(channel === "email"
          ? { subject: `Job Details — ${data.customerName || "Your Cleaning"}` }
          : {}),
      });
      toast(`${channel === "sms" ? "SMS" : "Email"} sent!`);
    } catch (e: any) {
      toast(e?.message || "Failed to send", "error");
    }
    setSending(null);
  };

  if (!data.address && !data.customerName) return null;

  const jobText = formatJobDetails(data);
  const hasSched = !!data.scheduledDate;
  const hasAddress = !!data.address;
  const hasPhone = !!data.phone;
  const hasEmail = !!data.email;
  const hasCustomer = !!data.customerId;

  const ActionBtn = ({
    icon: Icon,
    label,
    onClick,
    disabled,
    loading,
    copied,
  }: {
    icon: any;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    copied?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-xs font-medium transition-all w-full ${
        copied
          ? "border-green-300 bg-green-50 text-green-700"
          : disabled
          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
          : "border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 active:scale-95"
      }`}
    >
      {copied ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      <span className="leading-tight text-center">{copied ? "Copied!" : label}</span>
    </button>
  );

  return (
    <Card>
      <CardHeader title="Dispatch" icon={Navigation} />

      {/* Address preview */}
      {hasAddress ? (
        <div className="flex items-start gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-700 leading-snug">{data.address}</p>
        </div>
      ) : null}

      {/* Job summary */}
      {(hasSched || data.serviceType || data.total) ? (
        <div className="mb-4 space-y-1 text-xs text-slate-500">
          {data.serviceType ? (
            <p><span className="font-medium text-slate-700">{data.serviceType}</span></p>
          ) : null}
          {hasSched ? (
            <p>
              {new Date(data.scheduledDate!).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {data.startTime
                ? `, ${new Date(data.startTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : ""}
              {data.endTime
                ? `–${new Date(data.endTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : ""}
            </p>
          ) : null}
          {data.total ? (
            <p className="font-semibold text-slate-700">${Number(data.total).toLocaleString()}</p>
          ) : null}
        </div>
      ) : null}

      {/* Quick copy row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <ActionBtn
          icon={Copy}
          label="Copy Address"
          onClick={() => copyText(data.address || "", "addr", "Address")}
          disabled={!hasAddress}
          copied={copiedKey === "addr"}
        />
        <ActionBtn
          icon={ClipboardList}
          label="Copy Job Details"
          onClick={() => copyText(jobText, "job", "Job details")}
          copied={copiedKey === "job"}
        />
      </div>

      {/* Maps row */}
      {hasAddress ? (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Google Maps", key: "google" as const },
            { label: "Apple Maps", key: "apple" as const },
            { label: "Waze", key: "waze" as const },
          ].map(({ label, key }) => (
            <a
              key={key}
              href={mapsUrl(data.address!, key)}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-all active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="leading-tight text-center">{label}</span>
            </a>
          ))}
        </div>
      ) : null}

      {/* Send row */}
      {(hasPhone || hasEmail) && hasCustomer ? (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <ActionBtn
            icon={Phone}
            label={sending === "sms" ? "Sending…" : "Text Details"}
            onClick={() => sendViaPlatform("sms")}
            disabled={!hasPhone || !hasCustomer}
            loading={sending === "sms"}
          />
          <ActionBtn
            icon={Mail}
            label={sending === "email" ? "Sending…" : "Email Details"}
            onClick={() => sendViaPlatform("email")}
            disabled={!hasEmail || !hasCustomer}
            loading={sending === "email"}
          />
        </div>
      ) : null}

      {(!hasPhone && !hasEmail) || !hasCustomer ? (
        <p className="text-xs text-slate-400 text-center mt-2">
          Add phone/email to the customer record to enable text &amp; email dispatch.
        </p>
      ) : null}
    </Card>
  );
}
