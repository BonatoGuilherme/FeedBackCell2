/**
 * Celulares reais da vitrine (home e login). Fotos do Wikimedia Commons,
 * baixadas para public/phones; a licença exige crédito ao autor, mostrado
 * embaixo da vitrine.
 *
 * `recorte`: clip-path que corta o fundo da loja das fotos que não são
 * transparentes, deixando só o corpo do aparelho.
 */

export type CelularVitrine = {
  id: string;
  nome: string;
  src: string;
  /** largura / altura da imagem */
  proporcao: number;
  recorte?: string;
  autor: string;
  licenca: string;
  pagina: string;
};

export const VITRINE: CelularVitrine[] = [
  {
    id: "iphone-15-pro-max",
    nome: "iPhone 15 Pro Max",
    src: "/phones/iphone-15-pro-max.jpg",
    proporcao: 960 / 1886,
    recorte: "inset(1.4% 4.2% 0.4% 2.2% round 12% / 6%)",
    autor: "Ayamano2021",
    licenca: "CC BY 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Front_of_iPhone_15_Pro_Max.jpg",
  },
  {
    id: "oneplus-8t",
    nome: "OnePlus 8T",
    src: "/phones/oneplus-8t.png",
    proporcao: 960 / 2074,
    autor: "Willwongprd",
    licenca: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:OnePlus_8T_Front_View.png",
  },
  {
    id: "redmi-15",
    nome: "Redmi 15",
    src: "/phones/redmi-15.jpg",
    proporcao: 960 / 1921,
    recorte: "inset(2.2% 1.8% 5.2% 0.6% round 10% / 5%)",
    autor: "Maksdroider",
    licenca: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Redmi_15_front.jpg",
  },
  {
    id: "galaxy-z-flip",
    nome: "Galaxy Z Flip",
    src: "/phones/galaxy-z-flip.png",
    proporcao: 960 / 1968,
    autor: "marcusph",
    licenca: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_Z_Flip_(unfolded).png",
  },
];

const CHAVE = "feedbackcell-vitrine";

/** Sorteia um celular diferente do último mostrado neste navegador. */
export function sortearCelular(): CelularVitrine {
  let ultimo: string | null = null;
  try {
    ultimo = window.localStorage.getItem(CHAVE);
  } catch {
    /* armazenamento bloqueado: sorteio simples */
  }
  const opcoes = VITRINE.filter((c) => c.id !== ultimo);
  const escolhido = opcoes[Math.floor(Math.random() * opcoes.length)] ?? VITRINE[0];
  try {
    window.localStorage.setItem(CHAVE, escolhido.id);
  } catch {
    /* ignora */
  }
  return escolhido;
}

/**
 * Modelos 3D reais (Sketchfab, licença CC Attribution) para a tela de login.
 * Baixados e otimizados (geometria meshopt, texturas WebP 1024px) em
 * public/phones/3d. O nome tem versão (.v1) porque o cache é de um ano.
 */
export type Modelo3dVitrine = {
  id: string;
  nome: string;
  arquivo: string;
  autor: string;
  pagina: string;
};

// o Galaxy Z Flip 3 (galaxy-z-flip-3.v1.glb) ficou de fora: aberto e de tela
// apagada, ele aparece como uma placa preta no fundo escuro
export const VITRINE_3D: Modelo3dVitrine[] = [
  {
    id: "iphone-14-pro",
    nome: "iPhone 14 Pro",
    arquivo: "/phones/3d/iphone-14-pro.v1.glb",
    autor: "mister dude",
    pagina: "https://sketchfab.com/3d-models/iphone-14-pro-5cb0778041a34f09b409a38c687bb1d4",
  },
  {
    id: "iphone-15-pro-max",
    nome: "iPhone 15 Pro Max",
    arquivo: "/phones/3d/iphone-15-pro-max.v1.glb",
    autor: "polyman Studio",
    pagina: "https://sketchfab.com/3d-models/apple-iphone-15-pro-max-black-df17520841214c1792fb8a44c6783ee7",
  },
  {
    id: "iphone-16-pro-max",
    nome: "iPhone 16 Pro Max",
    arquivo: "/phones/3d/iphone-16-pro-max.v1.glb",
    autor: "Sketcher",
    pagina: "https://sketchfab.com/3d-models/iphone-16-pro-max-light-brown-7c682a89e56e467893a2dceec838cc9c",
  },
  {
    id: "galaxy-s21-ultra",
    nome: "Galaxy S21 Ultra",
    arquivo: "/phones/3d/galaxy-s21-ultra.v1.glb",
    autor: "DatSketch",
    pagina: "https://sketchfab.com/3d-models/samsung-galaxy-s21-ultra-cd962832be7744efb6b37fe0ee2027e7",
  },
];

const CHAVE_3D = "feedbackcell-vitrine-3d";

const CHAVE_3D_ABA = "feedbackcell-vitrine-3d-aba";

/**
 * Modelo 3D da vitrine: sorteado uma vez por aba (diferente do da última
 * visita) e mantido enquanto a pessoa navega, para o aparelho não trocar
 * ao sair da página e voltar.
 */
export function sortearModelo3d(): Modelo3dVitrine {
  try {
    const atual = VITRINE_3D.find((m) => m.id === window.sessionStorage.getItem(CHAVE_3D_ABA));
    if (atual) return atual;
  } catch {
    /* ignora */
  }
  let ultimo: string | null = null;
  try {
    ultimo = window.localStorage.getItem(CHAVE_3D);
  } catch {
    /* ignora */
  }
  const opcoes = VITRINE_3D.filter((m) => m.id !== ultimo);
  const escolhido = opcoes[Math.floor(Math.random() * opcoes.length)] ?? VITRINE_3D[0];
  try {
    window.localStorage.setItem(CHAVE_3D, escolhido.id);
    window.sessionStorage.setItem(CHAVE_3D_ABA, escolhido.id);
  } catch {
    /* ignora */
  }
  return escolhido;
}
