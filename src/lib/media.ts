import video1 from "../assets/video15.mp4";
import desktopAudio from "../assets/Desktop2026.mp3";
import buscaacordoAudio from "../assets/buscaacordo.mp3";
import parabensAudio from "../assets/parabens.mp3";
import pagamentoAudio from "../assets/pagamento.mp3";
import avisoAudio from "../assets/aviso.mp3";

import limpenome from "../assets/limpenome.png";
import leticia from "../assets/leticiaatendente.png";
import logorodape from "../assets/logorodape.png";
import logocabecalho from "../assets/logocabecalho.png";
import iniciochat from "../assets/iniciochat.png";
import image2 from "../assets/image2.png";
import logoamarelo from "../assets/logoamarelo.png";

// Algumas imagens não estão no assets novo, então vou reaproveitar o que tem para não quebrar
const BASE = "https://ybtlwxqsfirulhrzddhv.supabase.co/storage/v1/object/public/desenrola-media";

export const media = {
  desenrola: logoamarelo, // Usando a nova logomarca aqui
  fundo: `${BASE}/fundo.png`,
  heroInicio: iniciochat, // Usando iniciochat como hero
  iconeFooter: logorodape,
  iconeGov: logocabecalho,
  image1: iniciochat,
  image2: image2, // Possivelmente as marcas
  leticia: leticia,
  limpeNome: limpenome,
  limpeNomeCpf: limpenome,
  logoAmarelo: logoamarelo, // Usando a nova logomarca aqui
  score: `${BASE}/score.png`, // Fallback se faltar
  video1: video1,
  audios: {
    desktop: desktopAudio,
    aviso: avisoAudio,
    buscaacordo: buscaacordoAudio,
    pagamento: pagamentoAudio,
    parabens: parabensAudio,
  },
} as const;
