import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Shield, Lock, User as UserIcon, Users, LogOut, ChevronDown, ChevronUp, Trash2, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listStudents, deleteStudent, resetStudentProgress } from "@/lib/admin.functions";

const ADMIN_EMAIL = "admin@prepai.local";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Dashboard — EduAI" },
      { name: "description", content: "EduAI admin console for reviewing registered students and their prep progress." },
      { property: "og:title", content: "Admin Dashboard — EduAI" },
      { property: "og:description", content: "EduAI admin console for reviewing registered students and their prep progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Student = Awaited<ReturnType<typeof listStudents>>["students"][number];

function AdminPage() {
  const fetchStudents = useServerFn(listStudents);
  const removeStudent = useServerFn(deleteStudent);
  const resetStudent = useServerFn(resetStudentProgress);
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showStudents, setShowStudents] = useState(false);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(data.user?.email === ADMIN_EMAIL);
      setChecking(false);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const email = username.includes("@") ? username.trim() : `${username.trim().toLowerCase()}@prepai.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error || data.user?.email !== ADMIN_EMAIL) {
      toast.error("Invalid admin credentials");
      return;
    }
    setAuthed(true);
    toast.success("Welcome, admin");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthed(false);
    setShowStudents(false);
    setStudents(null);
  };

  const handleToggleStudents = async () => {
    if (showStudents) {
      setShowStudents(false);
      return;
    }
    setShowStudents(true);
    if (students) return;
    setLoadingStudents(true);
    try {
      const res = await fetchStudents();
      setStudents(res.students);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load students");
      setShowStudents(false);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleDelete = async (student: Student) => {
    if (!window.confirm(`Delete ${student.full_name} (${student.email})? This removes their account permanently.`)) return;
    setDeletingId(student.id);
    try {
      await removeStudent({ data: { studentId: student.id } });
      setStudents((prev) => (prev ? prev.filter((s) => s.id !== student.id) : prev));
      toast.success("Student deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete student");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReset = async (student: Student) => {
    if (!window.confirm(`Reset all test history and analytics for ${student.full_name}? This cannot be undone.`)) return;
    setResettingId(student.id);
    try {
      await resetStudent({ data: { studentId: student.id } });
      setStudents((prev) =>
        prev
          ? prev.map((s) =>
              s.id === student.id
                ? { ...s, tests_taken: 0, avg_score: 0, coding_attempts: 0, coding_solved: 0 }
                : s,
            )
          : prev,
      );
      toast.success("Progress reset");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset progress");
    } finally {
      setResettingId(null);
    }
  };


  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-card p-8 space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center">
              <Shield className="size-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin Login</h1>
              <p className="text-xs text-muted-foreground">Restricted access</p>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Username</span>
            <div className="relative">
              <UserIcon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="admin"
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Password</span>
            <div className="relative">
              <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-primary text-primary-foreground py-2.5 text-sm font-semibold shadow-glow disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground">
              <Shield className="size-4" />
            </div>
            Admin Console
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-muted" aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="rounded-2xl bg-gradient-hero p-8 text-primary-foreground shadow-glow">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 opacity-90">Manage and review every student registered on EduAI.</p>
        </div>

        <button
          onClick={handleToggleStudents}
          aria-expanded={showStudents}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary text-primary-foreground px-5 py-3 text-sm font-semibold shadow-glow"
        >
          {showStudents ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          Student Details
        </button>

        {showStudents && (
          <section className="rounded-2xl border border-border/60 bg-card shadow-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="size-4 text-primary" />
              <h2 className="font-semibold">Student Details</h2>
              {students && (
                <span className="text-xs text-muted-foreground">({students.length} registered)</span>
              )}
            </div>

            {loadingStudents ? (
              <div className="py-10 flex items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : students && students.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border/60">
                      <th className="py-2 pr-4 font-medium">Name</th>
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">College</th>
                      <th className="py-2 pr-4 font-medium">Department</th>
                      <th className="py-2 pr-4 font-medium">Year</th>
                      <th className="py-2 pr-4 font-medium">Tests</th>
                      <th className="py-2 pr-4 font-medium">Avg Score</th>
                      <th className="py-2 pr-4 font-medium">Coding</th>
                      <th className="py-2 font-medium">Joined</th>
                      <th className="py-2 pl-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id} className="border-b border-border/40 last:border-0">
                        <td className="py-3 pr-4 font-medium">{s.full_name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{s.email}</td>
                        <td className="py-3 pr-4">{s.college}</td>
                        <td className="py-3 pr-4">{s.department}</td>
                        <td className="py-3 pr-4">{s.year}</td>
                        <td className="py-3 pr-4">{s.tests_taken}</td>
                        <td className="py-3 pr-4">{s.avg_score}%</td>
                        <td className="py-3 pr-4">
                          {s.coding_solved}/{s.coding_attempts}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleReset(s)}
                              disabled={resettingId === s.id}
                              aria-label={`Reset progress for ${s.full_name}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border text-foreground px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                            >
                              {resettingId === s.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="size-3.5" />
                              )}
                              Reset
                            </button>
                            <button
                              onClick={() => handleDelete(s)}
                              disabled={deletingId === s.id}
                              aria-label={`Delete ${s.full_name}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 text-destructive px-2.5 py-1.5 text-xs font-medium hover:bg-destructive/10 disabled:opacity-50"
                            >
                              {deletingId === s.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                              Delete
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No students registered yet.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
