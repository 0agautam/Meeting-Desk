import { redirect } from "next/navigation";

/** The app has no landing page: staff start on their request list. */
export default function Home() {
  redirect("/requests");
}
