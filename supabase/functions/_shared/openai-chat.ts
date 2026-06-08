const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-5.5';

export function getOpenAiModel(): string {
  return OPENAI_MODEL;
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/** gpt-5.x may spend tokens on reasoning — keep limits generous. */
export async function chatCompletion(
  messages: ChatMessage[],
  maxCompletionTokens: number,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: maxCompletionTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI chat failed (${OPENAI_MODEL}): ${response.status} ${err}`);
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }

  const refusal = choice?.message?.refusal;
  if (refusal) {
    throw new Error(`OpenAI refused: ${refusal}`);
  }

  const finish = choice?.finish_reason;
  throw new Error(
    `OpenAI returned empty content (model=${OPENAI_MODEL}, finish_reason=${finish ?? 'unknown'})`,
  );
}
