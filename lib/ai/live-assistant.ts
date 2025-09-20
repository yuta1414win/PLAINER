import { randomUUID } from 'node:crypto';
import { getGeminiModelForTask } from '@/lib/gemini';
import type { LiveMessage, LiveSession } from '@/lib/types';

const DEFAULT_FALLBACK_MESSAGE =
  '現在詳細な回答を生成できませんが、ガイド改善のアイデアや質問があれば引き続きお知らせください。';

function buildConversationContext(session: LiveSession, userMessage: LiveMessage) {
  const history = session.messages
    .slice(-10) // limit context
    .map((message) => {
      const prefix = message.type === 'assistant' || message.type === 'system' ? 'Assistant' : 'User';
      return `${prefix}: ${message.content}`;
    })
    .join('\n');

  const systemPrompt = `あなたは「PLAINER」というプロダクトのLiveアシスタントです。`;

  return [
    systemPrompt,
    history ? `これまでの会話:\n${history}` : undefined,
    `ユーザーからの新しいメッセージ: ${userMessage.content}`,
    '日本語で、具体的かつ丁寧に返答してください。箇条書きが有効な場合は活用し、実装アドバイスや改善提案があれば簡潔に補足してください。',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function generateAssistantMessage(
  session: LiveSession,
  userMessage: LiveMessage
): Promise<LiveMessage> {
  const model = getGeminiModelForTask('balanced');
  const prompt = buildConversationContext(session, userMessage);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = (await response.text())?.trim();

    const content = text && text.length > 0 ? text : DEFAULT_FALLBACK_MESSAGE;

    const assistantMessage: LiveMessage = {
      id: randomUUID(),
      type: 'assistant',
      content,
      timestamp: new Date(),
    };

    return assistantMessage;
  } catch (error) {
    console.error('[LiveAssistant] Failed to generate response', error);
    return {
      id: randomUUID(),
      type: 'error',
      content: DEFAULT_FALLBACK_MESSAGE,
      timestamp: new Date(),
    };
  }
}
