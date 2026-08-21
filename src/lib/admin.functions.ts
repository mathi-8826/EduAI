import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: admin access required");
}

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as { supabase: any; userId: string });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles, error }, { data: results }, { data: subs }, { data: roles }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, college, department, year, created_at")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("vqr_results").select("user_id, score, total"),
        supabaseAdmin.from("coding_submissions").select("user_id, status, question_id"),
        supabaseAdmin.from("user_roles").select("user_id, role"),
      ]);

    if (error) throw new Error(error.message);

    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));

    const students = (profiles ?? [])
      .filter((p) => !adminIds.has(p.id))
      .map((p) => {
        const mine = (results ?? []).filter((r) => r.user_id === p.id);
        const avg = mine.length
          ? Math.round(mine.reduce((a, r) => a + (r.total ? (r.score / r.total) * 100 : 0), 0) / mine.length)
          : 0;
        const solved = new Set(
          (subs ?? []).filter((s) => s.user_id === p.id && s.status === "accepted").map((s) => s.question_id),
        ).size;
        return {
          id: p.id,
          full_name: p.full_name || "—",
          email: p.email || "—",
          college: p.college || "—",
          department: p.department || "—",
          year: p.year || "—",
          created_at: p.created_at,
          tests_taken: mine.length,
          avg_score: avg,
          coding_attempts: (subs ?? []).filter((s) => s.user_id === p.id).length,
          coding_solved: solved,
        };
      });

    return { students };
  });

export const resetStudentProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { studentId: string }) => {
    if (!data?.studentId || typeof data.studentId !== "string") throw new Error("studentId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as { supabase: any; userId: string });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    for (const table of ["vqr_results", "coding_submissions", "ai_feedback"] as const) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", data.studentId);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { studentId: string }) => {
    if (!data?.studentId || typeof data.studentId !== "string") throw new Error("studentId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as { supabase: any; userId: string });

    if (data.studentId === (context as { userId: string }).userId) {
      throw new Error("You cannot delete your own account");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.studentId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleRow) throw new Error("Cannot delete an admin account");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.studentId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
