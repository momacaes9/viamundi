import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";

/**
 * UI guard only — it decides what to SHOW. The real protection is Row-Level Security:
 * even if someone bypasses this component, the database returns nothing to non-editors.
 */
export function RequireEditor({ children }: { children: ReactNode }) {
  const { session, loading, isEditor, signOut } = useAuth();
  const location = useLocation();

  if (loading || (session && isEditor === null)) {
    return (
      <div className="ed-center">
        <div className="spinner" aria-label="Carregando" />
      </div>
    );
  }
  if (!session) return <Navigate to="/editor/login" replace state={{ from: location.pathname }} />;
  if (!isEditor) {
    return (
      <div className="ed-center">
        <div className="card narrow">
          <h1 className="h-serif">Sem acesso</h1>
          <p className="muted">Esta conta não está autorizada a usar o painel editorial.</p>
          <button className="btn btn-primary" onClick={() => void signOut()}>
            Sair
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
