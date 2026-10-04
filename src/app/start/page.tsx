import { getAuthUserId } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import FirstExperience from "../firstExperience/FirstExperience";

export default async function StartPage() {
  const isAuthenticated = Boolean(await getAuthUserId());
  return <AppShell><FirstExperience isAuthenticated={isAuthenticated} /></AppShell>;
}
