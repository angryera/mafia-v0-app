import { redirect } from "next/navigation";

export default function KillAttemptRedirectPage() {
  redirect("/attempted-kills");
}
