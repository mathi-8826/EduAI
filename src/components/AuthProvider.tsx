import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Clean OAuth hash/query tokens from browser URL after session establishment
  const cleanOAuthUrl = () => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const search = window.location.search;

    const hasHashTokens =
      hash &&
      (hash.includes("access_token=") ||
        hash.includes("error=") ||
        hash.includes("refresh_token=") ||
        hash.includes("token_type="));

    const hasSearchCode = search && (search.includes("code=") || search.includes("error="));

    if (hasHashTokens || hasSearchCode) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, "", cleanUrl);
    }
  };

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data: adminRow } = await supabase
        .from("admin_profiles")
        .select("role, is_active")
        .eq("id", userId)
        .eq("role", "admin")
        .eq("is_active", true)
        .maybeSingle();

      return Boolean(adminRow);
    } catch {
      return false;
    }
  };

  const updateAuthState = async (currentSession: Session | null) => {
    if (currentSession?.user) {
      setSession(currentSession);
      setUser(currentSession.user);
      const admin = await checkAdminStatus(currentSession.user.id);
      setIsAdmin(admin);
      cleanOAuthUrl();
    } else {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
    }
    setLoading(false);
  };

  const refreshAuth = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    await updateAuthState(currentSession);
  };

  useEffect(() => {
    let mounted = true;

    // 1. Initial session retrieval when app starts
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (mounted) {
        updateAuthState(initialSession);
      }
    });

    // 2. Single global auth state change listener (OAuth redirect, sign in/out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        updateAuthState(currentSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, isAdmin, signOut, refreshAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
