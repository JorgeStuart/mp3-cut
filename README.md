# MP3 Cortar

Editor de áudio **local**: aparar início/fim ou remover um trecho do meio.

- **Site (navegador)** — celular, Windows, Mac, Linux; exporta MP3 e WAV.
- **App desktop (Electron)** — todos os formatos com ffmpeg; ver seção de instaladores abaixo.

## Versão web (GitHub Pages)

Depois de publicar o repositório, o site fica em:

`https://SEU-USUARIO.github.io/NOME-DO-REPO/`

(ex.: `https://jorgestuart.github.io/mp3-cut/`)

O áudio é processado **no aparelho**; o GitHub só hospeda os arquivos do site.

### Publicar no seu GitHub (passo a passo)

1. Crie um repositório no GitHub (ex.: `mp3-cut`).
2. Na pasta do projeto:

```bash
git init
git add .
git commit -m "MP3 Cortar — web e desktop"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/mp3-cut.git
git push -u origin main
```

3. No GitHub: **Settings → Pages → Build and deployment → Source** = **GitHub Actions**.
4. O workflow `.github/workflows/deploy-pages.yml` roda no push e publica o site (1–3 min).
5. Em **Settings → Pages** aparece o link do site.

Se o repositório **não** se chamar `mp3-cut`, ajuste o preview local:

```bash
VITE_BASE_PATH=/nome-do-repo/ npm run build:web
```

No push para o `main`, o Actions usa o nome do repositório automaticamente.

### Testar a versão web no PC

```bash
npm run dev:web          # http://localhost:5173
npm run build:web        # gera dist-web/ (base /mp3-cut/ por padrão)
VITE_BASE_PATH=/ npm run build:web   # build com base na raiz
```

## Para quem recebe o app desktop (sem instalar Node)

Escolha o arquivo certo para o sistema operacional na pasta que você recebeu:

| Sistema | Arquivo | Como usar |
|--------|---------|-----------|
| **Linux** | `MP3 Cortar-*-linux-x86_64.AppImage` | `chmod +x MP3\ Cortar-*.AppImage` e execute (ou duplo clique) |
| **Linux (Fedora, opcional)** | `MP3 Cortar-*-linux-x86_64.rpm` | Só se você gerou o RPM; `sudo dnf install ./MP3\ Cortar-*.rpm` |
| **Windows** | `MP3 Cortar-*-win-x64.exe` | Instalador; siga o assistente |
| **macOS** | `MP3 Cortar-*-mac-*.dmg` | Abra o `.dmg` e arraste o app para Aplicativos |

Nada é enviado para a internet: abrir, cortar e salvar acontece só no computador.

### AppImage no Linux

Se o sistema pedir FUSE, instale o pacote de suporte (ex. no Fedora: `sudo dnf install fuse`).

## Gerar os instaladores (desenvolvedor)

Requisitos: Node.js 20+, npm.

```bash
npm ci
npm run dist:linux   # AppImage (recomendado no Linux)
npm run dist:win     # instalador .exe (rode no Windows)
npm run dist:mac     # .dmg (rode no macOS)
npm run dist         # pacote para o SO em que você está
```

Os arquivos prontos para distribuir ficam em **`release/`**.

Para montar uma pasta só com o instalador + instruções (fácil de zipar e mandar no WhatsApp/Drive):

```bash
npm run share
```

Isso cria a pasta **`distribuir/`** — compacte e envie.

### RPM no Fedora (opcional)

Para gerar `.rpm` além do AppImage, instale o compat do `libcrypt` e rode:

```bash
sudo dnf install libxcrypt-compat
npm run dist:linux-rpm
```

Para testar sem empacotar:

```bash
npm run dev
```

## Licenças

Este projeto usa [ffmpeg](https://ffmpeg.org/) (via `ffmpeg-static`, GPL) e outras bibliotecas open source listadas em `node_modules`.
