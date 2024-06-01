import { Module } from '@nestjs/common';
import { BrowserService } from './browser.service';
import { BrowserController } from './browser.controller';
import { LlmModule } from '../llm/llm.module';
import { ParserModule } from '../parser/parser.module';

@Module({
  imports: [LlmModule, ParserModule],
  providers: [BrowserService],
  controllers: [BrowserController],
})
export class BrowserModule {}
