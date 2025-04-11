import { Context, Schema } from 'koishi';
import openai from 'openai';
import { } from 'koishi-plugin-word-core';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

export const name = 'word-core-chatai';

export interface Config
{
  host: string;
  apiKey: string;
  model: string;
  systemContent: string;
  history: boolean;
  maxHistory: number;
}

export const Config: Schema<Config> = Schema.object({
  host: Schema.string().description('OpenAI 地址').default('https://api.openai.com/v1'),
  apiKey: Schema.string().description('OpenAI API Key'),
  model: Schema.string().default('gpt-3.5-turbo').description('OpenAI 模型'),
  systemContent: Schema.string().default('你是一个AI助手').description('系统提示词'),
  history: Schema.boolean().default(true).description('是否开启历史记录'),
  maxHistory: Schema.number().default(10).description('历史记录最大数量'),
});

export const inject = ['word'];

export function apply(ctx: Context, config: Config)
{
  const openAIClient = new openai.OpenAI({
    apiKey: config.apiKey,
    baseURL: config.host
  });

  const historyList: Record<string, openai.Chat.Completions.ChatCompletionMessageParam[]> = {};

  // 创建个ai聊天器
  // 语法：(ai:?内容)
  ctx.word.statement.addStatement('ai', async (inData, session) =>
  {
    const content = inData.args[0] ? inData.args[0] : session.content;

    if (!historyList[session.userId])
    {
      historyList[session.userId] = [
        { role: 'system', content: config.systemContent },
      ];
    }

    if (config.history)
    {
      historyList[session.userId].push({ role: 'user', content: content });
    }

    const toAi = await openAIClient.chat.completions.create({
      model: config.model,
      messages: historyList[session.userId],
    });

    const msg = toAi.choices[0].message.content;

    if (config.history)
    {
      historyList[session.userId].push({ role: 'assistant', content: msg });
      if (historyList[session.userId].length > config.maxHistory)
      {
        historyList[session.userId].splice(1, 1);
      }
    }

    return msg;
  });
}
