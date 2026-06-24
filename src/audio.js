// src/audio.js
const { spawn } = require('child_process');

let ffmpegProcess = null;

function buildFFmpegArgs(sources) {
  const args = [];

  if (sources.system) args.push('-f', 'avfoundation', '-i', ':0');
  if (sources.mic)    args.push('-f', 'avfoundation', '-i', ':3');

  const activeCount = (sources.system ? 1 : 0) + (sources.mic ? 1 : 0);
  if (activeCount === 2) {
    args.push('-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first');
  }

  args.push('-ac', '1', '-ar', '16000', '-f', 's16le', 'pipe:1');
  return args;
}

function start(sources, onChunk, onExit) {
  const args = buildFFmpegArgs(sources);
  ffmpegProcess = spawn('ffmpeg', args);
  ffmpegProcess.stdout.on('data', onChunk);
  ffmpegProcess.on('close', onExit);
  return ffmpegProcess;
}

function stop() {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGTERM');
    ffmpegProcess = null;
  }
}

module.exports = { buildFFmpegArgs, start, stop };
