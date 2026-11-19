import { useDocumentTitle, useLang } from "../lib/i18n";
import { CONSENT_VERSION } from "../lib/whatsapp";

// Written against LGPD (Lei 13.709/2018) arts. 7, 9, 14 and 18, ANPD Enunciado CD/ANPD nº 1/2023,
// and the FTC COPPA Rule (16 CFR 312). Have a lawyer review before relying on it commercially.
// When this text changes, bump CONSENT_VERSION in src/lib/whatsapp.ts.
const CONTACT = "contatojuliatomasi@gmail.com";

export function PrivacyPage() {
  const { lang } = useLang();
  useDocumentTitle(lang === "en" ? "Privacy Policy" : "Política de Privacidade");
  return <article className="page article prose-page">{lang === "en" ? <En /> : <Pt />}</article>;
}

function Pt() {
  return (
    <div className="prose">
      <p className="eyebrow">Versão {CONSENT_VERSION}</p>
      <h1 className="h-serif xl">Política de Privacidade</h1>
      <p className="lead">Explicamos aqui, em linguagem simples, quais dados coletamos, por quê e como você controla eles.</p>
      <h2>Quem somos</h2>
      <p>
        A Viamundi oferece mentoria de admissões internacionais. Somos a controladora dos dados tratados neste site. Contato e encarregado de dados (DPO):{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
      <h2>Quais dados coletamos</h2>
      <ul>
        <li><strong>Formulário de contato:</strong> nome, e-mail e telefone (opcionais), interesse, país, mensagem, se quem preenche é estudante ou responsável, e a data do seu aceite desta política.</li>
        <li><strong>Inscrições pagas:</strong> nome, e-mail, programa e status do pagamento. Os dados do cartão ficam só com o Stripe. Nós nunca vemos nem armazenamos esses dados.</li>
        <li><strong>Parâmetros de campanha</strong> (utm) do link que trouxe você ao site, quando houver.</li>
      </ul>
      <p>Não usamos cookies de rastreamento, anúncios nem perfis de comportamento. Não pedimos data de nascimento.</p>
      <h2>Para que usamos e com qual base legal</h2>
      <ul>
        <li>Responder ao seu pedido de contato e preparar uma proposta: procedimentos preliminares a contrato, a seu pedido (LGPD art. 7º, V), e seu consentimento (art. 7º, I).</li>
        <li>Executar a mentoria contratada e emitir cobranças: execução de contrato (art. 7º, V).</li>
        <li>Cumprir obrigações legais e fiscais (art. 7º, II).</li>
      </ul>
      <h2>Crianças e adolescentes</h2>
      <p>
        Tratamos dados de adolescentes sempre no seu melhor interesse (LGPD art. 14 e Enunciado ANPD nº 1/2023). Menores de 13 anos não devem usar o formulário. Nesses casos, um pai, mãe ou responsável deve entrar em contato por eles. Se percebermos que recebemos dados de uma criança menor de 13 anos sem o envolvimento de um responsável, apagamos esses dados.
      </p>
      <h2>Com quem compartilhamos</h2>
      <p>Apenas com fornecedores necessários para o serviço funcionar, que tratam os dados em nosso nome:</p>
      <ul>
        <li><strong>Supabase:</strong> banco de dados e login da equipe.</li>
        <li><strong>Vercel:</strong> hospedagem do site.</li>
        <li><strong>Stripe:</strong> pagamentos.</li>
        <li><strong>WhatsApp (Meta):</strong> somente quando você decide abrir a conversa.</li>
      </ul>
      <p>Esses serviços podem armazenar dados fora do Brasil, com as garantias do art. 33 da LGPD. Nunca vendemos seus dados.</p>
      <h2>Por quanto tempo guardamos</h2>
      <p>Contatos que não viram contrato são apagados em até 24 meses. Dados de clientes ficam guardados pelo prazo exigido por lei (fiscal e contábil).</p>
      <h2>Seus direitos</h2>
      <p>
        Você pode pedir, a qualquer momento: confirmação e acesso aos seus dados, correção, anonimização ou eliminação, portabilidade, informações sobre compartilhamento e revogação do consentimento (LGPD art. 18). Basta escrever para{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Respondemos em até 15 dias. Você também pode reclamar à ANPD (gov.br/anpd).
      </p>
      <h2>Segurança</h2>
      <p>Usamos conexão criptografada (HTTPS), controle de acesso por linha no banco de dados e acesso restrito à equipe com login sem senha. Avisaremos você e a ANPD se houver um incidente relevante (art. 48).</p>
    </div>
  );
}

function En() {
  return (
    <div className="prose">
      <p className="eyebrow">Version {CONSENT_VERSION}</p>
      <h1 className="h-serif xl">Privacy Policy</h1>
      <p className="lead">In plain language: what we collect, why, and how you stay in control.</p>
      <h2>Who we are</h2>
      <p>
        Viamundi provides international admissions mentoring and is the controller of data processed on this site. Contact and data protection officer:{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Contact form:</strong> name, optional email and phone, interest, country, message, whether a student or a parent/guardian is submitting, and when you accepted this policy.</li>
        <li><strong>Paid enrollments:</strong> name, email, program and payment status. Card details are handled only by Stripe. We never see or store them.</li>
        <li><strong>Campaign parameters</strong> (utm) from the link that brought you here, if any.</li>
      </ul>
      <p>We use no tracking cookies, ads or behavioral profiling. We do not ask for your date of birth.</p>
      <h2>Why we use it</h2>
      <ul>
        <li>To answer your request and prepare a proposal (pre-contract steps you asked for, and your consent).</li>
        <li>To deliver mentoring you purchased and bill for it (contract).</li>
        <li>To meet legal and tax obligations.</li>
      </ul>
      <h2>Children and teens</h2>
      <p>
        This site is not directed to children under 13, and the contact form must not be used by them. A parent or guardian should contact us on their behalf. If we learn we collected personal information from a child under 13 without a parent's involvement, we delete it (COPPA, 16 CFR 312). Teen data is handled in the teen's best interest.
      </p>
      <h2>Who we share it with</h2>
      <p>Only with service providers that run the service for us:</p>
      <ul>
        <li><strong>Supabase:</strong> database and staff sign-in.</li>
        <li><strong>Vercel:</strong> hosting.</li>
        <li><strong>Stripe:</strong> payments.</li>
        <li><strong>WhatsApp (Meta):</strong> only when you choose to open the chat.</li>
      </ul>
      <p>These providers may store data outside your country. We never sell your data.</p>
      <h2>Retention</h2>
      <p>Inquiries that don't become clients are deleted within 24 months. Client records are kept as long as tax and accounting law requires.</p>
      <h2>Your rights</h2>
      <p>
        You can ask to access, correct, delete or export your data, or withdraw consent, at any time. Email{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We reply within 15 days.
      </p>
      <h2>Security</h2>
      <p>We use HTTPS, row-level access control in our database, and passwordless sign-in restricted to our team. We will notify you and the relevant authorities of any significant incident.</p>
    </div>
  );
}
