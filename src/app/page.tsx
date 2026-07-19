import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/utils";

export default async function HomePage() { const user = await getCurrentUser(); redirect(user ? roleHome(user.role) : "/login"); }
