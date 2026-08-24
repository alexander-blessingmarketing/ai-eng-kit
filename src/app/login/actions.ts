"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; rateLimited?: boolean };

export async function loginAction(
  email: string,
  password: string,
): Promise<LoginResult> {
  const h = await headers();
  const ip = getClientIp(h);

  const allowed = await checkRateLimit(ip, "login");
  if (!allowed) {
    return {
      ok: false,
      rateLimited: true,
      error: "Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, error: "Ungültige Anmeldedaten. Bitte versuchen Sie es erneut." };
  }

  return { ok: true };
}
