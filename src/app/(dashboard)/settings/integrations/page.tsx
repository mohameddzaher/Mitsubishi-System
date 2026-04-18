import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const INTEGRATIONS = [
  { name: "MongoDB Atlas", desc: "Primary datastore", status: "connected", icon: "💾" },
  { name: "NextAuth / Auth.js v5", desc: "Authentication", status: "connected", icon: "🔐" },
  { name: "Resend", desc: "Transactional email", status: "not_configured", icon: "✉️" },
  { name: "Pusher", desc: "Real-time WebSocket", status: "not_configured", icon: "📡" },
  { name: "Cloudflare R2", desc: "Photo & document storage", status: "not_configured", icon: "🗄️" },
  { name: "Google Maps Platform", desc: "Address geocoding + directions", status: "deep_link_only", icon: "🗺️" },
  { name: "ZATCA e-invoicing", desc: "QR code + VAT compliance", status: "ready", icon: "🧾" },
  { name: "Twilio / Unifonic SMS", desc: "SMS notifications (Phase 2)", status: "planned", icon: "📱" },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Integrations" description="External services connected to MELSA Mecca" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((i) => (
          <Card key={i.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <span>{i.icon}</span> {i.name}
              </CardTitle>
              <CardDescription>{i.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge
                variant={
                  i.status === "connected" || i.status === "ready"
                    ? "success"
                    : i.status === "not_configured"
                      ? "warning"
                      : "outline"
                }
              >
                {i.status.replace(/_/g, " ")}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
