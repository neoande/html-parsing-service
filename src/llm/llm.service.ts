import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai'; // Replace with the actual OpenAI package if needed
import { generateSystemPrompt } from '../common/prompts';

/**
 * Service to interact with the OpenAI language model.
 */
@Injectable()
export class LlmService {
  private openai: any;
  private readonly logger = new Logger(LlmService.name);

  /**
   * Initializes the LLM service with the OpenAI API key.
   */
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
    });
  }

  /**
   * Processes the given text using the OpenAI language model.
   * @param {string} text - The text to be processed by the language model.
   * @returns {Promise<any>} - A promise that resolves to the response from the language model.
   */
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
      top_p: 1,
    });
    return response.choices[0].message.content;
  }
}
