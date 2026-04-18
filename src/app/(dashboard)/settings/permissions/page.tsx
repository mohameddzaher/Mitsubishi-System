import { redirect } from "next/navigation";

export default function SettingsPermissionsRedirect() {
  redirect("/settings/roles");
}
