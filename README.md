# LinguaLive

Real-time meeting transcription, translation, and AI conversation assistant. Captures system audio and mic, transcribes via OpenAI Realtime Whisper, translates to Vietnamese via GPT-4o mini, and provides an AI chat sidebar for live conversation coaching.

## Prerequisites

- **Node.js** 18+
- **FFmpeg** — `brew install ffmpeg`
- **BlackHole 2ch** — virtual audio driver for system audio capture ([download](https://existential.audio/blackhole/))
- OpenAI API key

## Setup

```bash
npm install
```

Create `.env` in the project root:

```
OPENAI_API_KEY=your_openai_key
```

## Usage

```bash
npm start
```

Click **Bắt đầu** to start capturing audio.

### Controls

| Control | Action |
|---|---|
| Bắt đầu / Dừng | Start or stop audio capture |
| 🎧 / 🎤 | Toggle system audio (BlackHole) and mic independently |
| EN→VI / JA→VI | Switch transcription language |
| ✦ button (top right) | Show / hide AI chat sidebar |

### AI Sidebar

Type any question about the ongoing conversation, or use the quick chips:

- **Đang hỏi gì?** — identifies the most recent question directed at you
- **Nên nói gì?** — suggests 2–3 natural responses in the meeting language
- **Tóm tắt** — summarises what's been discussed

For Japanese meetings, each suggested phrase includes romaji pronunciation and a simple Vietnamese translation.

### Audio devices

- **System audio:** BlackHole 2ch at avfoundation device `:0`
- **Mic:** MacBook Mic at avfoundation device `:3`

To use a different mic index, update `src/audio.js`.

## Development

```bash
npm test    # Run unit tests
npm start   # Launch Electron app
```

## Architecture

```
main.js             — Electron BrowserWindow
preload.js          — contextBridge: exposes window.api to renderer
src/
  audio.js          — FFmpeg process (avfoundation → 16kHz PCM)
  openai-stt.js     — OpenAI Realtime Whisper WebSocket, client VAD, sentence buffer
  gpt.js            — translate(), translateStreaming(), chat() via GPT-4o mini
  ipc.js            — ipcMain handlers wiring audio → STT → renderer
renderer/
  index.html        — UI markup
  app.js            — State, DOM updates, IPC event wiring
  style.css         — Animations, layout, drag regions
```
