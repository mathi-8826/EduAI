import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, Flame, CheckCircle2, Trophy, Star, Crown, ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/badges")({
  head: () => ({
    meta: [
      { title: "My Badges — EduAI" },
      { name: "description", content: "Track your login streak and view your current active achievement badge." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BadgesPage,
});

type BadgeLevel = {
  level: string;
  days: number;
  icon: string;
  description: string;
};

const BADGE_LEVELS: BadgeLevel[] = [
  { level: "Rookie", days: 1, icon: "🥉", description: "Log in for 1 day" },
  { level: "Apprentice", days: 7, icon: "🥈", description: "Log in for 7 consecutive days" },
  { level: "Warrior", days: 15, icon: "🏆", description: "Log in for 15 consecutive days" },
  { level: "Elite", days: 30, icon: "⭐", description: "Log in for 30 consecutive days" },
  { level: "Legend", days: 60, icon: "👑", description: "Log in for 60 consecutive days" },
];

function getHighestBadgeForStreak(streak: number) {
  let highest = "Rookie";
  for (const b of BADGE_LEVELS) {
    if (streak >= b.days) {
      highest = b.level;
    }
  }
  return highest;
}

function BadgesPage() {
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState({ currentStreak: 1, longestStreak: 1 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) return;

        const userId = userRes.user.id;

        const { data: streak } = await supabase
          .from("login_streaks")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        const currentStreak = streak?.current_streak || 1;
        const longestStreak = streak?.longest_streak || currentStreak;
        setStreakData({ currentStreak, longestStreak });
      } catch (err) {
        console.warn("Error loading badge data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentStreak = streakData.currentStreak || 1;
  const highestBadgeLevelName = getHighestBadgeForStreak(currentStreak);

  const currentIdx = BADGE_LEVELS.findIndex((b) => b.level === highestBadgeLevelName);
  const activeBadgeObj = BADGE_LEVELS[currentIdx >= 0 ? currentIdx : 0];
  const nextBadgeObj = currentIdx >= 0 && currentIdx < BADGE_LEVELS.length - 1 ? BADGE_LEVELS[currentIdx + 1] : null;

  let progressPct = 100;
  let daysRemaining = 0;

  if (nextBadgeObj) {
    const currentReq = activeBadgeObj.days;
    const nextReq = nextBadgeObj.days;
    daysRemaining = Math.max(0, nextReq - currentStreak);
    progressPct = Math.min(100, Math.max(0, Math.round(((currentStreak - currentReq) / (nextReq - currentReq)) * 100)));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-muted-foreground">
        Loading your achievements & badges...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="border-b bg-card/40">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Award className="size-8 text-amber-500" /> My Badges & Login Streak
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Keep your streak alive by logging in daily to upgrade your active status badge!
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Featured Current Achieved Badge Card */}
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-card to-card p-8 text-center shadow-lg relative overflow-hidden">
          <div className="size-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 border-4 border-amber-500 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            {activeBadgeObj.icon}
          </div>

          <span className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
            Current Achieved Badge
          </span>

          <h2 className="text-3xl font-extrabold text-amber-500 mt-1 mb-2">
            {activeBadgeObj.level}
          </h2>

          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            {activeBadgeObj.description}
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <ShieldCheck className="size-4" /> Active Status Badge
          </div>
        </div>

        {/* Overview Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Login Streak Card */}
          <div className="rounded-2xl border bg-card p-6 flex items-center gap-4 border-rose-500/30">
            <div className="size-14 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center text-2xl shadow-glow">
              🔥
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                Login Streak
              </span>
              <h3 className="text-2xl font-extrabold text-rose-500">
                {currentStreak} {currentStreak === 1 ? "Day" : "Days"}
              </h3>
              <span className="text-xs text-muted-foreground">
                Longest: {streakData.longestStreak} days
              </span>
            </div>
          </div>

          {/* Next Badge Progress Card */}
          <div className="rounded-2xl border bg-card p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2">
              <span>Progress to Next Level</span>
              <span className={nextBadgeObj ? "text-primary font-extrabold text-sm" : "text-amber-500 font-extrabold text-sm"}>
                {nextBadgeObj ? `${nextBadgeObj.level} (${nextBadgeObj.days} Days)` : "Maximum Badge Level Achieved! 🎉"}
              </span>
            </div>

            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Current: {currentStreak} Days</span>
              <span>{nextBadgeObj ? `${daysRemaining} days remaining` : "Legend Level"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

