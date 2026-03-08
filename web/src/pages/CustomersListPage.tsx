import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Star, Mail, Phone, MapPin } from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Tabs,
  SearchInput,
  EmptyState,
  Spinner,
} from "../components/ui";

export default function CustomersListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { data: customers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const tabs = ["all", "active", "lead", "inactive"];
  const counts: Record<string, number> = {
    all: customers.length,
    active: customers.filter((c: any) => c.status === "active" || (!c.status && c.isVip)).length,
    lead: customers.filter((c: any) => c.status === "lead").length,
    inactive: customers.filter((c: any) => c.status === "inactive").length,
  };

  const filtered = customers
    .filter((c: any) => {
      if (filter === "all") return true;
      if (filter === "active") return c.status === "active" || (!c.status && c.isVip);
      return c.status === filter;
    })
    .filter((c: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
      );
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} total customers`}
        actions={
          <Button icon={Plus} onClick={() => navigate("/customers/new")}>
            Add Customer
          </Button>
        }
      />

      <Card padding={false}>
        <div className="p-4 lg:p-5 border-b border-slate-100 space-y-3">
          <Tabs tabs={tabs} active={filter} onChange={setFilter} counts={counts} />
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email, or phone..."
          />
        </div>

        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? "No customers match your search" : "No customers yet"}
            description={
              search
                ? "Try a different search term"
                : "Add your first customer to get started"
            }
            action={
              !search ? (
                <Button icon={Plus} onClick={() => navigate("/customers/new")}>
                  Add Customer
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Phone
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Location
                  </th>
                  <th className="text-right px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-5 lg:px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                          {(c.firstName?.[0] || "").toUpperCase()}
                          {(c.lastName?.[0] || "").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 flex items-center gap-1.5">
                            {c.firstName} {c.lastName}
                            {c.isVip ? (
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            ) : null}
                          </p>
                          <p className="text-xs text-slate-400 sm:hidden">
                            {c.email || c.phone || "No contact"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                      {c.email || <span className="text-slate-300">&mdash;</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                      {c.phone || <span className="text-slate-300">&mdash;</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 truncate max-w-[200px] hidden lg:table-cell">
                      {c.address || <span className="text-slate-300">&mdash;</span>}
                    </td>
                    <td className="px-5 lg:px-6 py-3.5 text-right text-slate-500 hidden md:table-cell">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
