import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      <style>{`
        body {
          font-family: Arial, Helvetica, sans-serif;
          background: #ececec;
          color: #1f3f93;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        * {
          box-sizing: border-box;
        }
        .page-wrapper {
          width: 100%;
        }
        .hero-section {
          width: 100%;
          background: #ddd;
        }
        .hero-image {
          width: 100%;
          height: auto;
          display: block;
        }
        .content-card {
          width: calc(100% - 60px);
          max-width: 690px;
          margin: 14px auto 22px;
          background: #ffffff;
          border-radius: 14px;
          padding: 36px 24px 40px;
          text-align: center;
        }
        .logo-icon {
          width: 80px;
          max-width: 100%;
          display: block;
          margin: 0 auto 8px;
        }
        .logo-text {
          width: 320px;
          max-width: 88%;
          display: block;
          margin: 0 auto 26px;
        }
        .headline {
          font-size: 19px;
          line-height: 1.35;
          font-weight: 700;
          color: #1d4fb4;
          margin-bottom: 24px;
        }
        .subheadline {
          font-size: 18px;
          line-height: 1.35;
          color: #333333;
          margin-bottom: 26px;
        }
        .cta-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 294px;
          max-width: 100%;
          min-height: 50px;
          padding: 14px 28px;
          background: #2552b5;
          color: #ffffff;
          text-decoration: none;
          font-size: 18px;
          font-weight: 700;
          border-radius: 999px;
          transition: opacity 0.2s ease;
        }
        .cta-button:hover {
          opacity: 0.92;
        }
        .site-footer {
          margin-top: 28px;
          padding-top: 22px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }
        .footer-links {
          display: flex;
          justify-content: center;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .footer-links a {
          color: #2552b5;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
        }
        .footer-links a:hover {
          text-decoration: underline;
        }
        .footer-note {
          margin-top: 14px;
          color: #6b7280;
          font-size: 13px;
          line-height: 1.6;
        }
        @media (max-width: 768px) {
          .content-card {
            width: calc(100% - 30px);
            padding: 30px 20px 34px;
          }
          .logo-icon {
            width: 72px;
          }
          .logo-text {
            width: 290px;
            margin-bottom: 22px;
          }
          .headline {
            font-size: 17px;
            margin-bottom: 20px;
          }
          .subheadline {
            font-size: 17px;
            margin-bottom: 24px;
          }
          .cta-button {
            width: 280px;
            font-size: 17px;
          }
        }
        @media (max-width: 480px) {
          .content-card {
            width: calc(100% - 20px);
            margin: 10px auto 16px;
            border-radius: 12px;
            padding: 28px 18px 30px;
          }
          .logo-icon {
            width: 64px;
            margin-bottom: 6px;
          }
          .logo-text {
            width: 250px;
            max-width: 92%;
            margin-bottom: 18px;
          }
          .headline {
            font-size: 15px;
            line-height: 1.4;
          }
          .subheadline {
            font-size: 15px;
            line-height: 1.35;
          }
          .cta-button {
            width: 100%;
            font-size: 16px;
            min-height: 48px;
          }
          .footer-links {
            gap: 12px;
          }
          .footer-links a {
            font-size: 12px;
          }
        }
      `}</style>
      <main className="page-wrapper">
        <section className="hero-section">
          <img
            src="https://www.desenrolebrasil.online/images/hero.png"
            alt="Pessoa segurando celular com tela de consulta"
            className="hero-image"
          />
        </section>
        <section className="content-card">
          <img
            src="https://www.desenrolebrasil.online/images/logo-icon.png"
            alt="Ícone Desenrola Brasil"
            className="logo-icon"
          />
          <img
            src="https://www.desenrolebrasil.online/images/logo-text.png"
            alt="Desenrola Brasil"
            className="logo-text"
          />
          <h1 className="headline">
            O Programa Desenrola Brasil<br />
            possibilita a renegociação de dívidas<br />
            com descontos de até 99%
          </h1>
          <p className="subheadline">
            Clique no botão abaixo para<br />
            acessar a plataforma
          </p>
          <Link to="/cpf" className="cta-button">
            ACESSAR AGORA
          </Link>
          <footer className="site-footer">
            <div className="footer-links">
              <Link to="/politica-de-privacidade">Política de Privacidade</Link>
              <Link to="/termos-de-uso">Termos de Uso</Link>
            </div>
            <p className="footer-note">
              Serviço de consulta e orientação para regularização<br />
              Condições sujeitas a análise. Este site não é um portal do governo.
            </p>
          </footer>
        </section>
      </main>
    </>
  );
}
