import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import { PageHeader, Card, CardHeader, Input, Button, Alert } from "../components/ui";
import { UserPlus, AlertCircle } from "lucide-react";

export default function CustomerCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  });
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
    mutation.mutate(form);
  };

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
                onChange={(e) =>
                  setForm((p) => ({ ...p, firstName: e.target.value }))
                }
                required
                placeholder="Jane"
              />
              <Input
                label="Last name"
                value={form.lastName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lastName: e.target.value }))
                }
                placeholder="Smith"
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="jane@email.com"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) =>
                setForm((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="(555) 123-4567"
            />
            <Input
              label="Address"
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
              }
              placeholder="123 Main St, City, ST"
            />

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
