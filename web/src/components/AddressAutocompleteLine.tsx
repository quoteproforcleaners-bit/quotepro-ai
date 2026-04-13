import { useRef, useEffect } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { MapPin } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
}

export default function AddressAutocompleteLine({
  value,
  onChange,
  label,
  placeholder = "123 Main St, City, State",
  required,
  className,
  style,
  inputStyle,
  labelStyle,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    ready,
    value: autocompleteValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { types: ["address"] },
    debounce: 300,
  });

  useEffect(() => {
    if (value !== autocompleteValue) setValue(value, false);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearSuggestions();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [clearSuggestions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    onChange(val);
  };

  const handleSelect = (description: string) => {
    setValue(description, false);
    clearSuggestions();
    onChange(description);
  };

  const showDrop = ready && status === "OK" && data.length > 0;

  return (
    <div className={className} style={style} ref={containerRef}>
      {label ? (
        <label
          className="block text-sm font-medium text-slate-700 mb-1.5"
          style={labelStyle}
        >
          {label}
          {required ? <span className="text-red-500 ml-0.5">*</span> : null}
        </label>
      ) : null}

      <div className="relative">
        <MapPin
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"
          style={inputStyle ? { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" } : undefined}
        />
        <input
          type="text"
          value={autocompleteValue}
          onChange={handleChange}
          placeholder={placeholder}
          autoComplete="off"
          className={
            inputStyle
              ? undefined
              : "w-full h-11 pl-9 pr-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          }
          style={
            inputStyle
              ? { ...inputStyle, paddingLeft: 36 }
              : undefined
          }
        />

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
    </div>
  );
}
