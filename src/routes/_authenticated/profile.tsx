import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — EduAI" },
      { name: "description", content: "Manage your EduAI profile: name, college, department, year, LinkedIn and profile photo." },
      { property: "og:title", content: "Your Profile — EduAI" },
      { property: "og:description", content: "Manage your EduAI student profile details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  full_name: string;
  college: string;
  department: string;
  year: string;
  email: string;
  linkedin_url: string;
  avatar_url: string;
};

const EMPTY: Profile = { full_name: "", college: "", department: "", year: "", email: "", linkedin_url: "", avatar_url: "" };

function ProfilePage() {
  const [form, setForm] = useState<Profile>(EMPTY);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPhoto = async (path: string) => {
    if (!path) return setPhotoUrl(null);
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
    setPhotoUrl(data?.signedUrl ?? null);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setLoading(false);
      setUserId(data.user.id);
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      if (prof) {
        setForm({ ...EMPTY, ...(prof as Partial<Profile>) } as Profile);
        await loadPhoto((prof as { avatar_url?: string }).avatar_url ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        college: form.college,
        department: form.department,
        year: form.year,
        linkedin_url: form.linkedin_url,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
    setUploading(false);
    if (error) return toast.error(error.message);
    setForm((f) => ({ ...f, avatar_url: path }));
    await loadPhoto(path);
    toast.success("Photo updated");
  };

  const initials = (form.full_name || form.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background p-8">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <div className="mx-auto max-w-xl mt-8 rounded-2xl border border-border/60 bg-gradient-card shadow-card p-8">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Keep your details up to date.</p>

        {loading ? (
          <p className="text-muted-foreground mt-8">Loading…</p>
        ) : (
          <>
            <div className="mt-8 flex items-center gap-5">
              <div className="relative">
                <div className="size-24 rounded-full overflow-hidden bg-gradient-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  {photoUrl ? (
                    <img src={photoUrl} alt={`${form.full_name || "Student"} profile photo`} className="size-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card hover:opacity-90 disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </div>
              <div>
                <div className="font-semibold">{form.full_name || "Student"}</div>
                <div className="text-sm text-muted-foreground">{form.email}</div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <Field label="Full name" value={form.full_name} onChange={set("full_name")} placeholder="Your name" />
              <div>
                <label className="text-sm font-medium">Email</label>
                <div className="mt-1 w-full rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {form.email || "—"}
                </div>
              </div>
              <Field label="College" value={form.college} onChange={set("college")} placeholder="College name" />
              <Field label="Department" value={form.department} onChange={set("department")} placeholder="e.g. CSE" />
              <Field label="Year" value={form.year} onChange={set("year")} placeholder="e.g. 3rd year" />
              <Field label="LinkedIn ID" value={form.linkedin_url} onChange={set("linkedin_url")} placeholder="linkedin.com/in/username" />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save changes
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}
