import { redirect } from "next/navigation";

export default function SettingsPreferencesRedirect() {
  redirect("/profile/preferences");
}
