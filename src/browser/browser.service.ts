import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import { RequestDto } from './dto/request.dto';
import { ParserService } from '../parser/parser.service';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import performanceNow from 'performance-now';
import UserAgent from 'user-agents';

import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AnonymizeUAPlugin from 'puppeteer-extra-plugin-anonymize-ua';

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin());
puppeteer.use(AnonymizeUAPlugin());

@Injectable()
export class BrowserService {
  private readonly logger = new Logger(BrowserService.name);
  constructor(private readonly parserService: ParserService) {}

  async scanPage(requestDto: RequestDto): Promise<string> {
    const start = performanceNow();
    const browser = await this.launchBrowser(requestDto);
    const page = await browser.newPage();

    await this.authenticatePage(page, requestDto);
    await this.setupPage(page);
    await this.navigateToUrl(page, requestDto.url);

    const htmlContent = await this.extractHtmlContent(page);

    // Use ParserService to get normalized content
    const jsonContent = await this.parserService.getNormalizedContent(
      htmlContent,
      requestDto.url,
    );
    this.logger.log('Web page content normalized');
    await browser.close();
    this.logger.log('Browser closed. Script complete.');

    const end = performanceNow();
    const duration = (end - start).toFixed(2);
    this.logger.log(`scanPage execution time: ${duration} ms`);

    return jsonContent;
  }

  private async launchBrowser(requestDto: RequestDto) {
    this.logger.log('Launching browser...');
    const args: string[] = [
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--ignore-certificate-errors',
    ];

    if (requestDto.proxy) {
      this.logger.log(`Using proxy: ${requestDto.proxy}`);
      args.push('--proxy-server=' + requestDto.proxy);
    }
    const options = { args, timeout: 60000 };
    return await puppeteer.launch(options);
  }

  private async authenticatePage(page: any, requestDto: RequestDto) {
    if (requestDto.username && requestDto.password) {
      this.logger.log('Authenticating...');
      await page.authenticate({
        username: requestDto.username,
        password: requestDto.password,
      });
    }
  }

  private async setupPage(page: any) {
    this.logger.log('Setting up page...');
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    const randomUserAgent = userAgent.toString();
    this.logger.log(`Using user agent: ${randomUserAgent}`);
    await page.setUserAgent(randomUserAgent);
    await page.setViewport({ width: 1920, height: 1080 });
  }

  private async navigateToUrl(page: any, url: string) {
    this.logger.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });
    } catch (error) {
      this.logger.warn(`networkidle2 failed: ${error.message}`);
      this.logger.log('Falling back to waitUntil: load');
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
    }
  }

  private async extractHtmlContent(page: any): Promise<string> {
    this.logger.log('Extracting HTML content...');
    return await page.content();
  }
}
