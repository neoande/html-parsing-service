import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BrowserModule } from './browser/browser.module';
import { LlmModule } from './llm/llm.module';
import { ParserModule } from './parser/parser.module';

@Module({
  imports: [BrowserModule, LlmModule, ParserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
