import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { verifyTurnstile } from "@/lib/turnstile.functions";

export const Route = createFileRoute("/ajuste")({
  head: () => ({
    meta: [
      { title: "Ajuste — Conecte-se" },
      { name: "description", content: "Confirme para prosseguir." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Ajuste — Conecte-se" },
      { property: "og:description", content: "Confirme para prosseguir." },
    ],
  }),
  component: AjustePage,
});

const TURNSTILE_SITE_KEY = "0x4AAAAAAEpZHAi9xbFYaCQi";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

function AjustePage() {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const verify = useServerFn(verifyTurnstile);

  const resetWidget = useCallback(() => {
    setVerified(false);
    window.turnstile?.reset(widgetIdRef.current ?? undefined);
  }, []);

  useEffect(() => {
    const scriptId = "cf-turnstile-script";
    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    let cancelled = false;

    const onToken = async (token: string) => {
      setChecking(true);
      setErrorMsg(null);
      try {
        const result = await verify({ data: { token } });
        if (cancelled) return;
        if (result.success) {
          setVerified(true);
        } else {
          setErrorMsg("Não foi possível confirmar a verificação. Tente novamente.");
          resetWidget();
        }
      } catch {
        if (!cancelled) {
          setErrorMsg("Falha ao validar a verificação. Tente novamente.");
          resetWidget();
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    const tryRender = () => {
      if (window.turnstile && widgetRef.current && widgetRef.current.childElementCount === 0) {
        widgetIdRef.current = window.turnstile.render(widgetRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "light",
          action: "ajuste",
          callback: (token: string) => {
            void onToken(token);
          },
          "expired-callback": () => {
            setVerified(false);
            setErrorMsg("A verificação expirou. Confirme novamente.");
          },
          "timeout-callback": () => {
            setVerified(false);
            setErrorMsg("A verificação expirou. Confirme novamente.");
          },
          "error-callback": () => {
            setVerified(false);
            setErrorMsg("Erro na verificação. Tente novamente.");
          },
        });
        return true;
      }
      return false;
    };

    if (!tryRender()) {
      const i = setInterval(() => tryRender() && clearInterval(i), 300);
      return () => {
        cancelled = true;
        clearInterval(i);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [verify, resetWidget]);

  const handleAdvance = () => {
    if (!verified || checking) return;
    window.location.href = "/cpf";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10" style={{ backgroundColor: "#ece7fb" }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-[11px] font-semibold tracking-wider text-purple-700">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          CONECTE-SE COM A SENSE
        </div>

        <h1 className="mt-5 text-2xl font-bold text-gray-900 leading-tight">
          Seu próximo passo começa aqui
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "#6b4c9a" }}>
          Conclua a verificação abaixo para avançar ao próximo passo do atendimento.
        </p>

        <ul className="mt-6 space-y-4 text-left">
          {[
            "Estratégias digitais com experiência",
            "Proteção e respeito à sua privacidade",
            "Atendimento online sem complicação",
          ].map((t) => (
            <li key={t} className="flex items-start gap-3 text-[15px] font-medium" style={{ color: "#4a306d" }}>
              <span className="mt-0.5 text-purple-700">
                <Check className="h-5 w-5" />
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-center">
          <div ref={widgetRef} className="min-h-[65px]" />
        </div>

        {checking && (
          <p className="mt-3 text-[12px] text-gray-500">Validando verificação...</p>
        )}
        {errorMsg && (
          <p className="mt-3 text-[12px] font-medium text-red-600">{errorMsg}</p>
        )}

        <button
          type="button"
          onClick={handleAdvance}
          disabled={!verified || checking}
          className="mt-6 w-full rounded-lg px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#6d28d9" }}
        >
          Avançar
        </button>

        <p className="mt-5 text-[13px] leading-relaxed text-gray-500">
          Ao prosseguir, você aceita nossa{" "}
          <button
            type="button"
            onClick={() => setShowPolicy(true)}
            className="font-bold underline"
            style={{ color: "#6d28d9" }}
          >
            Política de Privacidade
          </button>
          .
        </p>

        <div className="mt-4">
          <p className="text-[13px] font-bold tracking-wide text-gray-600">
            AGÊNCIA SENSE MARKETING DIGITAL
          </p>
          <p className="text-[12px] text-gray-400">CNPJ 28.115.572/0001-35</p>
        </div>
      </div>

      {showPolicy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
          onClick={() => setShowPolicy(false)}
        >
          <div
            className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">Política de Privacidade</h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setShowPolicy(false)}
                className="shrink-0 text-2xl leading-none text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <section>
                <h3 className="text-[15px] font-bold text-gray-900">Controlador</h3>
                <p className="mt-1 text-sm leading-relaxed text-purple-900/70">
                  AGÊNCIA SENSE MARKETING DIGITAL, CNPJ 28.115.572/0001-35, com endereço na
                  Sala 1002, Jardim Tijuco, Guarulhos — SP, CEP 07020-010.
                </p>
              </section>

              <section>
                <h3 className="text-[15px] font-bold text-gray-900">Dados e finalidade</h3>
                <p className="mt-1 text-sm leading-relaxed text-purple-900/70">
                  Não são solicitados documentos, senhas ou dados financeiros nesta página.
                  Usamos apenas uma verificação antibot (CAPTCHA) para reduzir acessos
                  automatizados.
                </p>
              </section>

              <section>
                <h3 className="text-[15px] font-bold text-gray-900">
                  Compartilhamento e direitos
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-purple-900/70">
                  Não comercializamos dados. Você pode solicitar informações, correção ou
                  eliminação pelos canais oficiais da empresa, observadas as hipóteses legais
                  de retenção. Esta política segue a LGPD.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

