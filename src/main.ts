import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DateTime } from 'luxon';
import * as winston from 'winston';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const isColorEnabled = process.env.LOG_COLOR === 'true';

  const instance = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({
            format: () => DateTime.utc().toFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ"),
          }),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('Crawler', {
            colors: isColorEnabled,
            prettyPrint: true,
          }),
        ),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance,
    }),
  });

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
