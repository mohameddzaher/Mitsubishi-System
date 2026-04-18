"use client";

import * as React from "react";
import { Download, Printer, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadCSV, printPage } from "@/lib/export";

export function ReportActions({ template }: { template: string }) {
  const [loading, setLoading] = React.useState(false);

  async function fetchAndExport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${template}/export`);
      if (!res.ok) throw new Error("Export failed");
      const data = (await res.json()) as { rows: Array<Record<string, unknown>>; filename: string };
      if (!data.rows.length) {
        toast.error("No data to export");
        return;
      }
      downloadCSV(data.filename, data.rows);
      toast.success(`Exported ${data.rows.length} rows`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  function doPrint() {
    toast.success("Opening print dialog — save as PDF from there");
    setTimeout(printPage, 200);
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button variant="secondary" size="sm" onClick={printPage}>
        <Printer /> Print
      </Button>
      <Button variant="secondary" size="sm" onClick={fetchAndExport} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <Download />}
        Export CSV
      </Button>
      <Button size="sm" onClick={doPrint}>
        <FileText /> Save as PDF
      </Button>
    </div>
  );
}
