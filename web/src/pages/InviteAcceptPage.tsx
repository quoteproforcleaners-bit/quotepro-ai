import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button, Card } from "../components/ui";

interface Preview {
  email: string;
  role: string;
  businessName: string;
  expiresAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  estimator: "Estimator",
  cleaner: "Cleaner",
};

export default function InviteAcceptPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [accepted, setAccepted] = useState(false);

  const previewQ = useQuery<Preview>({
    queryKey: ["/api/invitations/preview", token],
    queryFn: () => apiGet(`/api/invitations/preview?token=${encodeURIComponent(token)}`),
    enabled: !!token,
    retry: false,
  });

  const acceptMut = useMutation({
    mutationFn: () => apiPost("/api/invitations/accept", { token }),
    onSuccess: () => setAccepted(true),
  });

  // Auto-accept once authenticated with the matching email.
  useEffect(() => {
    if (
      isAuthenticated &&
      previewQ.data &&
      user?.email?.toLowerCase() === previewQ.data.email.toLowerCase() &&
      !accepted &&
      !acceptMut.isPending
    ) {
      acceptMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.email, previewQ.data]);

  if (!token) {
    return <CenteredCard><BadInvite message="No invitation token in the link." /></CenteredCard>;
  }
  if (previewQ.isLoading) {
    return <CenteredCard><div className="text-slate-600">Loading invitation…</div></CenteredCard>;
  }
  if (previewQ.isError) {
    const msg = (previewQ.error as any)?.message || "This invitation is no longer valid.";
    return <CenteredCard><BadInvite message={msg} /></CenteredCard>;
  }

  const inv = previewQ.data!;
  const roleLabel = ROLE_LABEL[inv.role] || inv.role;

  if (accepted || acceptMut.isSuccess) {
    return (
      <CenteredCard>
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 mb-1">You're in</h1>
          <p className="text-sm text-slate-600 mb-5">
            Welcome to <strong>{inv.businessName}</strong> as <strong>{roleLabel}</strong>.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
        </div>
      </CenteredCard>
    );
  }

  // Not signed in OR signed in with the wrong email.
  if (!isAuthenticated) {
    const next = `/invite/accept?token=${encodeURIComponent(token)}`;
    return (
      <CenteredCard>
        <Header inv={inv} roleLabel={roleLabel} />
        <p className="text-sm text-slate-600 mb-5">
          Sign in or create an account using <strong>{inv.email}</strong> to accept.
        </p>
        <div className="flex flex-col gap-2">
          <Link to={`/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(inv.email)}`}>
            <Button className="w-full">Sign in</Button>
          </Link>
          <Link to={`/signup?next=${encodeURIComponent(next)}&email=${encodeURIComponent(inv.email)}`}>
            <Button variant="secondary" className="w-full">Create account</Button>
          </Link>
        </div>
      </CenteredCard>
    );
  }

  if (user?.email?.toLowerCase() !== inv.email.toLowerCase()) {
    return (
      <CenteredCard>
        <BadInvite
          message={`This invitation was sent to ${inv.email}, but you're signed in as ${user?.email}. Sign out and sign back in with the invited email.`}
        />
      </CenteredCard>
    );
  }

  if (acceptMut.isError) {
    return (
      <CenteredCard>
        <BadInvite message={(acceptMut.error as any)?.message || "Failed to accept invitation."} />
      </CenteredCard>
    );
  }

  return <CenteredCard><div className="text-slate-600">Accepting your invitation…</div></CenteredCard>;
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md w-full">
        <Card>{children}</Card>
      </div>
    </div>
  );
}

function Header({ inv, roleLabel }: { inv: Preview; roleLabel: string }) {
  return (
    <>
      <p className="text-xs font-semibold tracking-wide uppercase text-blue-600 mb-2">QuotePro Invitation</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Join {inv.businessName}</h1>
      <p className="text-sm text-slate-600 mb-4">
        You've been invited as <strong>{roleLabel}</strong>.
      </p>
    </>
  );
}

function BadInvite({ message }: { message: string }) {
  return (
    <div className="text-center">
      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
      <h1 className="text-xl font-bold text-slate-900 mb-1">Invitation problem</h1>
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}
