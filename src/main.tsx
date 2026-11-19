import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./styles/app.css";
import { LangProvider } from "./lib/i18n";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireEditor } from "./auth/RequireEditor";
import { SiteLayout } from "./components/SiteLayout";
import { ComingSoon, NotFound } from "./pages/Simple";

// Each page is its own chunk: visitors only download the page they open.
const ContactPage = lazy(() => import("./pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const BlogIndex = lazy(() => import("./pages/BlogIndex").then((m) => ({ default: m.BlogIndex })));
const BlogPost = lazy(() => import("./pages/BlogPost").then((m) => ({ default: m.BlogPost })));
const ProgramsPage = lazy(() => import("./pages/ProgramsPage").then((m) => ({ default: m.ProgramsPage })));
const CheckoutResult = lazy(() => import("./pages/CheckoutResult").then((m) => ({ default: m.CheckoutResult })));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));

// The editor is only loaded for people who go to /editor.
const EditorLogin = lazy(() => import("./editor/EditorLogin"));
const EditorShell = lazy(() => import("./editor/EditorShell"));

function Public({ children }: { children: React.ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}

const Loading = () => (
  <div className="ed-center">
    <div className="spinner" aria-label="Carregando" />
  </div>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/contato" element={<Public><ContactPage /></Public>} />
              <Route path="/whatsapp" element={<Navigate to="/contato" replace />} />
              <Route path="/blog" element={<Public><BlogIndex /></Public>} />
              <Route path="/blog/:slug" element={<Public><BlogPost /></Public>} />
              <Route path="/programas" element={<Public><ProgramsPage /></Public>} />
              <Route path="/checkout/success" element={<Public><CheckoutResult kind="success" /></Public>} />
              <Route path="/checkout/cancel" element={<Public><CheckoutResult kind="cancel" /></Public>} />
              <Route path="/privacidade" element={<Public><PrivacyPage /></Public>} />
              <Route path="/oportunidades" element={<Public><ComingSoon /></Public>} />
              <Route path="/editor/login" element={<EditorLogin />} />
              <Route path="/editor/*" element={<RequireEditor><EditorShell /></RequireEditor>} />
              <Route path="*" element={<Public><NotFound /></Public>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  </StrictMode>,
);
