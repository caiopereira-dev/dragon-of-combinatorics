/**
 * App.jsx — O Dragão da Incerteza
 * RPG Educacional de Análise Combinatória e Probabilidade
 * Autor: Caio Ferreira Alves Pereira · 2025
 * Licença: MIT
 *
 * FIXES APPLIED (audit de produção):
 *  1. window.storage → localStorage (window.storage é API exclusiva do Claude)
 *  2. Lógica de save/delete separada no useEffect (evita salvar e deletar no mesmo tick)
 *  3. Guard adicionado para `current` undefined (battleQueue vazia não crasha mais)
 *  4. IconSwordCrossed removido (era definido mas nunca utilizado — dead code)
 *  5. @import de Google Fonts movido para src/index.css (melhor caching e sem FOUC)
 *  6. Estilos inline de animação mantidos em <style> dentro do componente para isolamento
 */

import { useState, useMemo, useEffect } from 'react';
import { Heart, Sparkles, ChevronRight, Lock } from 'lucide-react';

// ---------------------------------------------------------------------------
// CONSTANTES
// ---------------------------------------------------------------------------

/** Chave usada para persistência no localStorage */
const SAVE_KEY = 'dragon-save-v1';

// ---------------------------------------------------------------------------
// DADOS — Níveis e Habilidades
// ---------------------------------------------------------------------------

const LEVELS = [
  { level: 1, name: 'Aprendiz da Lógica',       xpNeeded: 0   },
  { level: 2, name: 'Guerreiro Combinatório',    xpNeeded: 20  },
  { level: 3, name: 'Cavaleiro Tático',          xpNeeded: 55  },
  { level: 4, name: 'Arquimago da Combinatória', xpNeeded: 105 },
];

function getLevelInfo(xp) {
  let info = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xpNeeded) info = l;
  return info;
}

function classGearLabel(level) {
  if (level >= 4) return 'Conjunto lendário — runas e geometria arcana';
  if (level === 3) return 'Armadura ornamentada — lâmina de campeão';
  if (level === 2) return 'Cota de malha reforçada — espada longa';
  return 'Couro desgastado — lâmina simples';
}

const SKILLS = [
  { key: 'vision', name: 'Visão Permutacional',   short: 'Visão',  unlockAt: 1 },
  { key: 'shield', name: 'Escudo Combinatório',    short: 'Escudo', unlockAt: 2 },
  { key: 'strike', name: 'Golpe da Probabilidade', short: 'Golpe',  unlockAt: 3 },
];

// ---------------------------------------------------------------------------
// DADOS — Inimigos e Lore
// ---------------------------------------------------------------------------

const ENEMIES = [
  {
    id: 'goblin',
    name: 'Goblin Caoticida',
    concept: 'Princípio Fundamental da Contagem',
    maxHp: 30,
    dmgMin: 6,
    dmgMax: 12,
    xpReward: 20,
    intro: 'Um Goblin Caoticida bloqueia o caminho, brandindo lâminas tortas e confundindo viajantes com escolhas impossíveis.',
  },
  {
    id: 'orc',
    name: 'Orc Ordenador',
    concept: 'Permutações e Arranjos',
    maxHp: 55,
    dmgMin: 9,
    dmgMax: 16,
    xpReward: 35,
    intro: 'O Orc Ordenador, coberto de placas de ferro, exige que tudo esteja em sua sequência exata — ou haverá sangue.',
  },
  {
    id: 'necromante',
    name: 'Necromante das Combinações',
    concept: 'Combinações',
    maxHp: 75,
    dmgMin: 12,
    dmgMax: 18,
    xpReward: 50,
    intro: 'Envolto em magia sombria, o Necromante não se importa com a ordem de seus servos... apenas com quantos sobrevivem.',
  },
  {
    id: 'dragao',
    name: 'Dragão Final da Incerteza',
    concept: 'Permutações, Combinações e Probabilidade',
    maxHp: 140,
    dmgMin: 15,
    dmgMax: 24,
    xpReward: 100,
    intro: 'O Dragão Final da Incerteza desperta de seu sono milenar. Apenas quem domina todo o conhecimento pode prevalecer.',
  },
];

const LORE = {
  goblin: {
    mentor: 'Mestre Aritmos',
    text:    'O Princípio Fundamental da Contagem diz: se uma escolha tem m possibilidades e, para cada uma delas, outra escolha independente tem n possibilidades, juntas existem m × n possibilidades.',
    example: 'Exemplo: 2 capas e 3 botas geram 2 × 3 = 6 combinações de traje possíveis.',
  },
  orc: {
    mentor: 'Mestre Aritmos',
    text:    'Quando a ordem importa, usamos Permutação (todos os elementos, em qualquer ordem) ou Arranjo (parte dos elementos, em ordem). Elementos repetidos dividem o total pelas repetições.',
    example: 'Ordenar 3 espadas distintas dá 3! = 6 ordens. Escolher e ordenar 2 entre 4 escudos dá A(4,2) = 4×3 = 12.',
  },
  necromante: {
    mentor: 'Mestre Aritmos',
    text:    'Quando a ordem NÃO importa, usamos Combinação: escolhemos um subconjunto sem nos preocupar com a sequência.',
    example: 'Escolher 2 entre 4 aliados, sem ordem, dá C(4,2) = (4×3)/2! = 6 duplas possíveis.',
  },
  dragao: {
    mentor: 'Mestre Aritmos',
    text:    'Probabilidade mede a chance de um evento: casos favoráveis dividido por casos possíveis. O Dragão Final exige tudo junto: contagem, permutação, arranjo, combinação e probabilidade.',
    example: 'Exemplo: 1 carta da sorte entre 4 cartas dá probabilidade 1/4 = 25%.',
  },
};

// ---------------------------------------------------------------------------
// DADOS — Banco de Questões (27 questões em 4 categorias)
// ---------------------------------------------------------------------------

const QUESTION_BANK = {
  goblin: [
    {
      enunciado: 'Um menu de taverna oferece 3 tipos de carne e 4 tipos de bebida. De quantas formas um cavaleiro pode escolher uma carne e uma bebida?',
      alternativas: ['7', '12', '10', '9'], correta: 1,
      explicacao: 'Pelo princípio fundamental da contagem, multiplicamos as possibilidades independentes: 3 × 4 = 12 combinações.',
    },
    {
      enunciado: 'Para abrir o portão da fortaleza, o guardião escolhe uma entre 5 chaves e gira-a em uma de 2 direções. Quantas combinações de abertura existem?',
      alternativas: ['7', '10', '5', '2'], correta: 1,
      explicacao: 'São duas escolhas independentes e sucessivas: 5 chaves × 2 direções = 10 combinações.',
    },
    {
      enunciado: 'Um arqueiro possui 4 tipos de flechas e 3 tipos de arcos. Quantas combinações arco-flecha ele pode formar?',
      alternativas: ['12', '7', '9', '15'], correta: 0,
      explicacao: 'Para cada um dos 3 arcos há 4 flechas possíveis: 3 × 4 = 12 combinações.',
    },
    {
      enunciado: 'Uma poção é feita escolhendo 1 entre 6 ervas e 1 entre 4 cristais. Quantas poções diferentes existem?',
      alternativas: ['10', '24', '20', '18'], correta: 1,
      explicacao: 'Princípio multiplicativo: 6 ervas × 4 cristais = 24 poções diferentes.',
    },
    {
      enunciado: 'Um cavaleiro tem 3 escudos e 5 elmos. De quantas formas ele pode equipar um escudo e um elmo?',
      alternativas: ['15', '8', '12', '20'], correta: 0,
      explicacao: 'Princípio multiplicativo: 3 escudos × 5 elmos = 15 combinações de equipamento.',
    },
    {
      enunciado: 'Uma estalagem oferece 4 tipos de quarto e, para cada quarto, 2 tipos de cama. Quantas configurações de hospedagem existem?',
      alternativas: ['6', '8', '4', '2'], correta: 1,
      explicacao: 'Para cada um dos 4 quartos há 2 tipos de cama: 4 × 2 = 8 configurações possíveis.',
    },
  ],
  orc: [
    {
      enunciado: 'De quantas formas distintas 4 guerreiros podem se posicionar em fila para o ataque?',
      alternativas: ['12', '16', '24', '32'], correta: 2,
      explicacao: 'É uma permutação simples de 4 elementos: 4! = 4×3×2×1 = 24 ordens possíveis.',
    },
    {
      enunciado: 'Um selo arcano usa 3 runas diferentes, escolhidas em ordem específica, entre 5 runas disponíveis (sem repetição). Quantos selos diferentes existem?',
      alternativas: ['60', '15', '20', '10'], correta: 0,
      explicacao: 'É um arranjo, pois a ordem importa: A(5,3) = 5 × 4 × 3 = 60 selos possíveis.',
    },
    {
      enunciado: "Quantos anagramas distintos podem ser formados com as letras da palavra 'ORCO' (a letra O se repete duas vezes)?",
      alternativas: ['24', '12', '6', '8'], correta: 1,
      explicacao: 'Permutação com repetição: 4 letras no total, com o O repetido 2 vezes → 4!/2! = 12 anagramas.',
    },
    {
      enunciado: 'Em uma corrida entre 6 cavaleiros, de quantas formas podem ser definidos o 1º, 2º e 3º colocados do pódio?',
      alternativas: ['120', '20', '18', '216'], correta: 0,
      explicacao: 'A ordem do pódio importa, então é um arranjo: A(6,3) = 6 × 5 × 4 = 120 formas.',
    },
    {
      enunciado: 'De quantas formas distintas podem ser organizados 5 grimórios diferentes em uma estante?',
      alternativas: ['100', '110', '120', '60'], correta: 2,
      explicacao: 'Permutação simples de 5 elementos: 5! = 5×4×3×2×1 = 120 ordens possíveis.',
    },
    {
      enunciado: 'Um general escolhe, em ordem, 2 comandantes entre 6 capitães — um para a vanguarda e outro para a retaguarda. Quantas formas existem?',
      alternativas: ['30', '15', '36', '12'], correta: 0,
      explicacao: 'A ordem importa (os cargos são diferentes), então é um arranjo: A(6,2) = 6 × 5 = 30 formas.',
    },
  ],
  necromante: [
    {
      enunciado: 'Um grupo de 5 magos deve escolher 2 deles para um ritual, sem importar a ordem. De quantas formas isso pode ser feito?',
      alternativas: ['20', '10', '5', '15'], correta: 1,
      explicacao: 'Como a ordem não importa, usamos combinação: C(5,2) = (5×4)/2! = 10 formas.',
    },
    {
      enunciado: 'De 10 pergaminhos arcanos distintos, de quantas formas podemos escolher 3 para compor um feitiço (a ordem não importa)?',
      alternativas: ['720', '120', '210', '60'], correta: 1,
      explicacao: 'Combinação de 10 elementos tomados 3 a 3: C(10,3) = (10×9×8)/3! = 120 formas.',
    },
    {
      enunciado: 'Uma guilda tem 7 membros. Quantas comissões de 4 pessoas podem ser formadas?',
      alternativas: ['35', '210', '840', '21'], correta: 0,
      explicacao: 'C(7,4) = (7×6×5×4)/4! = 35 comissões possíveis, já que a ordem dentro da comissão não importa.',
    },
    {
      enunciado: 'Em um grupo de 8 esqueletos, quantas duplas diferentes (sem ordem) podem ser formadas para patrulha?',
      alternativas: ['56', '16', '28', '64'], correta: 2,
      explicacao: 'C(8,2) = (8×7)/2! = 28 duplas possíveis.',
    },
    {
      enunciado: 'De um grupo de 6 espíritos, quantos trios podem ser formados para uma invocação, sem importar a ordem?',
      alternativas: ['20', '120', '15', '18'], correta: 0,
      explicacao: 'C(6,3) = (6×5×4)/3! = 20 trios possíveis.',
    },
    {
      enunciado: 'Uma confraria sombria tem 9 membros. Quantas comissões de 2 pessoas podem ser formadas entre eles?',
      alternativas: ['72', '36', '18', '81'], correta: 1,
      explicacao: 'C(9,2) = (9×8)/2! = 36 comissões possíveis.',
    },
  ],
  dragao: [
    {
      enunciado: 'O Dragão organiza 6 runas amaldiçoadas distintas em fila. De quantas formas elas podem ser ordenadas?',
      alternativas: ['720', '120', '360', '24'], correta: 0,
      explicacao: 'Permutação simples de 6 elementos: 6! = 720 ordens possíveis.',
    },
    {
      enunciado: 'Para invocar o Dragão é preciso escolher 3 cristais entre 9 disponíveis, sem importar a ordem. Quantas combinações de invocação existem?',
      alternativas: ['84', '504', '72', '36'], correta: 0,
      explicacao: 'C(9,3) = (9×8×7)/3! = 84 combinações de invocação.',
    },
    {
      enunciado: 'Uma masmorra tem 5 portas, das quais 2 levam ao tesouro. Se um guerreiro escolhe 1 porta ao acaso, qual a probabilidade de encontrar o tesouro?',
      alternativas: ['40%', '20%', '60%', '25%'], correta: 0,
      explicacao: 'Probabilidade = casos favoráveis / casos possíveis = 2/5 = 40%.',
    },
    {
      enunciado: 'Em uma urna mística há 3 pergaminhos vermelhos e 7 azuis. Qual a probabilidade de retirar, ao acaso, um pergaminho vermelho?',
      alternativas: ['30%', '70%', '3%', '21%'], correta: 0,
      explicacao: 'Probabilidade = 3 vermelhos / 10 totais = 3/10 = 30%.',
    },
    {
      enunciado: 'Dois guerreiros são sorteados, sem reposição, de um grupo de 4 guerreiros e 3 magas (7 no total). Qual a probabilidade de que ambos sejam guerreiros?',
      alternativas: ['2/7', '4/7', '1/7', '3/7'], correta: 0,
      explicacao: 'P = C(4,2)/C(7,2) = 6/21 = 2/7, já que a ordem do sorteio não importa.',
    },
    {
      enunciado: 'Um arsenal tem 12 armas distintas. De quantas formas é possível escolher 4 delas, sem importar a ordem?',
      alternativas: ['495', '1320', '220', '720'], correta: 0,
      explicacao: 'C(12,4) = (12×11×10×9)/4! = 495 combinações possíveis.',
    },
    {
      enunciado: 'Uma profecia é escrita organizando 5 símbolos distintos em fila. De quantas formas isso pode ser feito?',
      alternativas: ['120', '60', '24', '720'], correta: 0,
      explicacao: 'Permutação simples de 5 elementos: 5! = 120 ordens possíveis.',
    },
  ],
};

// ---------------------------------------------------------------------------
// UTILITÁRIOS
// ---------------------------------------------------------------------------

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(enemyId) {
  return shuffle(QUESTION_BANK[enemyId]);
}

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// PERSISTÊNCIA — localStorage (FIX: era window.storage exclusivo do Claude)
// ---------------------------------------------------------------------------

function saveProgress(snapshot) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  } catch {
    // Silencia: localStorage pode estar indisponível em modo privado
  }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const validScreen = ['lore', 'battle'].includes(data?.screen);
    return validScreen ? data : null;
  } catch {
    return null;
  }
}

function clearProgress() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Silencia
  }
}

// ---------------------------------------------------------------------------
// ÍCONES SVG (substitui emojis — sem dependências externas além de lucide)
// ---------------------------------------------------------------------------

function IconEye({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12c2.5-5 7-7.5 10-7.5S19.5 7 22 12c-2.5 5-7 7.5-10 7.5S4.5 17 2 12Z" stroke={color} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.2" fill={color} />
    </svg>
  );
}
function IconShield({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6L12 2.5Z" stroke={color} strokeWidth="1.6" />
      <path d="M9 12l2 2 4-4.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconBolt({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 10-13h-6Z" fill={color} />
    </svg>
  );
}
function IconScroll({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="1.5" stroke={color} strokeWidth="1.5" />
      <circle cx="4" cy="6" r="2" stroke={color} strokeWidth="1.5" />
      <circle cx="4" cy="18" r="2" stroke={color} strokeWidth="1.5" />
      <circle cx="20" cy="6" r="2" stroke={color} strokeWidth="1.5" />
      <circle cx="20" cy="18" r="2" stroke={color} strokeWidth="1.5" />
      <path d="M8 10h8M8 13h6" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function IconCrest({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5.2 3.5 8.8 8 11 4.5-2.2 8-5.8 8-11V5l-8-3Z" stroke={color} strokeWidth="1.5" />
      <path d="M12 7v8M8.5 9.5h7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconSkull({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3C7.6 3 4.5 6.2 4.5 10.2c0 2.4 1.1 4 2.5 5.2V18a1 1 0 0 0 1 1H9v1.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V19h1a1 1 0 0 0 1-1v-2.6c1.4-1.2 2.5-2.8 2.5-5.2C19.5 6.2 16.4 3 12 3Z" stroke={color} strokeWidth="1.4" />
      <circle cx="9" cy="11" r="1.6" fill={color} />
      <circle cx="15" cy="11" r="1.6" fill={color} />
      <path d="M11 14.5h2" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function IconTrophy({ size = 30, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" stroke={color} strokeWidth="1.5" />
      <path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4" stroke={color} strokeWidth="1.4" />
      <path d="M12 13v3M9 20h6M10 17h4l.6 3H9.4l.6-3Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function IconBook({ size = 26, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5.5c2-1 5-1 8 0v13c-3-1-6-1-8 0v-13Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 5.5c-2-1-5-1-8 0v13c3-1 6-1 8 0v-13Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconFlame({ size = 13, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-2.5.5 2-1 3-1 1.5 0-2-2-3-2-5C14 4 12.5 3 12 2Z" fill={color} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ARTE SVG — MONSTROS (dark fantasy, gear-appropriate)
// ---------------------------------------------------------------------------

function GoblinArt() {
  return (
    <svg viewBox="0 0 220 220" width="170" height="170" aria-label="Goblin Caoticida">
      <defs>
        <radialGradient id="gSkin" cx="45%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#7a9456" />
          <stop offset="100%" stopColor="#33431f" />
        </radialGradient>
        <linearGradient id="gLeather" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a4228" />
          <stop offset="100%" stopColor="#2e2010" />
        </linearGradient>
        <filter id="gEyeGlow"><feGaussianBlur stdDeviation="2.4" /></filter>
      </defs>
      <path d="M70 130 L150 110 L156 128 L76 150 Z" fill="url(#gLeather)" stroke="#1a1208" strokeWidth="1.2" />
      <path d="M78 150 L142 135 L146 150 L82 166 Z" fill="#3a3022" stroke="#1a1208" strokeWidth="1" />
      <ellipse cx="110" cy="155" rx="48" ry="44" fill="url(#gSkin)" />
      <ellipse cx="110" cy="88" rx="34" ry="30" fill="url(#gSkin)" />
      <polygon points="80,70 56,34 90,62" fill="#2c3a18" />
      <polygon points="140,70 164,34 130,62" fill="#2c3a18" />
      <circle cx="97" cy="85" r="8" fill="#0e1208" />
      <circle cx="123" cy="85" r="8" fill="#0e1208" />
      <circle cx="97" cy="85" r="4" fill="#d9c23a" filter="url(#gEyeGlow)" />
      <circle cx="123" cy="85" r="4" fill="#d9c23a" filter="url(#gEyeGlow)" />
      <polygon points="99,105 104,116 109,105" fill="#dcd6bc" />
      <polygon points="111,105 116,116 121,105" fill="#dcd6bc" />
      <path d="M84 66 Q110 50 136 66 L132 76 Q110 64 88 76 Z" fill="#5a5a5a" stroke="#2a2a2a" strokeWidth="1" />
      <g transform="rotate(38 150 140)">
        <rect x="146" y="118" width="7" height="46" rx="2" fill="#5a4228" />
        <polygon points="162,92 184,104 180,128 160,118" fill="#8a7a5a" stroke="#3a3322" strokeWidth="1" />
      </g>
      <ellipse cx="64" cy="138" rx="14" ry="16" fill="#4a3622" stroke="#241a10" strokeWidth="1.4" />
      <circle cx="64" cy="138" r="4" fill="#2a2a2a" />
    </svg>
  );
}

function OrcArt() {
  return (
    <svg viewBox="0 0 220 220" width="170" height="170" aria-label="Orc Ordenador">
      <defs>
        <radialGradient id="oSkin" cx="48%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#6b7a4e" />
          <stop offset="100%" stopColor="#33381f" />
        </radialGradient>
        <linearGradient id="oIron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8aab0" />
          <stop offset="100%" stopColor="#52545a" />
        </linearGradient>
      </defs>
      <path d="M64 120 Q110 102 156 120 L152 176 Q110 192 68 176 Z" fill="url(#oIron)" stroke="#2a2a2a" strokeWidth="1.6" />
      <path d="M110 120 V176" stroke="#3a3a3a" strokeWidth="1.4" />
      <circle cx="110" cy="140" r="6" fill="#3a3a3a" />
      <ellipse cx="110" cy="86" rx="38" ry="34" fill="url(#oSkin)" />
      <polygon points="68,56 54,22 90,52" fill="#28301a" />
      <polygon points="152,56 166,22 130,52" fill="#28301a" />
      <polygon points="92,108 98,126 84,116" fill="#eee6cc" />
      <polygon points="128,108 122,126 136,116" fill="#eee6cc" />
      <circle cx="94" cy="82" r="6.5" fill="#c92e1e" />
      <circle cx="126" cy="82" r="6.5" fill="#c92e1e" />
      <path d="M70 58 Q110 38 150 58 L146 70 Q110 54 74 70 Z" fill="#52545a" stroke="#222" strokeWidth="1.2" />
      <path d="M70 60 L52 36" stroke="#7a7a7a" strokeWidth="5" strokeLinecap="round" />
      <path d="M150 60 L168 36" stroke="#7a7a7a" strokeWidth="5" strokeLinecap="round" />
      <g transform="rotate(-12 32 130)">
        <rect x="30" y="60" width="10" height="110" rx="3" fill="#4a3a26" />
        <path d="M6 60 L40 50 L46 90 L34 100 L8 92 Z" fill="#9a9ca2" stroke="#2a2a2a" strokeWidth="1.4" />
      </g>
      <ellipse cx="178" cy="142" rx="20" ry="26" fill="#5a4a2a" stroke="#241c10" strokeWidth="1.6" />
      <circle cx="178" cy="142" r="6" fill="#2a2a2a" />
    </svg>
  );
}

function NecromanteArt() {
  return (
    <svg viewBox="0 0 220 220" width="170" height="170" aria-label="Necromante das Combinações">
      <defs>
        <linearGradient id="nRobe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2750" />
          <stop offset="100%" stopColor="#0f0816" />
        </linearGradient>
        <radialGradient id="nAura" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#9a5fd6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#9a5fd6" stopOpacity="0" />
        </radialGradient>
        <filter id="nGlow"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <circle cx="110" cy="120" r="92" fill="url(#nAura)" />
      <polygon points="110,48 172,206 48,206 60,160 90,170 80,140 100,150 92,110 116,118 108,80 130,90" fill="url(#nRobe)" stroke="#1c1226" strokeWidth="1.2" />
      <path d="M80 64 Q110 30 140 64 Q138 96 110 100 Q82 96 80 64 Z" fill="#1a1020" stroke="#0c0712" strokeWidth="1.4" />
      <ellipse cx="110" cy="76" rx="26" ry="30" fill="#120a1a" />
      <circle cx="98" cy="76" r="4.6" fill="#c98cf2" filter="url(#nGlow)" />
      <circle cx="122" cy="76" r="4.6" fill="#c98cf2" filter="url(#nGlow)" />
      <path d="M92 102 Q110 112 128 102" stroke="#d9d0b8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="98" cy="106" r="2.6" fill="#d9d0b8" />
      <circle cx="110" cy="110" r="2.6" fill="#d9d0b8" />
      <circle cx="122" cy="106" r="2.6" fill="#d9d0b8" />
      <rect x="170" y="40" width="6" height="148" fill="#2c2418" />
      <circle cx="173" cy="32" r="15" fill="#e6dec4" stroke="#7a7256" strokeWidth="1" />
      <circle cx="168" cy="29" r="3.2" fill="#120a1a" />
      <circle cx="178" cy="29" r="3.2" fill="#120a1a" />
      <path d="M168 38 Q173 42 178 38" stroke="#120a1a" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

function DragonArt({ enraged = false }) {
  const fireRy = enraged ? 28 : 17;
  return (
    <svg viewBox="0 0 240 230" width="170" height="170" aria-label="Dragão Final da Incerteza">
      <defs>
        <radialGradient id="dSkin" cx="48%" cy="32%" r="74%">
          <stop offset="0%" stopColor="#8a2424" />
          <stop offset="100%" stopColor="#220808" />
        </radialGradient>
        <linearGradient id="dBelly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0a83a" />
          <stop offset="100%" stopColor="#8a5e1a" />
        </linearGradient>
        <radialGradient id="dFire" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd27a" />
          <stop offset="55%" stopColor="#ff7a1a" />
          <stop offset="100%" stopColor="#ff3500" stopOpacity="0" />
        </radialGradient>
        <filter id="dGlow"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <path d="M16 158 L74 96 L70 150 L40 176 Z" fill="url(#dSkin)" stroke="#160404" strokeWidth="1.4" />
      <path d="M224 158 L166 96 L170 150 L200 176 Z" fill="url(#dSkin)" stroke="#160404" strokeWidth="1.4" />
      <path d="M40 110 L70 100 M44 130 L70 122" stroke="#160404" strokeWidth="1.4" opacity="0.7" />
      <path d="M200 110 L170 100 M196 130 L170 122" stroke="#160404" strokeWidth="1.4" opacity="0.7" />
      <ellipse cx="120" cy="160" rx="58" ry="46" fill="url(#dSkin)" />
      <ellipse cx="120" cy="172" rx="32" ry="22" fill="url(#dBelly)" />
      <polygon points="98,96 92,78 106,92" fill="#3a0e0e" />
      <polygon points="120,90 115,70 128,86" fill="#3a0e0e" />
      <polygon points="142,96 148,78 134,92" fill="#3a0e0e" />
      <ellipse cx="120" cy="92" rx="32" ry="28" fill="url(#dSkin)" />
      <polygon points="100,62 90,30 112,60" fill="#3a0e0e" />
      <polygon points="140,62 150,30 128,60" fill="#3a0e0e" />
      <circle cx="108" cy="88" r="6" fill="#ffb347" filter="url(#dGlow)" />
      <circle cx="132" cy="88" r="6" fill="#ffb347" filter="url(#dGlow)" />
      <path d="M96 104 Q120 118 144 104 L140 112 Q120 124 100 112 Z" fill="#160404" />
      <polygon points="100,106 103,114 106,106" fill="#eee6cc" />
      <polygon points="110,108 113,117 116,108" fill="#eee6cc" />
      <polygon points="124,108 127,117 130,108" fill="#eee6cc" />
      <polygon points="134,106 137,114 140,106" fill="#eee6cc" />
      <ellipse cx="120" cy="116" rx="20" ry={fireRy} fill="url(#dFire)" />
      <path d="M178 188 Q210 200 222 182" stroke="#3a0e0e" strokeWidth="10" fill="none" strokeLinecap="round" />
      <polygon points="220,176 232,182 220,190" fill="#3a0e0e" />
    </svg>
  );
}

const MONSTER_ART = { goblin: GoblinArt, orc: OrcArt, necromante: NecromanteArt, dragao: DragonArt };

// ---------------------------------------------------------------------------
// AVATAR DO JOGADOR (evolui visualmente com o nível)
// ---------------------------------------------------------------------------

function PlayerAvatar({ level, size = 40 }) {
  if (level >= 4) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Arquimago">
        <defs>
          <radialGradient id="t4g" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#caa8ff" />
            <stop offset="100%" stopColor="#5a3a8a" />
          </radialGradient>
        </defs>
        <path d="M32 8 L46 16 V34 C46 46 40 54 32 58 C24 54 18 46 18 34 V16 Z" fill="url(#t4g)" stroke="#2a1840" strokeWidth="1.4" />
        <circle cx="32" cy="20" r="6" fill="#2a1840" />
        <circle cx="29.5" cy="19.5" r="1.4" fill="#d9c2ff" />
        <circle cx="34.5" cy="19.5" r="1.4" fill="#d9c2ff" />
        <path d="M32 30 L26 44 L32 40 L38 44 Z" fill="#d9c2ff" opacity="0.9" />
        <circle cx="32" cy="34" r="2" fill="none" stroke="#ffd76a" strokeWidth="1" />
      </svg>
    );
  }
  if (level === 3) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Cavaleiro">
        <defs>
          <linearGradient id="t3p" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8d27a" />
            <stop offset="100%" stopColor="#8a6a1e" />
          </linearGradient>
        </defs>
        <path d="M32 8 L48 15 V32 C48 46 40 54 32 58 C24 54 16 46 16 32 V15 Z" fill="url(#t3p)" stroke="#4a3a10" strokeWidth="1.4" />
        <path d="M32 8 L48 15 V21 L32 16 L16 21 V15 Z" fill="#6a5418" />
        <rect x="28" y="16" width="8" height="6" rx="1" fill="#2a2010" />
        <path d="M32 26 L40 50" stroke="#cbd3da" strokeWidth="3" strokeLinecap="round" />
        <path d="M36 30 L44 28" stroke="#cbd3da" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (level === 2) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Guerreiro">
        <path d="M32 10 L44 16 V32 C44 44 38 52 32 56 C26 52 20 44 20 32 V16 Z" fill="#7a8aa0" stroke="#2e3848" strokeWidth="1.4" />
        <circle cx="32" cy="20" r="6" fill="#2e3848" />
        <rect x="29" y="17.5" width="6" height="2.4" fill="#1a2230" />
        <path d="M32 28 L38 48" stroke="#9aa6b4" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Aprendiz">
      <path d="M32 12 L42 17 V30 C42 40 37 48 32 52 C27 48 22 40 22 30 V17 Z" fill="#8a6a44" stroke="#3a2a18" strokeWidth="1.4" />
      <circle cx="32" cy="22" r="5.5" fill="#5a4228" />
      <path d="M32 30 L36 46" stroke="#b3b3b3" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTES DE UI MEDIEVAL
// ---------------------------------------------------------------------------

function RuneDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }} aria-hidden="true">
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #6a5526, transparent)' }} />
      <svg width="14" height="14" viewBox="0 0 24 24">
        <path d="M12 2 4 12l8 10 8-10Z" fill="none" stroke="#8a7240" strokeWidth="1.4" />
      </svg>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #6a5526, transparent)' }} />
    </div>
  );
}

function StoneBanner({ children }) {
  return (
    <div style={{
      position: 'relative',
      padding: 12,
      background: 'linear-gradient(180deg, #2c2014, #1a1209)',
      border: '1px solid #4a3a22',
      borderRadius: 4,
      boxShadow: '0 4px 14px rgba(0,0,0,.5), inset 0 0 0 1px rgba(201,162,59,.12)',
      marginTop: 12,
    }}>
      <div style={{ position:'absolute', top:4, left:4, width:8, height:8, borderTop:'2px solid #c9a23b', borderLeft:'2px solid #c9a23b' }} />
      <div style={{ position:'absolute', top:4, right:4, width:8, height:8, borderTop:'2px solid #c9a23b', borderRight:'2px solid #c9a23b' }} />
      <div style={{ position:'absolute', bottom:4, left:4, width:8, height:8, borderBottom:'2px solid #c9a23b', borderLeft:'2px solid #c9a23b' }} />
      <div style={{ position:'absolute', bottom:4, right:4, width:8, height:8, borderBottom:'2px solid #c9a23b', borderRight:'2px solid #c9a23b' }} />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

export default function App() {
  const [screen, setScreen] = useState('intro');
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [playerXp, setPlayerXp] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMana, setPlayerMana] = useState(0);
  const [defeatedCount, setDefeatedCount] = useState(0);
  const [enemyHp, setEnemyHp] = useState(ENEMIES[0].maxHp);
  const [battleQueue, setBattleQueue] = useState(() => buildQueue(ENEMIES[0].id));
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [enemyHitFx, setEnemyHitFx] = useState(false);
  const [playerHitFx, setPlayerHitFx] = useState(false);
  const [abilityActive, setAbilityActive] = useState(false);
  const [streak, setStreak] = useState(0);
  const [weakTopics, setWeakTopics] = useState({});
  const [eliminatedIdx, setEliminatedIdx] = useState(null);
  const [visionUsed, setVisionUsed] = useState(false);
  const [shieldUsed, setShieldUsed] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [levelUpToast, setLevelUpToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(null);

  // Ember particles — computed once, never change
  const embers = useMemo(
    () => Array.from({ length: 18 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 6,
      dur: 5 + Math.random() * 4,
      size: 2 + Math.random() * 3,
    })),
    []
  );

  const enemy    = ENEMIES[enemyIdx];
  const levelInfo = getLevelInfo(playerXp);

  // FIX: guard against empty battleQueue (prevents crash if queue drains unexpectedly)
  const current  = battleQueue.length > 0 ? battleQueue[0] : null;
  const enemyPct = Math.max(0, Math.round((enemyHp / enemy.maxHp) * 100));

  // ── LOAD SAVE on mount (FIX: uses localStorage, not window.storage) ────────
  useEffect(() => {
    const data = loadProgress();
    if (data) {
      setSavedSnapshot(data);
      setHasSave(true);
    }
    setLoaded(true);
  }, []);

  // ── AUTOSAVE on every meaningful state change (FIX: delete before save) ───
  useEffect(() => {
    if (!loaded || screen === 'intro') return;
    // Finished games — clear save instead of overwriting
    if (screen === 'finalVictory' || screen === 'gameover') {
      clearProgress();
      return;
    }
    saveProgress({ screen, enemyIdx, playerXp, playerHp, playerMana, defeatedCount, enemyHp, streak, weakTopics });
  }, [screen, enemyIdx, playerXp, playerHp, playerMana, defeatedCount, enemyHp, streak, weakTopics, loaded]);

  // ── RESUME ─────────────────────────────────────────────────────────────────
  function resumeSave() {
    if (!savedSnapshot) return;
    const d   = savedSnapshot;
    const idx = Math.min(Math.max(d.enemyIdx || 0, 0), ENEMIES.length - 1);
    setEnemyIdx(idx);
    setPlayerXp(d.playerXp  || 0);
    setPlayerHp(d.playerHp  ?? 100);
    setPlayerMana(d.playerMana || 0);
    setDefeatedCount(d.defeatedCount || 0);
    setStreak(d.streak || 0);
    setWeakTopics(d.weakTopics || {});
    setEnemyHp(Math.min(d.enemyHp ?? ENEMIES[idx].maxHp, ENEMIES[idx].maxHp));
    setBattleQueue(buildQueue(ENEMIES[idx].id));
    resetBattleUI();
    setHasSave(false);
    setScreen(d.screen === 'lore' ? 'lore' : 'battle');
  }

  function resetBattleUI() {
    setAnswered(false);
    setSelected(null);
    setLastCorrect(null);
    setFeedbackMsg('');
    setEliminatedIdx(null);
    setVisionUsed(false);
    setShieldUsed(false);
    setShieldActive(false);
  }

  function startBattle(idx) {
    setEnemyIdx(idx);
    setEnemyHp(ENEMIES[idx].maxHp);
    setBattleQueue(buildQueue(ENEMIES[idx].id));
    resetBattleUI();
  }

  function resetGame() {
    clearProgress();
    setScreen('intro');
    setPlayerXp(0);
    setPlayerHp(100);
    setPlayerMana(0);
    setDefeatedCount(0);
    setStreak(0);
    setWeakTopics({});
    setLevelUpToast(null);
    setHasSave(false);
    setSavedSnapshot(null);
    startBattle(0);
  }

  // ── HABILIDADES ─────────────────────────────────────────────────────────────
  const canUseVision = defeatedCount >= 1 && !visionUsed && !answered;
  const canUseShield = defeatedCount >= 2 && !shieldUsed && !answered && !shieldActive;
  const canUseStrike = defeatedCount >= 3 && playerMana >= 100 && !answered && !abilityActive;

  function useVision() {
    if (!canUseVision || !current) return;
    const wrongIndices = current.alternativas.map((_, i) => i).filter(i => i !== current.correta);
    const pick = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
    setEliminatedIdx(pick);
    setVisionUsed(true);
  }

  function useShield() {
    if (!canUseShield) return;
    setShieldActive(true);
    setShieldUsed(true);
  }

  function activateStrike() {
    if (!canUseStrike) return;
    setPlayerMana(0);
    setAbilityActive(true);
  }

  // ── LÓGICA DE BATALHA ───────────────────────────────────────────────────────
  function handleSelect(i) {
    if (answered || i === eliminatedIdx || !current) return;
    const isCorrect = i === current.correta;
    setSelected(i);
    setAnswered(true);
    setLastCorrect(isCorrect);

    if (isCorrect) {
      const comboBonus = Math.min(streak, 5) * 2;
      const dmg = (10 + levelInfo.level * 4 + comboBonus) * (abilityActive ? 2 : 1);
      setEnemyHp(h => Math.max(0, h - dmg));
      setEnemyHitFx(true);
      setTimeout(() => setEnemyHitFx(false), 420);
      setPlayerMana(m => Math.min(100, m + 25));
      setStreak(s => s + 1);
      setFeedbackMsg(
        abilityActive
          ? `Acerto! Golpe da Probabilidade ativado — dano em dobro: ${dmg}.`
          : comboBonus > 0
            ? `Acerto! Combo x${streak + 1} — ${dmg} de dano.`
            : `Acerto! Você causou ${dmg} de dano.`
      );
      setAbilityActive(false);
    } else {
      let dmg = randBetween(enemy.dmgMin, enemy.dmgMax);
      if (shieldActive) {
        dmg = Math.round(dmg / 2);
        setShieldActive(false);
        setFeedbackMsg(`Errado. O Escudo Combinatório absorveu parte do golpe: ${dmg} de dano.`);
      } else {
        setFeedbackMsg(`Resposta incorreta. Você sofreu ${dmg} de dano e perdeu o turno.`);
      }
      setPlayerHp(h => Math.max(0, h - dmg));
      setPlayerHitFx(true);
      setTimeout(() => setPlayerHitFx(false), 420);
      setStreak(0);
      setWeakTopics(w => ({ ...w, [enemy.concept]: (w[enemy.concept] || 0) + 1 }));
    }
  }

  function nextStep() {
    if (enemyHp <= 0) {
      const prevLevel  = levelInfo.level;
      const newXp      = playerXp + enemy.xpReward;
      const newLvlInfo = getLevelInfo(newXp);
      setPlayerXp(newXp);
      setDefeatedCount(c => c + 1);
      if (newLvlInfo.level > prevLevel) {
        setLevelUpToast(newLvlInfo.name);
        setTimeout(() => setLevelUpToast(null), 3200);
      }
      if (enemyIdx === ENEMIES.length - 1) { setScreen('finalVictory'); return; }
      startBattle(enemyIdx + 1);
      setScreen('lore');
      return;
    }
    if (playerHp <= 0) { setScreen('gameover'); return; }

    setBattleQueue(prev => {
      if (!prev.length) return buildQueue(enemy.id);
      const [done, ...rest] = prev;
      const next = lastCorrect === false ? [...rest, done] : rest;
      return next.length ? next : buildQueue(enemy.id);
    });
    resetBattleUI();
  }

  // ── ESTILOS DINÂMICOS ───────────────────────────────────────────────────────
  function answerBtnStyle(i) {
    const base = {
      fontFamily: 'EB Garamond, serif',
      textAlign: 'left',
      padding: '11px 14px',
      borderRadius: 3,
      border: '1px solid #8a7240',
      background: 'linear-gradient(180deg, #ece0bd, #ddcc9e)',
      color: '#241a0e',
      transition: 'all .15s ease',
      cursor: answered ? 'default' : 'pointer',
      width: '100%',
      display: 'block',
    };
    if (!answered) {
      if (i === eliminatedIdx) return { ...base, opacity: 0.32, textDecoration: 'line-through', cursor: 'not-allowed' };
      return base;
    }
    if (i === current?.correta) return { ...base, background: 'linear-gradient(180deg,#a8d188,#7faa5c)', borderColor: '#4d7a2e' };
    if (i === selected)         return { ...base, background: 'linear-gradient(180deg,#d9947f,#b56a55)', borderColor: '#8a3a2e' };
    return { ...base, opacity: 0.45 };
  }

  function skillBtnStyle(enabled) {
    return {
      border: '1px solid #6a5526',
      background: enabled ? 'linear-gradient(180deg,#4a3614,#2a1c08)' : '#15100a',
      color: enabled ? '#ffb347' : '#544429',
      opacity: enabled ? 1 : 0.6,
      flexShrink: 0,
      boxShadow: enabled ? '0 0 10px rgba(255,179,71,.25)' : 'none',
      borderRadius: 3,
      padding: '8px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      cursor: enabled ? 'pointer' : 'not-allowed',
      fontFamily: 'EB Garamond, serif',
      fontSize: 10,
    };
  }

  function topWeakTopics() {
    return Object.entries(weakTopics).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);
  }

  const Art  = MONSTER_ART[enemy.id];
  const lore = LORE[enemy.id];

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 0%, #1c1208 0%, #100a05 55%, #050302 100%), repeating-linear-gradient(0deg, rgba(0,0,0,.15) 0px, rgba(0,0,0,.15) 1px, transparent 1px, transparent 3px)',
        fontFamily: 'EB Garamond, serif',
        color: '#e3d5b0',
      }}
    >
      {/* ── CSS Animations ─────────────────────────────────────────────────── */}
      <style>{`
        .embers-layer{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0;}
        .ember-particle{position:absolute;bottom:-10px;background:radial-gradient(circle,#ffb347,#a8401a);border-radius:50%;opacity:.8;animation-name:emberFloat;animation-timing-function:ease-out;animation-iteration-count:infinite;}
        @keyframes emberFloat{0%{transform:translateY(0) scale(1);opacity:.85;}100%{transform:translateY(-440px) scale(.25);opacity:0;}}
        .rune-circle{border:2px dashed rgba(201,162,59,.4);border-radius:50%;animation:spinKey 24s linear infinite;box-shadow:0 0 36px rgba(201,162,59,.18) inset;}
        @keyframes spinKey{to{transform:rotate(360deg);}}
        .shake{animation:shakeKey .42s;}
        @keyframes shakeKey{0%,100%{transform:translateX(0);}20%{transform:translateX(-7px);}40%{transform:translateX(7px);}60%{transform:translateX(-5px);}80%{transform:translateX(5px);}}
        .flash-red{filter:drop-shadow(0 0 16px #ff3030) brightness(1.35);}
        .dissolve{animation:dissolveKey .85s forwards;}
        @keyframes dissolveKey{0%{filter:brightness(1);}40%{filter:brightness(2.3) drop-shadow(0 0 32px #ffd76a);}100%{opacity:0;transform:scale(1.32);filter:brightness(2.3) drop-shadow(0 0 32px #ffd76a);}}
        .player-flash{animation:playerFlashKey .42s;}
        @keyframes playerFlashKey{0%{box-shadow:inset 0 0 0 0 rgba(255,40,40,0);}50%{box-shadow:inset 0 0 90px 12px rgba(255,40,40,.5);}100%{box-shadow:inset 0 0 0 0 rgba(255,40,40,0);}}
        .toast-anim{animation:toastInKey .35s ease;}
        @keyframes toastInKey{0%{opacity:0;transform:translate(-50%,-12px);}100%{opacity:1;transform:translate(-50%,0);}}
        .fade-in{animation:fadeInKey .45s ease;}
        @keyframes fadeInKey{0%{opacity:0;transform:translateY(6px);}100%{opacity:1;transform:translateY(0);}}
        .glint{position:relative;overflow:hidden;}
        .glint::after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(110deg,transparent,rgba(255,255,255,.18),transparent);animation:glintKey 3.4s ease-in-out infinite;}
        @keyframes glintKey{0%{left:-60%;}100%{left:140%;}}
        button:focus-visible{outline:2px solid #c9a23b;outline-offset:2px;}
        .hp-bar-bg{background:#140e07;border:1px solid #5a4a2e;border-radius:3px;height:11px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.6);}
        .hp-bar-fill{height:100%;transition:width .4s ease;}
        .medieval-btn{font-family:'Cinzel',serif;border:1px solid #c9a23b;background:linear-gradient(180deg,#8a1c1c,#5a1010);color:#f0e0bc;box-shadow:0 3px 0 #2e0808,0 6px 12px rgba(0,0,0,.5);transition:transform .12s ease;padding:12px 24px;border-radius:3px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-size:14px;}
        .medieval-btn:hover{filter:brightness(1.1);}
        .medieval-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #2e0808,0 3px 8px rgba(0,0,0,.5);}
        @media(prefers-reduced-motion:reduce){.shake,.dissolve,.ember-particle,.rune-circle,.player-flash,.toast-anim,.fade-in,.glint::after{animation:none!important;transition:none!important;}}
        @media(max-width:380px){.game-container{padding:16px 10px!important;}}
      `}</style>

      {/* ── Embers ─────────────────────────────────────────────────────────── */}
      <div className="embers-layer" aria-hidden="true">
        {embers.map((e, i) => (
          <span
            key={i}
            className="ember-particle"
            style={{ left:`${e.left}%`, width:e.size, height:e.size, animationDelay:`${e.delay}s`, animationDuration:`${e.dur}s` }}
          />
        ))}
      </div>

      {/* ── Player hit flash ───────────────────────────────────────────────── */}
      {playerHitFx && <div className="absolute inset-0 player-flash" style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:10 }} aria-hidden="true" />}

      {/* ── Level-up toast ─────────────────────────────────────────────────── */}
      {levelUpToast && (
        <div
          className="toast-anim"
          role="status"
          aria-live="polite"
          style={{
            position:'fixed', top:16, left:'50%', transform:'translateX(-50%)',
            background:'#1c140a', border:'1px solid #c9a23b', color:'#ffd76a',
            fontFamily:'Cinzel,serif', fontSize:13, padding:'8px 18px', borderRadius:4,
            zIndex:50, whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:8,
          }}
        >
          <IconCrest size={16} color="#ffd76a" /> Subiu de nível: {levelUpToast}
        </div>
      )}

      {/* ── Conteúdo principal ─────────────────────────────────────────────── */}
      <div className="game-container" style={{ maxWidth:480, margin:'0 auto', padding:'24px 16px', position:'relative', zIndex:1 }}>

        {/* ══ INTRO ══════════════════════════════════════════════════════════ */}
        {screen === 'intro' && (
          <div className="fade-in" style={{ textAlign:'center', paddingTop:32 }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
              <IconCrest size={40} color="#c9a23b" />
            </div>
            <h1 style={{ fontFamily:'Cinzel,serif', color:'#c9a23b', fontSize:28, fontWeight:900, letterSpacing:1 }}>
              O Dragão da Incerteza
            </h1>
            <p style={{ color:'#9a8458', marginTop:6, fontSize:11, letterSpacing:1 }}>UMA JORNADA PELA ANÁLISE COMBINATÓRIA</p>
            <RuneDivider />
            <p style={{ color:'#cbb88a', fontSize:14, lineHeight:1.7, marginTop:8 }}>
              O reino caiu em colapso matemático. Criaturas nascidas da confusão e do acaso espreitam
              pelas estradas, e apenas um Despertado da Lógica pode restaurar a ordem. Empunhe a contagem,
              a permutação e a combinação como armas — e avance até enfrentar o Dragão Final da Incerteza.
            </p>
            {!loaded && <p style={{ color:'#6a5a38', marginTop:24, fontSize:14 }}>Carregando progresso salvo…</p>}
            {loaded && hasSave && savedSnapshot && (
              <StoneBanner>
                <p style={{ fontFamily:'Cinzel,serif', color:'#c9a23b', fontSize:13, display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
                  <IconScroll size={15} color="#c9a23b" /> Jornada em andamento
                </p>
                <p style={{ color:'#cbb88a', fontSize:11, marginTop:4 }}>
                  {ENEMIES[Math.min(savedSnapshot.enemyIdx ?? 0, ENEMIES.length - 1)].name} · Vida {savedSnapshot.playerHp} · XP {savedSnapshot.playerXp}
                </p>
                <button onClick={resumeSave} className="medieval-btn" style={{ width:'100%', marginTop:12, fontSize:13, padding:'10px 16px' }}>
                  Continuar Jornada
                </button>
              </StoneBanner>
            )}
            <button
              onClick={() => { startBattle(0); setScreen('lore'); }}
              className="medieval-btn"
              style={{ marginTop:16 }}
            >
              {hasSave ? 'Nova Jornada' : 'Iniciar Jornada'}
            </button>
          </div>
        )}

        {/* ══ LORE ═══════════════════════════════════════════════════════════ */}
        {screen === 'lore' && (
          <div className="fade-in" style={{ textAlign:'center', paddingTop:32 }}>
            <p style={{ fontFamily:'Cinzel,serif', color:'#c9a23b', fontSize:11, letterSpacing:2 }}>UM MESTRE SE APROXIMA</p>
            <h2 style={{ fontFamily:'Cinzel,serif', color:'#e8d8b0', fontSize:21, marginTop:6 }}>{lore.mentor}</h2>
            <div style={{ width:62, height:62, background:'radial-gradient(circle,#241a0e,#120c06)', border:'1px solid #c9a23b', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'16px auto' }}>
              <IconBook size={28} color="#c9a23b" />
            </div>
            <RuneDivider />
            <p style={{ color:'#cbb88a', fontSize:14, lineHeight:1.7, marginTop:8 }}>{lore.text}</p>
            <StoneBanner>
              <p style={{ color:'#9fc77a', fontSize:14, fontStyle:'italic' }}>{lore.example}</p>
            </StoneBanner>
            <p style={{ color:'#c97a4a', fontSize:12, marginTop:16 }}>Próximo desafio: {enemy.name} — {enemy.concept}</p>
            <button onClick={() => setScreen('battle')} className="medieval-btn" style={{ marginTop:24 }}>
              Enfrentar inimigo
            </button>
          </div>
        )}

        {/* ══ BATTLE ═════════════════════════════════════════════════════════ */}
        {screen === 'battle' && current && (
          <div className="fade-in">
            {/* Enemy header */}
            <div style={{ background:'rgba(40,28,14,.55)', border:'1px solid #4a3a22', borderRadius:3, padding:12, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <p style={{ fontFamily:'Cinzel,serif', fontSize:10, color:'#c9a23b', letterSpacing:2 }}>
                    BATALHA {enemyIdx + 1}/{ENEMIES.length}
                  </p>
                  <h2 style={{ fontFamily:'Cinzel,serif', fontSize:18, color:'#e8d8b0' }}>{enemy.name}</h2>
                </div>
                <div style={{ color:'#c97a4a', fontSize:12, maxWidth:110, textAlign:'right' }}>{enemy.concept}</div>
              </div>
              <p style={{ color:'#a8966c', fontSize:14, marginTop:4 }}>{enemy.intro}</p>
            </div>

            {/* Monster art */}
            <div style={{ position:'relative', display:'flex', justifyContent:'center', height:186, margin:'16px 0' }}>
              <div className="rune-circle" style={{ position:'absolute', width:194, height:194, top:-6, left:'50%', transform:'translateX(-50%)' }} aria-hidden="true" />
              <div className={`${enemyHitFx ? 'shake flash-red' : ''} ${enemyHp <= 0 ? 'dissolve' : ''}`} style={{ position:'relative', width:170, height:170 }}>
                <Art enraged={enemyPct < 35} />
              </div>
            </div>

            {/* Enemy HP bar */}
            <div style={{ maxWidth:280, margin:'0 auto 8px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4, color:'#cbb88a' }}>
                <span>{enemy.name}</span><span>{enemyHp}/{enemy.maxHp}</span>
              </div>
              <div className="hp-bar-bg">
                <div className="hp-bar-fill" style={{ width:`${enemyPct}%`, background:'linear-gradient(90deg,#7a1414,#d6622c)' }} />
              </div>
            </div>

            {/* Combo indicator */}
            {streak >= 2 && (
              <div style={{ textAlign:'center', fontSize:12, color:'#ffb347', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                <IconFlame size={13} color="#ffb347" /> Combo x{streak}
              </div>
            )}

            {/* Player panel */}
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:12, background:'rgba(40,28,14,.55)', border:'1px solid #4a3a22', borderRadius:3, marginBottom:12 }}>
              <div className="glint" style={{ width:46, height:46, background:'radial-gradient(circle,#241a0e,#120c06)', border:'1px solid #c9a23b', borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <PlayerAvatar level={levelInfo.level} size={34} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'Cinzel,serif', fontSize:13, color:'#e8d8b0' }}>
                  {levelInfo.name} · Nível {levelInfo.level}
                </div>
                <div style={{ fontSize:10, color:'#8a7a52', marginBottom:2 }}>{classGearLabel(levelInfo.level)}</div>
                <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
                  <Heart size={12} color="#d6622c" />
                  <div className="hp-bar-bg" style={{ flex:1 }}>
                    <div className="hp-bar-fill" style={{ width:`${playerHp}%`, background:'linear-gradient(90deg,#7a1414,#d98a7a)' }} />
                  </div>
                  <span style={{ fontSize:11, width:30, textAlign:'right' }}>{playerHp}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
                  <Sparkles size={12} color="#7aa8d6" />
                  <div className="hp-bar-bg" style={{ flex:1 }}>
                    <div className="hp-bar-fill" style={{ width:`${playerMana}%`, background:'linear-gradient(90deg,#2e4a7a,#7aa8d6)' }} />
                  </div>
                  <span style={{ fontSize:11, width:30, textAlign:'right' }}>{playerMana}</span>
                </div>
              </div>
            </div>

            {/* Skill buttons */}
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:16 }}>
              <button onClick={useVision} disabled={!canUseVision} style={skillBtnStyle(canUseVision)} title={SKILLS[0].name} aria-label={SKILLS[0].name}>
                {defeatedCount >= 1 ? <IconEye size={16} /> : <Lock size={14} />}
                <span>{SKILLS[0].short}</span>
              </button>
              <button onClick={useShield} disabled={!canUseShield} style={skillBtnStyle(canUseShield)} title={SKILLS[1].name} aria-label={SKILLS[1].name}>
                {defeatedCount >= 2 ? <IconShield size={16} /> : <Lock size={14} />}
                <span>{defeatedCount >= 2 && shieldActive ? `${SKILLS[1].short} ✓` : SKILLS[1].short}</span>
              </button>
              <button onClick={activateStrike} disabled={!canUseStrike} style={skillBtnStyle(canUseStrike)} title={SKILLS[2].name} aria-label={SKILLS[2].name}>
                {defeatedCount >= 3 ? <IconBolt size={16} /> : <Lock size={14} />}
                <span>{SKILLS[2].short}</span>
              </button>
            </div>

            {/* Parchment / Question panel */}
            <div style={{ padding:16, background:'linear-gradient(135deg,#e7d8ad,#d8c598)', color:'#2a1f12', border:'1px solid #8a7240', borderRadius:3, boxShadow:'0 8px 24px rgba(0,0,0,.5), inset 0 0 40px rgba(120,90,40,.2)' }}>
              <p style={{ fontFamily:'EB Garamond,serif', fontStyle:'italic', marginBottom:12 }}>{current.enunciado}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {current.alternativas.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    disabled={answered || i === eliminatedIdx}
                    style={answerBtnStyle(i)}
                    aria-disabled={answered || i === eliminatedIdx}
                  >
                    <span style={{ opacity:0.6, marginRight:8 }}>{['A','B','C','D'][i]}</span>
                    {alt}
                  </button>
                ))}
              </div>

              {answered && (
                <div className="fade-in" style={{ marginTop:12 }}>
                  <p style={{ fontFamily:'Cinzel,serif', fontSize:14, color: lastCorrect ? '#2e6b1f' : '#8a2e1f' }} role="alert">
                    {feedbackMsg}
                  </p>
                  <div style={{ marginTop:8, padding:8, fontSize:14, background:'rgba(0,0,0,.06)', border:'1px solid rgba(0,0,0,.15)', borderRadius:3 }}>
                    <strong>Explicação:</strong> {current.explicacao}
                  </div>
                  <button onClick={nextStep} className="medieval-btn" style={{ marginTop:12, padding:'10px 16px', fontSize:13 }}>
                    Continuar <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ VITÓRIA FINAL ═══════════════════════════════════════════════════ */}
        {screen === 'finalVictory' && (
          <div className="fade-in" style={{ textAlign:'center', paddingTop:32 }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
              <IconTrophy size={40} color="#c9a23b" />
            </div>
            <h1 style={{ fontFamily:'Cinzel,serif', color:'#c9a23b', fontSize:23, fontWeight:900 }}>
              O Arquimago da Combinatória desperta
            </h1>
            <RuneDivider />
            <p style={{ color:'#cbb88a', fontSize:14, lineHeight:1.7, marginTop:8 }}>
              O Dragão Final da Incerteza foi derrotado. A ordem retorna ao reino, e você — antes um simples
              aprendiz — agora domina a contagem, as permutações, as combinações e a probabilidade.
            </p>
            <StoneBanner>
              <div style={{ fontSize:14, color:'#e8d8b0' }}>
                <div>Nível final: <strong>{levelInfo.level} · {levelInfo.name}</strong></div>
                <div>XP total: <strong>{playerXp}</strong></div>
                <div>Monstros derrotados: <strong>{defeatedCount}</strong></div>
              </div>
            </StoneBanner>
            {Object.keys(weakTopics).length > 0 ? (
              <div style={{ marginTop:12, fontSize:14, color:'#d98a7a', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <IconScroll size={14} color="#d98a7a" /> Tópicos para revisar: {topWeakTopics().join(', ')}
              </div>
            ) : (
              <div style={{ marginTop:12, fontSize:14, color:'#9fc77a' }}>Nenhum erro registrado — desempenho impecável.</div>
            )}
            <button onClick={resetGame} className="medieval-btn" style={{ marginTop:24 }}>
              Jogar Novamente
            </button>
          </div>
        )}

        {/* ══ GAME OVER ════════════════════════════════════════════════════════ */}
        {screen === 'gameover' && (
          <div className="fade-in" style={{ textAlign:'center', paddingTop:32 }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
              <IconSkull size={40} color="#8a2e1f" />
            </div>
            <h1 style={{ fontFamily:'Cinzel,serif', color:'#8a2e1f', fontSize:23, fontWeight:900 }}>Você caiu em batalha</h1>
            <RuneDivider />
            <p style={{ color:'#cbb88a', fontSize:14, lineHeight:1.7, marginTop:8 }}>
              O {enemy.name} provou ser demais para sua lógica ainda incompleta. Mas a sabedoria combinatória
              não se perde — apenas espera ser reconquistada.
            </p>
            <StoneBanner>
              <div style={{ fontSize:14, color:'#e8d8b0' }}>
                <div>Nível alcançado: <strong>{levelInfo.level} · {levelInfo.name}</strong></div>
                <div>XP acumulado: <strong>{playerXp}</strong></div>
              </div>
            </StoneBanner>
            {Object.keys(weakTopics).length > 0 && (
              <div style={{ marginTop:12, fontSize:14, color:'#d98a7a', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <IconScroll size={14} color="#d98a7a" /> Tópicos para revisar: {topWeakTopics().join(', ')}
              </div>
            )}
            <button onClick={resetGame} className="medieval-btn" style={{ marginTop:24 }}>
              Tentar Novamente
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
