// Mídias servidas pelo Supabase Storage (bucket público desenrola-media).
const BASE = "https://ybtlwxqsfirulhrzddhv.supabase.co/storage/v1/object/public/desenrola-media";

import video1Asset from "../assets/video1.mp4.asset.json";
import desktopAudioAsset from "../assets/Desktop2026.mp3.asset.json";
import buscaacordoAudioAsset from "../assets/audios/buscaacordo.mp3.asset.json";
import parabensAudioAsset from "../assets/audios/parabens.mp3.asset.json";
import pagamentoAudioAsset from "../assets/audios/pagamento.mp3.asset.json";
import avisoAudioAsset from "../assets/audios/aviso.mp3.asset.json";
import image33Asset from "../assets/image-33.png.asset.json";
import image34Asset from "../assets/image-34.png.asset.json";
import image36Asset from "../assets/image-36.png.asset.json";
import limpenomeAsset from "../assets/limpenome.png.asset.json";
import leticiaAsset from "../assets/leticiaatendente.png.asset.json";
import logorodapeAsset from "../assets/logorodape.png.asset.json";
import scoreAsset from "../assets/score.jpg.asset.json";

// Variantes WebP otimizadas (hospedadas no bucket público desenrola-media/opt).
const OPT = `${BASE}/opt`;
export const mediaOpt = {
  fundo:       { x1: `${OPT}/fundo_1x.webp`,       x2: `${OPT}/fundo_2x.webp`,       w: 720, h: 222 },
  desenrola:   { x1: `${OPT}/desenrola_1x.webp`,   x2: `${OPT}/desenrola_2x.webp`,   w: 220, h: 60  },
  iconeGov:    { x1: `${OPT}/iconegov_1x.webp`,    x2: `${OPT}/iconegov_2x.webp`,    w: 132, h: 47  },
  logoAmarelo: { x1: `${OPT}/logoamarelo_1x.webp`, x2: `${OPT}/logoamarelo_2x.webp`, w: 54,  h: 64  },
  iconeFooter: { x1: `${OPT}/iconefooter_1x.webp`, x2: `${OPT}/iconefooter_2x.webp`, w: 120, h: 40  },
} as const;

export const media = {
  desenrola: "/assets/desenrola.png",
  fundo: "/assets/fundo.png",
  heroInicio: "/assets/lula.png", // Imagem do Lula
  iconeFooter: "/assets/logorodape.png",
  iconeGov: "/assets/logocabecalho.png",
  image1: "/assets/iniciochat.png",
  image2: "/assets/marcas.png", // Imagem das marcas
  leticia: "/assets/leticia.png", // Avatar da Letícia
  limpeNome: "/assets/limpenome.png",
  limpeNomeCpf: "/assets/limpenome.png",
  logoAmarelo: "/assets/logoamarelo.png",
  score: "/assets/score.jpg",
  video1: "/assets/video.mp4", // O vídeo que você irá colocar
  audios: {
    desktop: "/assets/desktop.mp3",
    aviso: "/assets/aviso.mp3",
    buscaacordo: "/assets/buscaacordo.mp3",
    pagamento: "/assets/pagamento.mp3",
    parabens: "/assets/parabens.mp3",
  },
} as const;
