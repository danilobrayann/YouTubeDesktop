# 🎬 YouTube Desktop

<p align="center">
  <strong>Aplicativo Desktop moderno para assistir e baixar vídeos, playlists e músicas do YouTube.</strong><br>
  Construído com Electron, design em Glassmorphism, temas personalizáveis com gradientes e suporte a imagem de fundo do computador.
</p>

---

## 📑 Sumário

- [✨ Funcionalidades](#-funcionalidades)
- [⚡ Instalação Rápida (1 Clique)](#-instalação-rápida-1-clique)
- [📦 Como Gerar o Executável (.exe) Nativo](#-como-gerar-o-executável-exe-nativo)
- [🎮 Como Usar o Aplicativo](#-como-usar-o-aplicativo)
  - [Assistir Vídeos](#1-assistir-vídeos)
  - [Baixar Vídeos, Músicas e Playlists](#2-baixar-vídeos-músicas-e-playlists)
  - [Personalizar Temas e Fundo](#3-personalizar-temas-e-fundo)
- [⌨️ Atalhos do Teclado](#️-atalhos-do-teclado)
- [📁 Scripts e Arquivos do Projeto](#-scripts-e-arquivos-do-projeto)
- [🛠️ Requisitos Manuais (Opcional)](#️-requisitos-manuais-opcional)
- [❓ Resolução de Problemas](#-resolução-de-problemas)

---

## ✨ Funcionalidades

- 📺 **Player de Vídeo Embutido**: Navegue e assista ao YouTube diretamente no app com player integrado de alta definição que preenche 100% da tela e acompanha o redimensionamento da janela.
- ⛶ **Modo Tela Total / Cinema**: Oculte a barra de navegação com 1 clique para uma experiência imersiva e limpa.
- ⬇️ **Downloads Inteligentes e Organizados**:
  - **Vídeos**: MP4 em 1080p Full HD, 720p HD, 480p e 360p.
  - **Áudio / Músicas**: Extração direta para MP3, M4A ou Opus.
  - **Gerenciamento de Playlists**: Detecta automaticamente a quantidade total de vídeos antes de baixar, avisa com antecedência e cria uma **pasta separada exclusiva** com o nome da playlist, mantendo todos os arquivos organizados e numerados.
  - **Barra de Progresso Dinâmica com Cores a cada %**: Barra de progresso neon viva com gradientes que se transformam dinamicamente a cada porcentagem (do rosa choque ao roxo, azul ciano, verde esmeralda e dourado) com brilho e texto colorido em tempo real.
  - **Notificação e Alerta Sonoro**: Ao concluir qualquer download, emite uma notificação nativa do Windows e um som sutil de confirmação, além de botão direto para abrir a pasta de destino.
- 🎨 **Motor de Temas Completo**:
  - 7 Presets prontos: **Dark**, **AMOLED (Preto puro)**, **Midnight (Roxo)**, **Ocean (Azul)**, **Forest (Verde)**, **Sunset (Laranja)** e **Light (Claro)**.
  - Suporte a **Gradientes personalizados** (escolha o ângulo e as duas cores).
  - Controle de **Transparência e Efeito Vidro (Glassmorphism)** com ajuste fino de desfoque (blur) e opacidade.
  - Suporte a **Imagem de Fundo**: selecione qualquer foto ou papel de parede do seu próprio computador (`.jpg`, `.png`, `.webp`).
- 🪟 **Interface Fluida e Moderna**: Janela sem bordas (frameless), barra de título personalizada, botões de janela nativos e atalho na Área de Trabalho com ícone oficial.

---

## ⚡ Instalação Rápida (1 Clique)

Você **não precisa** configurar nada manualmente por terminal. O projeto já vem com instalador automático em lote (`.bat`).

### Passo a Passo:

1. Abra a pasta do projeto.
2. Dê **dois cliques** no arquivo:
   ```text
   instalar.bat
   ```
3. O instalador automático irá:
   - ✅ Verificar e configurar o **Node.js**.
   - ✅ Criar o arquivo de **ícone oficial (`assets\icon.ico`)** usando a API nativa do Windows.
   - ✅ Instalar as dependências do Electron (`npm install`).
   - ✅ Criar automaticamente um **atalho com ícone na sua Área de Trabalho**.
4. Ao final da instalação, escolha no menu:
   - Digite `1` para **Abrir o app imediatamente**.
   - Digite `2` para **Gerar o Instalador Executável `.exe` definitivo**.

---

## 📦 Como Gerar o Executável (.exe) Nativo

Para transformar o projeto em um programa executável `.exe` independente no seu Windows:

1. Dê dois cliques em:
   ```text
   construir.bat
   ```
2. Escolha o tipo de build:
   - **Opção `1` — Executável Nativo Direto (Recomendado)**:
     - Gera uma pasta autônoma em `dist\win-unpacked\` com o executável **`YouTube Desktop.exe`** e o ícone já embutido.
     - Não requer privilégios de Administrador e não dá erros de permissão.
     - Atualiza o atalho da Área de Trabalho para abrir o executável diretamente.
   - **Opção `2` — Instalador Setup Completo (.exe)**:
     - Gera o instalador assistido `YouTube Desktop Setup 1.0.0.exe` em `dist\`.
     - *Dica*: Caso utilize a opção 2, execute o `construir.bat` clicando com o botão direito e selecionando **"Executar como Administrador"**.

---

## 🎮 Como Usar o Aplicativo

### 1. Assistir Vídeos
- Ao abrir o app, a tela inicial já carrega a página inicial do YouTube.
- **Barra de Endereço**: Cole o link de qualquer vídeo ou digite termos de pesquisa e clique em **Assistir** ou pressione `Enter`.
- **Botões de Navegação**:
  - `‹` e `›` : Voltar e avançar páginas no histórico.
  - `↻` : Recarregar o player.
  - `🏠` : Voltar à página inicial do YouTube.
  - `⛶` : Alternar o modo tela cheia do player (oculta a barra de endereço para assistir com 100% de aproveitamento de tela).

### 2. Baixar Vídeos, Músicas e Playlists
- **Download Rápido**: Enquanto assiste a qualquer vídeo, clique no botão **⬇ Baixar** ao lado da barra de endereço. Uma janela abrirá com o formato desejado (1080p, 720p, MP3, etc.).
- **Aba de Downloads**:
  - Clique em **⬇️ Downloads** na barra lateral.
  - Cole o link do vídeo ou playlist.
  - Escolha o formato desejado no menu suspenso.
  - Clique em **Baixar**.
  - Você pode alterar a pasta onde os arquivos são salvos clicando em **📁 Alterar Pasta**.

### 3. Personalizar Temas e Fundo
- Clique em **⚙️ Configurações** na barra lateral.
- **Presets**: Escolha um dos 7 estilos visuais pré-definidos.
- **Cores e Gradientes**: Ative ou desative o gradiente, escolha as cores de destaque e ajuste o ângulo.
- **Efeito Vidro / Glass**: Ajuste os controles deslizantes de desfoque (blur) e opacidade.
- **Imagem de Fundo**: Clique em **Escolher Imagem** para colocar qualquer foto ou wallpaper do seu computador como plano de fundo do aplicativo.
- Clique em **Salvar Tema** para manter suas preferências salvas mesmo após fechar o programa.

---

## ⌨️ Atalhos do Teclado

| Atalho | Ação |
| :--- | :--- |
| `Ctrl + L` | Selecionar e focar na barra de endereço/pesquisa |
| `Ctrl + D` | Abrir a aba de **Downloads** |
| `Ctrl + ,` | Abrir a aba de **Configurações e Temas** |
| `Enter` | Carregar vídeo ou iniciar pesquisa |
| `Esc` | Fechar modais e janelas sobrepostas |

---

## 📁 Scripts e Arquivos do Projeto

| Arquivo | Função |
| :--- | :--- |
| **`instalar.bat`** | ⭐ **Instalador principal** — verifica tudo, instala dependências e cria atalho. |
| **`iniciar.bat`** | Inicia o aplicativo diretamente de forma rápida. |
| **`construir.bat`** | Compila o aplicativo e gera o executável `.exe` na pasta `dist\`. |
| **`gerar-icone.bat`** | Gera o arquivo `assets\icon.ico` oficial do Windows via script .NET. |
| **`atualizar-ytdlp.bat`** | Atualiza a ferramenta de download para a versão mais recente. |

---

## 🛠️ Requisitos Manuais (Opcional)

O script `instalar.bat` já instala tudo de forma automática. Caso prefira instalar os componentes manualmente:

1. **Node.js** (versão 18 ou superior):
   - Download oficial: [nodejs.org](https://nodejs.org/)
   - Ou via terminal: `winget install OpenJS.NodeJS.LTS`
2. **yt-dlp** (mecanismo de download):
   - Download oficial: [github.com/yt-dlp/yt-dlp/releases](https://github.com/yt-dlp/yt-dlp/releases)
   - Ou via terminal: `winget install yt-dlp.yt-dlp`
3. **FFmpeg** (necessário para extração de MP3 e mesclagem de vídeo 1080p):
   - Via terminal: `winget install Gyan.FFmpeg`

---

## ❓ Resolução de Problemas

#### O atalho na Área de Trabalho não apareceu
Execute novamente o arquivo `instalar.bat` ou abra o app diretamente através de `iniciar.bat`. Um atalho de segurança também é mantido na própria pasta do projeto.

#### O build do executável travou com erro de symlink / permissão
Abra o arquivo `construir.bat` e escolha a **Opção 1 (Executável Nativo Direto)**. Ela compila o aplicativo em pasta sem depender do utilitário de links simbólicos do macOS.

#### Os downloads não iniciam ou dão erro
Certifique-se de que o **yt-dlp** e o **FFmpeg** estão instalados. Você pode rodar `atualizar-ytdlp.bat` para garantir que o mecanismo esteja na versão mais recente que suporta as últimas atualizações do YouTube.
