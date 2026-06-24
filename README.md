# LinguaLive

Real-time meeting transcription and translation. Captures system audio and mic, transcribes via Deepgram (with speaker diarization), translates to Vietnamese via GPT-4o mini, and provides a sidebar for meeting analysis and Q&A.

## Prerequisites

- **Node.js** 18+
- **FFmpeg** — `brew install ffmpeg`
- **BlackHole 2ch** — virtual audio driver for system audio capture ([download](https://existential.audio/blackhole/))
- Deepgram API key and OpenAI API key

## Setup

```bash
npm install
```

Create `.env` in the project root:

```
DEEPGRAM_API_KEY=your_deepgram_key
OPENAI_API_KEY=your_openai_key
```

## Usage

```bash
npm start
```

The app opens in **expanded view** (1080×720). Click **Bắt đầu** to start capturing audio. Click **Thu gọn panel** to switch to a compact floating overlay.

### Controls

| Control | Action |
|---|---|
| Bắt đầu / Dừng | Start or stop audio capture |
| 🎧 / 🎤 buttons | Toggle system audio (BlackHole) and mic independently |
| EN→VI / JA→VI | Switch transcription language |
| Thu gọn panel | Collapse to floating overlay |
| ⤢ (floating) | Expand back to full view |
| ✦ Cập nhật phân tích | Analyze full transcript — generates summary, action items, and suggested replies |
| Q&A input | Ask questions about the meeting in natural language |

### Audio devices

- **System audio:** BlackHole 2ch at avfoundation device `:0`
- **Mic:** MacBook Mic hardcoded at avfoundation device `:3`

If your mic is on a different device index, update `src/audio.js` (`MIC_DEVICE`).

## Development

```bash
npm test      # Run unit tests (15 tests: audio, deepgram, gpt)
npm start     # Launch Electron app
```

## Architecture

```
main.js           — Electron BrowserWindow, loads src/ipc.js
preload.js        — contextBridge: exposes window.api to renderer
src/
  audio.js        — FFmpeg process management (avfoundation → PCM)
  deepgram.js     — Deepgram WebSocket, diarization grouping
  gpt.js          — translate(), analyze(), qa() via GPT-4o mini
  ipc.js          — ipcMain handlers wiring audio → deepgram → renderer
renderer/
  index.html      — LinguaLive UI markup
  app.js          — State machine, DOM updates, IPC event wiring
  style.css       — Animations, view toggle, drag regions
```
