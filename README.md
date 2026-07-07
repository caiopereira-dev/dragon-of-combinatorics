# O Dragão da Incerteza

> **RPG Educacional de Análise Combinatória e Probabilidade**  
> Um jogo dark fantasy medieval onde você aprende matemática derrotando dragões.

---

## Sobre

**O Dragão da Incerteza** é um RPG educacional digital desenvolvido em React + Vite para o ensino de **Análise Combinatória e Probabilidade** no Ensino Médio. O jogo adota mecânicas de RPG de turno para motivar estudantes a resolver problemas matemáticos dentro de um contexto de dark fantasy medieval.

## Tecnologias

| Tecnologia | Versão |
|---|---|
| React | 18.3.x |
| Vite | 5.3.x |
| lucide-react | 0.383.x |
| gh-pages | 6.x |

## Como executar localmente

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/dragon-of-combinatorics.git
cd dragon-of-combinatorics

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
# Acesse http://localhost:5173
```

## Como publicar no GitHub Pages

### Opção A — GitHub Actions (recomendado, automático)

1. Crie o repositório no GitHub com o nome `dragon-of-combinatorics`
2. Confirme que o nome do repositório bate com a configuração `base` em `vite.config.js`
3. Faça push para a branch `main`:

```bash
git init
git add .
git commit -m "feat: versão inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/dragon-of-combinatorics.git
git push -u origin main
```

4. No GitHub: **Settings → Pages → Source → GitHub Actions**
5. O deploy acontece automaticamente a cada push na `main`

### Opção B — Deploy manual com gh-pages

```bash
# Build + deploy em um comando
npm run deploy
```

> Requer que o repositório remoto `origin` já esteja configurado.

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot-reload |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Visualiza o build localmente |
| `npm run deploy` | Build + deploy via gh-pages |

## Estrutura do projeto

```
dragon-of-combinatorics/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions — deploy automático
├── public/
│   └── .nojekyll           # Evita processamento Jekyll no GitHub Pages
├── src/
│   ├── main.jsx            # Entry point React 18
│   ├── index.css           # Reset global + Google Fonts
│   └── App.jsx             # Componente raiz (jogo completo)
├── index.html              # Template HTML do Vite
├── vite.config.js          # Configuração do Vite (base path)
├── package.json
└── .gitignore
```

## Licença

MIT — Caio Ferreira Alves Pereira · 2026
