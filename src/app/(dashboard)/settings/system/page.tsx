import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CURRENCY, DEFAULT_LOCALE, VAT_RATE, MAKKAH_CENTER } from "@/config/constants";

export const dynamic = "force-dynamic";

export default function SystemPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="System preferences" description="Global defaults for the MELSA Mecca application" />
      <Card>
        <CardHeader><CardTitle>Regional</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Row label="Default locale">{DEFAULT_LOCALE}</Row>
          <Row label="Currency">{CURRENCY}</Row>
          <Row label="VAT rate">{(VAT_RATE * 100).toFixed(0)}%</Row>
          <Row label="Timezone">Asia/Riyadh</Row>
          <Row label="Default map center">{MAKKAH_CENTER.lat.toFixed(4)}, {MAKKAH_CENTER.lng.toFixed(4)}</Row>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Features</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Row label="Dark luxury theme"><Badge variant="success">Enabled</Badge></Row>
          <Row label="Arabic RTL"><Badge variant="outline">Phase 2</Badge></Row>
          <Row label="Customer portal"><Badge variant="success">Enabled</Badge></Row>
          <Row label="Real-time sync (Pusher)"><Badge variant="warning">Needs config</Badge></Row>
          <Row label="PDF generation"><Badge variant="warning">Phase 2</Badge></Row>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span>{children}</span>
    </div>
  );
}
