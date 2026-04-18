import { redirect } from "next/navigation";

export default function ReportIssueRedirect() {
  redirect("/portal/support/new");
}
