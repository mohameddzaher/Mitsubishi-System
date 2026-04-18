import { redirect } from "next/navigation";

export default function NewLeadRedirect() {
  redirect("/customers/new");
}
