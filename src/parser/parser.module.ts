import { Module } from '@nestjs/common';
import { ParserService } from './parser.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [ParserService],
  exports: [ParserService],
})
export class ParserModule {}
