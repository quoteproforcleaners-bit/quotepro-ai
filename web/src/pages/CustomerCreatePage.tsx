import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import { PageHeader, Card, CardHeader, Input, Button, Alert } from "../components/ui";
import { UserPlus, AlertCircle } from "lucide-react";
import { buildAddress } from "../lib/address";
import AddressAutocomplete from "../components/AddressAutocomplete";

export default function CustomerCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    apt: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/customers", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      navigate(`/customers/${data.id}`);
    },
    onError: (err: any) => setError(err.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.firstName.trim()) {
      setError("First name is required");
      return;
    }
    const { street, apt, city, state, zip, country, ...rest } = form;
    const streetWithApt = apt.trim() ? `${street}, ${apt}` : street;
    mutation.mutate({
      ...rest,
      address: buildAddress({ street: streetWithApt, city, state, zip, country }),
      ...(coords ? { addressLat: coords.lat, addressLng: coords.lng } : {}),
    });
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div>
      <PageHeader title="Add Customer" backTo="/customers" />

      <div className="max-w-2xl">
        <Card>
          <CardHeader title="Customer Information" icon={UserPlus} />

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <Alert variant="error" icon={AlertCircle} title={error} />
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First name *"
                value={form.firstName}
                onChange={set("firstName")}
                required
                placeholder="Jane"
              />
              <Input
                label="Last name"
                value={form.lastName}
                onChange={set("lastName")}
                placeholder="Smith"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="jane@email.com"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={set("phone")}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="pt-1">
              <p className="text-sm font-semibold text-slate-700 mb-3">Service Address</p>
              <AddressAutocomplete
                street={form.street}
                apt={form.apt}
                city={form.city}
                state={form.state}
                zip={form.zip}
                onChange={(field, val) => setForm((p) => ({ ...p, [field]: val }))}
                onCoords={(lat, lng) => setCoords({ lat, lng })}
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <Button type="submit" loading={mutation.isPending}>
                Add Customer
              </Button>
              <Button variant="secondary" onClick={() => navigate("/customers")}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
