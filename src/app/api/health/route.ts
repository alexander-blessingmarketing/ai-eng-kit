import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { status: "error", check: "database", message: error.message },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ status: "error", message }, { status: 503 });
  }
}
