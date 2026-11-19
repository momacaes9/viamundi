import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { PostsList } from "./PostsList";
import { PostEditor } from "./PostEditor";
import { LeadsPage } from "./LeadsPage";
import { OrdersPage } from "./OrdersPage";
import { useDocumentTitle } from "../lib/i18n";

export default function EditorShell() {
  useDocumentTitle("Painel");
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await signOut();
    navigate("/editor/login", { replace: true });
  }

  return (
    <div className="ed">
      <aside className="ed-side">
        <a href="/" className="ed-brand" title="Ver site">
          <img src="/img/viamundi-logo.png" alt="" width="36" height="36" />
          <span>
            VIA<b>MUNDI</b>
          </span>
        </a>
        <nav className="ed-nav">
          <NavLink to="/editor/posts">Artigos</NavLink>
          <NavLink to="/editor/leads">Leads</NavLink>
          <NavLink to="/editor/pedidos">Pagamentos</NavLink>
        </nav>
        <div className="ed-user">
          <span className="ed-email" title={session?.user.email}>
            {session?.user.email}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </aside>
      <main className="ed-main">
        <Routes>
          <Route index element={<Navigate to="posts" replace />} />
          <Route path="posts" element={<PostsList />} />
          <Route path="posts/novo" element={<PostEditor />} />
          <Route path="posts/:id" element={<PostEditor />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="pedidos" element={<OrdersPage />} />
          <Route path="*" element={<Navigate to="posts" replace />} />
        </Routes>
      </main>
    </div>
  );
}
