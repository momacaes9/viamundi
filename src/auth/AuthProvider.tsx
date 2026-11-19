import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthState = {
  session: Session | null;
  loading: boolean;
  /** null = not checked yet; resolved by asking the database (is_editor RPC), never by the client. */
  isEditor: boolean | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const IDLE_LIMIT_MS = 60 * 60 * 1000; // sign out after 1h without activity

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditor, setIsEditor] = useState<boolean | null>(null);
  const lastActivity = useRef(Date.now());

  const signOut = useCallback(async () => {
    await supabase.auth.signOut(); // revokes the refresh token server-side and clears local storage
    setSession(null);
    setIsEditor(null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setIsEditor(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Ask the database whether this account is on the editors allowlist.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setIsEditor(null);
    supabase.rpc("is_editor").then(({ data, error }) => {
      if (!cancelled) setIsEditor(!error && data === true);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Idle timeout for shared/public computers.
  useEffect(() => {
    if (!session) return;
    const bump = () => (lastActivity.current = Date.now());
    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current > IDLE_LIMIT_MS) void signOut();
    }, 60_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(timer);
    };
  }, [session, signOut]);

  const value = useMemo(() => ({ session, loading, isEditor, signOut }), [session, loading, isEditor, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
