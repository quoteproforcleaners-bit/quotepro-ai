/**
 * LocationSwitcher — dropdown in the top nav that lets multi-location owners
 * switch their active location without leaving the page.
 *
 * Only rendered when is_multi_location_enabled = true.
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, ChevronDown, Check, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

interface Location {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  is_primary: boolean;
}

interface MeResponse {
  activeLocationId: string | null;
  isMultiLocationEnabled: boolean;
}

export function LocationSwitcher() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: me } = useQuery<MeResponse>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60000,
    enabled: !!me?.isMultiLocationEnabled,
  });

  if (!me?.isMultiLocationEnabled) return null;

  const activeLocations = locations.filter((l) => l.active);
  const active = activeLocations.find((l) => l.id === me?.activeLocationId);
  const displayName = active?.name ?? "Select Location";

  async function switchLocation(id: string) {
    setOpen(false);
    try {
      await apiRequest("POST", `/api/locations/${id}/switch`);
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      qc.invalidateQueries({ queryKey: ["/api/locations"] });
      // Refresh data-dependent queries
      qc.invalidateQueries({ queryKey: ["/api/quotes"] });
      qc.invalidateQueries({ queryKey: ["/api/customers"] });
      qc.invalidateQueries({ queryKey: ["/api/jobs"] });
    } catch {
      // silent
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors max-w-[180px]"
      >
        <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
        <span className="truncate">{displayName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
          {activeLocations.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">No locations found</p>
          ) : (
            activeLocations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => switchLocation(loc.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 text-sm text-left transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="flex-1 truncate font-medium text-slate-800">{loc.name}</span>
                {loc.id === me?.activeLocationId && (
                  <Check className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                )}
              </button>
            ))
          )}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); navigate("/locations"); }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-sm text-primary-600 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Manage locations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
