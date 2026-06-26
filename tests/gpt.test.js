const { translate, isRefusal } = require('../src/gpt');

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

test('translate uses correct language label', async () => {
  mockFetch('こんにちは');
  await translate('key', 'Xin chào', 'ja');
  const body = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(body.messages[0].content).toContain('Japanese');
});

test('isRefusal detects refusal phrases', () => {
  expect(isRefusal('không thể dịch được', 'hello')).toBe(true);
  expect(isRefusal('xin lỗi, tôi không hiểu', 'hi')).toBe(true);
});

test('isRefusal passes normal translation', () => {
  expect(isRefusal('Xin chào thế giới', 'Hello world')).toBe(false);
});

test('isRefusal returns false for empty string', () => {
  expect(isRefusal('', 'hello')).toBe(false);
});
