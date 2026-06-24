// tests/audio.test.js
const { buildFFmpegArgs } = require('../src/audio');

test('both sources: uses amix filter', () => {
  const args = buildFFmpegArgs({ system: true, mic: true });
  expect(args).toContain('-filter_complex');
  expect(args.find(a => a.includes('amix'))).toBeTruthy();
  const inputs = args.filter(a => a === '-i');
  expect(inputs).toHaveLength(2);
});

test('system only: single input, no filter', () => {
  const args = buildFFmpegArgs({ system: true, mic: false });
  const inputs = args.filter(a => a === '-i');
  expect(inputs).toHaveLength(1);
  expect(args).not.toContain('-filter_complex');
  expect(args).toContain(':0');
});

test('mic only: single input :3, no filter', () => {
  const args = buildFFmpegArgs({ system: false, mic: true });
  const inputs = args.filter(a => a === '-i');
  expect(inputs).toHaveLength(1);
  expect(args).not.toContain('-filter_complex');
  expect(args).toContain(':3');
});

test('output is always 16kHz mono s16le pipe', () => {
  const args = buildFFmpegArgs({ system: true, mic: false });
  expect(args).toContain('-ac');
  expect(args[args.indexOf('-ac') + 1]).toBe('1');
  expect(args).toContain('-ar');
  expect(args[args.indexOf('-ar') + 1]).toBe('16000');
  expect(args).toContain('-f');
  expect(args).toContain('s16le');
  expect(args).toContain('pipe:1');
});
