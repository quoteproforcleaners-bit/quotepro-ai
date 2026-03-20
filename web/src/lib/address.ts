export interface AddressParts {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function buildAddress(parts: AddressParts): string {
  const { street, city, state, zip, country } = parts;
  const stateZip = [state, zip].filter(Boolean).join(" ");
  const lines = [street, city, stateZip, country && country.toUpperCase() !== "US" ? country : ""].filter(Boolean);
  return lines.join(", ");
}

export function parseAddress(address: string): AddressParts {
  if (!address?.trim()) return { street: "", city: "", state: "", zip: "", country: "" };

  const parts = address.split(",").map((p) => p.trim());

  if (parts.length >= 3) {
    const street = parts[0];
    const city = parts[1];
    const stateZipRaw = parts[2];
    const country = parts[3] || "";

    const stateZipMatch = stateZipRaw.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZipMatch) {
      return { street, city, state: stateZipMatch[1].toUpperCase(), zip: stateZipMatch[2], country };
    }

    const zipOnlyMatch = stateZipRaw.match(/^(\d{5}(?:-\d{4})?)$/);
    if (zipOnlyMatch) {
      return { street, city, state: "", zip: zipOnlyMatch[1], country };
    }

    return { street, city, state: stateZipRaw, zip: "", country };
  }

  if (parts.length === 2) {
    return { street: parts[0], city: parts[1], state: "", zip: "", country: "" };
  }

  const single = parts[0];
  const stateZipMatch = single.match(/^(.*?),?\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (stateZipMatch) {
    return { street: stateZipMatch[1].trim(), city: "", state: stateZipMatch[2].toUpperCase(), zip: stateZipMatch[3], country: "" };
  }

  return { street: single, city: "", state: "", zip: "", country: "" };
}
