// tests/deepgram.test.js
const { groupWordsBySpeaker, buildUrl } = require('../src/deepgram');

test('groups consecutive words by speaker', () => {
  const words = [
    { word: 'So',      speaker: 0 },
    { word: 'the',     speaker: 0 },
    { word: 'latency', speaker: 1 },
    { word: 'is',      speaker: 1 },
    { word: 'high',    speaker: 1 },
  ];
  const segments = groupWordsBySpeaker(words);
  expect(segments).toEqual([
    { speakerId: 0, text: 'So the' },
    { speakerId: 1, text: 'latency is high' },
  ]);
});

test('single speaker returns one segment', () => {
  const words = [
    { word: 'Hello', speaker: 0 },
    { word: 'world', speaker: 0 },
  ];
  expect(groupWordsBySpeaker(words)).toEqual([{ speakerId: 0, text: 'Hello world' }]);
});

test('empty words returns empty array', () => {
  expect(groupWordsBySpeaker([])).toEqual([]);
});

test('speaker changes back produce correct segments', () => {
  const words = [
    { word: 'A', speaker: 0 },
    { word: 'B', speaker: 1 },
    { word: 'C', speaker: 0 },
  ];
  const segments = groupWordsBySpeaker(words);
  expect(segments).toHaveLength(3);
  expect(segments[2]).toEqual({ speakerId: 0, text: 'C' });
});

test('buildUrl includes diarize_model=latest and correct language', () => {
  const url = buildUrl('ja');
  expect(url).toContain('language=ja');
  expect(url).toContain('diarize_model=latest');
  expect(url).toContain('model=nova-3');
  expect(url).toContain('interim_results=true');
});

test('buildUrl switches language param', () => {
  expect(buildUrl('en')).toContain('language=en');
  expect(buildUrl('ja')).toContain('language=ja');
});
