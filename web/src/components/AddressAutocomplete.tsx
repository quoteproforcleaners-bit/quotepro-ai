import { useRef, useEffect } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { Check, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  street: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  onChange: (field: "street" | "apt" | "city" | "state" | "zip", value: string) => void;
  onCoords?: (lat: number, lng: number) => void;
  required?: boolean;
}

export default function AddressAutocomplete({
  street,
  apt = "",
  city,
  state,
  zip,
  onChange,
  onCoords,
  required,
}: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const verified = !!(city && state && zip);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ["address"],
      componentRestrictions: { country: ["us", "ca", "gb"] },
    },
    debounce: 300,
  });

  useEffect(() => {
    if (street !== value) setValue(street, false);
  }, [street]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearSuggestions();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [clearSuggestions]);

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    onChange("street", val);
  };

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();
    try {
      const results = await getGeocode({ address: description });
      const comps = results[0].address_components;
      const get = (type: string, short = false) => {
        const c = comps.find((x: any) => x.types.includes(type));
        return c ? (short ? c.short_name : c.long_name) : "";
      };
      const streetNum = get("street_number");
      const route = get("route");
      const streetAddr = streetNum && route ? `${streetNum} ${route}` : description.split(",")[0].trim();
      const parsedCity =
        get("locality") || get("sublocality_level_1") || get("administrative_area_level_2");
      const parsedState = get("administrative_area_level_1", true);
      const parsedZip = get("postal_code");

      onChange("street", streetAddr);
      onChange("city", parsedCity);
      onChange("state", parsedState);
      onChange("zip", parsedZip);
      setValue(streetAddr, false);

      if (onCoords) {
        const { lat, lng } = await getLatLng(results[0]);
        onCoords(lat, lng);
      }
    } catch {
      // geocode failed — leave fields as-is
    }
  };

  const showDrop = ready && status === "OK" && data.length > 0;

  const inputCls =
    "w-full h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div className="space-y-3">
      {/* Street with autocomplete dropdown */}
      <div ref={containerRef} className="relative">
        <label className={labelCls}>
          {t("address.street")}
          {required ? <span className="text-red-500 ml-0.5">*</span> : null}
        </label>
        <div className="relative">
          <MapPin
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={value}
            onChange={handleStreetChange}
            placeholder={t("address.streetPlaceholder")}
            autoComplete="off"
            className={`${inputCls} pl-9 ${verified ? "pr-32" : ""}`}
          />
          {verified ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-emerald-600 font-medium pointer-events-none">
              <Check size={12} />
              {t("address.verified")}
            </span>
          ) : null}
        </div>

        {showDrop ? (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            <ul>
              {data.map(({ place_id, description, structured_formatting }) => (
                <li
                  key={place_id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(description);
                  }}
                  className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                >
                  <div className="text-sm font-medium text-slate-800">
                    {structured_formatting.main_text}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {structured_formatting.secondary_text}
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4 py-1.5 border-t border-slate-100 flex justify-end">
              <img
                src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
                alt="Powered by Google"
                className="h-4 opacity-60"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Apt / Unit */}
      <div>
        <label className={labelCls}>{t("address.apt")}</label>
        <input
          type="text"
          value={apt}
          onChange={(e) => onChange("apt", e.target.value)}
          placeholder="Apt, Suite, Unit (optional)"
          className={inputCls}
        />
      </div>

      {/* City + State */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t("address.city")}</label>
          <input
            type="text"
            value={city}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder={t("address.cityPlaceholder")}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>{t("address.state")}</label>
          <input
            type="text"
            value={state}
            onChange={(e) => onChange("state", e.target.value)}
            placeholder="CA"
            className={inputCls}
          />
        </div>
      </div>

      {/* Zip */}
      <div>
        <label className={labelCls}>{t("address.zip")}</label>
        <input
          type="text"
          value={zip}
          onChange={(e) => onChange("zip", e.target.value)}
          placeholder="12345"
          className={inputCls}
        />
      </div>
    </div>
  );
}
