import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai'; // Replace with the actual OpenAI package if needed
import { generateSystemPrompt } from '../common/prompts';

@Injectable()
export class LlmService {
  private openai: any;
  private readonly logger = new Logger(LlmService.name);
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
    });
  }

  async processText(text: string): Promise<any> {
    this.logger.log('Processing text with LLM service');
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        generateSystemPrompt(),
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 1,
      max_tokens: 4095,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
    return response.choices[0].message.content.toString();
  }
}
