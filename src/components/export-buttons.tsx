"use client";

import { Download, Printer, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadCSV, printPage } from "@/lib/export";

type Props = {
  filename: string;
  rows?: Array<Record<string, unknown>>;
  showCSV?: boolean;
  showPrint?: boolean;
  showPDF?: boolean;
};

export function ExportButtons({ filename, rows, showCSV = true, showPrint = true, showPDF = true }: Props) {
  const doCSV = () => {
    if (!rows || rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    downloadCSV(filename, rows);
    toast.success(`Exported ${rows.length} rows to CSV`);
  };

  const doPDF = () => {
    toast.success("Opening print dialog — save as PDF from there");
    setTimeout(printPage, 200);
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      {showPrint && (
        <Button variant="secondary" size="sm" onClick={printPage}>
          <Printer /> Print
        </Button>
      )}
      {showCSV && (
        <Button variant="secondary" size="sm" onClick={doCSV}>
          <Download /> Export CSV
        </Button>
      )}
      {showPDF && (
        <Button size="sm" onClick={doPDF}>
          <FileText /> Export PDF
        </Button>
      )}
    </div>
  );
}
