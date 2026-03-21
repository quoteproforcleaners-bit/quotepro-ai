import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiPut } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import { Modal, Button } from "./ui";
import { Save, Home, Building, Maximize, Bed, Bath } from "lucide-react";

const addOnOptions = [
  { key: "insideFridge", label: "Inside Fridge" },
  { key: "insideOven", label: "Inside Oven" },
  { key: "insideCabinets", label: "Inside Cabinets" },
  { key: "interiorWindows", label: "Interior Windows" },
  { key: "blindsDetail", label: "Blinds Detail" },
  { key: "baseboardsDetail", label: "Baseboards Detail" },
  { key: "laundryFoldOnly", label: "Laundry (Fold Only)" },
  { key: "dishes", label: "Dishes" },
  { key: "organizationTidy", label: "Organization & Tidy" },
];

const homeTypes = [
  { value: "house", label: "House", icon: Home },
  { value: "apartment", label: "Apartment", icon: Building },
  { value: "townhome", label: "Townhome", icon: Home },
  { value: "condo", label: "Condo", icon: Building },
];

const tierKeys = ["good", "better", "best"] as const;
type TierKey = typeof tierKeys[number];

interface EditQuoteModalProps {
  open: boolean;
  onClose: () => void;
  quote: any;
}

export default function EditQuoteModal({ open, onClose, quote }: EditQuoteModalProps) {
  const details = (quote?.propertyDetails || {}) as any;
  const rawOpts = (quote?.options || {}) as any;
  const rawAddOns = (quote?.addOns || {}) as any;

  const [notes, setNotes] = useState(quote?.notes || "");
  const [expiresAt, setExpiresAt] = useState(
    quote?.expiresAt ? new Date(quote.expiresAt).toISOString().slice(0, 10) : ""
  );

  const [property, setProperty] = useState({
    homeType: details.homeType || "house",
    sqft: details.sqft || 0,
    beds: details.beds || 2,
    baths: details.baths || 1,
    halfBaths: details.halfBaths || 0,
    peopleCount: details.peopleCount || 1,
    petType: details.petType || "none",
    conditionScore: details.conditionScore || 7,
  });

  const [tiers, setTiers] = useState<Record<TierKey, { name: string; description: string; price: string }>>({
    good: {
      name: rawOpts.good?.name || "Good",
      description: rawOpts.good?.description || rawOpts.good?.scope || "",
      price: String(rawOpts.good?.price ?? rawOpts.good?.total ?? ""),
    },
    better: {
      name: rawOpts.better?.name || "Better",
      description: rawOpts.better?.description || rawOpts.better?.scope || "",
      price: String(rawOpts.better?.price ?? rawOpts.better?.total ?? ""),
    },
    best: {
      name: rawOpts.best?.name || "Best",
      description: rawOpts.best?.description || rawOpts.best?.scope || "",
      price: String(rawOpts.best?.price ?? rawOpts.best?.total ?? ""),
    },
  });

  const [addOns, setAddOns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(addOnOptions.map((a) => [a.key, !!rawAddOns[a.key]]))
  );

  useEffect(() => {
    if (!open) return;
    const d = (quote?.propertyDetails || {}) as any;
    const o = (quote?.options || {}) as any;
    const a = (quote?.addOns || {}) as any;
    setNotes(quote?.notes || "");
    setExpiresAt(quote?.expiresAt ? new Date(quote.expiresAt).toISOString().slice(0, 10) : "");
    setProperty({
      homeType: d.homeType || "house",
      sqft: d.sqft || 0,
      beds: d.beds || 2,
      baths: d.baths || 1,
      halfBaths: d.halfBaths || 0,
      peopleCount: d.peopleCount || 1,
      petType: d.petType || "none",
      conditionScore: d.conditionScore || 7,
    });
    setTiers({
      good: { name: o.good?.name || "Good", description: o.good?.description || o.good?.scope || "", price: String(o.good?.price ?? o.good?.total ?? "") },
      better: { name: o.better?.name || "Better", description: o.better?.description || o.better?.scope || "", price: String(o.better?.price ?? o.better?.total ?? "") },
      best: { name: o.best?.name || "Best", description: o.best?.description || o.best?.scope || "", price: String(o.best?.price ?? o.best?.total ?? "") },
    });
    setAddOns(Object.fromEntries(addOnOptions.map((ao) => [ao.key, !!a[ao.key]])));
  }, [open, quote]);

  const mutation = useMutation({
    mutationFn: (payload: any) => apiPut(`/api/quotes/${quote.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quote.id}`] });
      onClose();
    },
  });

  const handleSave = () => {
    const selectedKey = quote?.selectedOption || "better";
    const selectedTier = tiers[selectedKey as TierKey] || tiers.better;
    const selectedPrice = parseFloat(selectedTier.price) || 0;

    const updatedOptions: Record<string, any> = {};
    for (const k of tierKeys) {
      if (rawOpts[k]) {
        updatedOptions[k] = {
          ...rawOpts[k],
          name: tiers[k].name,
          description: tiers[k].description,
          scope: tiers[k].description,
          price: parseFloat(tiers[k].price) || 0,
          total: parseFloat(tiers[k].price) || 0,
        };
      }
    }

    const payload: any = {
      notes,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      propertyDetails: { ...details, ...property },
      options: updatedOptions,
      addOns,
      total: selectedPrice,
      subtotal: selectedPrice,
    };

    mutation.mutate(payload);
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-300";
  const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1";
  const numInputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-300 text-center";

  return (
    <Modal open={open} onClose={onClose} title="Edit Quote" size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">

        {/* Pricing Tiers */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">1</span>
            Pricing Options
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {tierKeys.map((key) => {
              if (!rawOpts[key]) return null;
              const tierLabels: Record<TierKey, string> = { good: "Good", better: "Better", best: "Best" };
              const tierColors: Record<TierKey, string> = {
                good: "border-slate-200 bg-slate-50",
                better: "border-primary-200 bg-primary-50",
                best: "border-amber-200 bg-amber-50",
              };
              return (
                <div key={key} className={`rounded-xl border p-4 space-y-2 ${tierColors[key]}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{tierLabels[key]}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className={labelCls}>Tier Name</label>
                      <input
                        className={inputCls}
                        value={tiers[key].name}
                        onChange={(e) => setTiers((prev) => ({ ...prev, [key]: { ...prev[key], name: e.target.value } }))}
                        placeholder={tierLabels[key]}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Price ($)</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={tiers[key].price}
                        onChange={(e) => setTiers((prev) => ({ ...prev, [key]: { ...prev[key], price: e.target.value } }))}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <input
                      className={inputCls}
                      value={tiers[key].description}
                      onChange={(e) => setTiers((prev) => ({ ...prev, [key]: { ...prev[key], description: e.target.value } }))}
                      placeholder="Short description..."
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Add-Ons */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">2</span>
            Add-Ons
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {addOnOptions.map((ao) => (
              <label
                key={ao.key}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                  addOns[ao.key]
                    ? "border-primary-300 bg-primary-50 text-primary-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="rounded text-primary-600 focus:ring-primary-400"
                  checked={!!addOns[ao.key]}
                  onChange={(e) => setAddOns((prev) => ({ ...prev, [ao.key]: e.target.checked }))}
                />
                <span className="text-xs font-medium">{ao.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Property Details */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">3</span>
            Property Details
          </h3>
          <div className="rounded-xl border border-slate-200 p-4 space-y-4">
            {/* Home type */}
            <div>
              <label className={labelCls}>Home Type</label>
              <div className="flex gap-2 flex-wrap">
                {homeTypes.map((ht) => {
                  const Icon = ht.icon;
                  return (
                    <button
                      key={ht.value}
                      type="button"
                      onClick={() => setProperty((p) => ({ ...p, homeType: ht.value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        property.homeType === ht.value
                          ? "border-primary-400 bg-primary-50 text-primary-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {ht.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Numbers grid */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>
                  <Maximize className="w-3 h-3 inline mr-1" />Sq Ft
                </label>
                <input
                  type="number"
                  className={numInputCls}
                  value={property.sqft || ""}
                  onChange={(e) => setProperty((p) => ({ ...p, sqft: parseInt(e.target.value) || 0 }))}
                  placeholder="1500"
                  min="0"
                />
              </div>
              <div>
                <label className={labelCls}>
                  <Bed className="w-3 h-3 inline mr-1" />Beds
                </label>
                <input
                  type="number"
                  className={numInputCls}
                  value={property.beds}
                  onChange={(e) => setProperty((p) => ({ ...p, beds: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="10"
                />
              </div>
              <div>
                <label className={labelCls}>
                  <Bath className="w-3 h-3 inline mr-1" />Full Baths
                </label>
                <input
                  type="number"
                  className={numInputCls}
                  value={property.baths}
                  onChange={(e) => setProperty((p) => ({ ...p, baths: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="10"
                />
              </div>
              <div>
                <label className={labelCls}>Half Baths</label>
                <input
                  type="number"
                  className={numInputCls}
                  value={property.halfBaths}
                  onChange={(e) => setProperty((p) => ({ ...p, halfBaths: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="5"
                />
              </div>
              <div>
                <label className={labelCls}>Residents</label>
                <input
                  type="number"
                  className={numInputCls}
                  value={property.peopleCount}
                  onChange={(e) => setProperty((p) => ({ ...p, peopleCount: parseInt(e.target.value) || 1 }))}
                  min="1"
                  max="20"
                />
              </div>
              <div>
                <label className={labelCls}>Condition (1-10)</label>
                <input
                  type="number"
                  className={numInputCls}
                  value={property.conditionScore}
                  onChange={(e) => setProperty((p) => ({ ...p, conditionScore: parseInt(e.target.value) || 7 }))}
                  min="1"
                  max="10"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Notes & Expiry */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">4</span>
            Notes & Expiry
          </h3>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Notes (visible to customer)</label>
              <textarea
                className={inputCls}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions or notes for this quote..."
              />
            </div>
            <div>
              <label className={labelCls}>Quote Expires On</label>
              <input
                type="date"
                className={inputCls}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
        </section>
      </div>

      {mutation.isError ? (
        <p className="text-xs text-red-600 mt-3">
          {(mutation.error as any)?.message || "Failed to save changes. Please try again."}
        </p>
      ) : null}

      <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-4">
        <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button variant="primary" icon={Save} onClick={handleSave} loading={mutation.isPending}>
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}
