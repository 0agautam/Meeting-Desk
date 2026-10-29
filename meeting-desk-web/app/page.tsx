import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { homePathFor } from "@/lib/auth/permissions";

/** No landing page: signed-in staff go to their own page, everyone else to sign-in. */
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? homePathFor(user) : "/login");
}
