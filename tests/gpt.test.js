// tests/gpt.test.js
const { translate, analyze, qa } = require('../src/gpt');

function mockFetch(content) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  });
}

beforeEach(() => jest.resetAllMocks());

test('translate returns GPT content string', async () => {
  mockFetch('Xin chào');
  const result = await translate('key', 'Hello', 'en');
  expect(result).toBe('Xin chào');
  expect(global.fetch).toHaveBeenCalledWith(
    'https://api.openai.com/v1/chat/completions',
    expect.objectContaining({ method: 'POST' })
  );
});

test('translate uses correct language label in system prompt', async () => {
  mockFetch('こんにちは');
  await translate('key', 'Xin chào', 'ja');
  const body = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(body.messages[0].content).toContain('Japanese');
});

test('analyze parses JSON response', async () => {
  const payload = JSON.stringify({
    summary: 'Tóm tắt',
    actions: ['Việc 1'],
    replies: [{ q: 'Câu hỏi?', a: 'Trả lời' }],
  });
  mockFetch(payload);
  const result = await analyze('key', [
    { speakerId: 0, text: 'Hello', timestamp: '10:00' },
  ]);
  expect(result.summary).toBe('Tóm tắt');
  expect(result.actions).toEqual(['Việc 1']);
  expect(result.replies[0].q).toBe('Câu hỏi?');
});

test('analyze falls back gracefully when JSON is invalid', async () => {
  mockFetch('not json');
  const result = await analyze('key', []);
  expect(result.summary).toBe('not json');
  expect(result.actions).toEqual([]);
  expect(result.replies).toEqual([]);
});

test('qa returns answer string', async () => {
  mockFetch('Đây là câu trả lời');
  const result = await qa('key', 'Câu hỏi?', []);
  expect(result).toBe('Đây là câu trả lời');
});
