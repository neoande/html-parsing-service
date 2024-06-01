import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'node-html-parser';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { LlmService } from '../llm/llm.service';
import crypto from 'crypto';

const TEXT_TYPE_NODE = 3;

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  constructor(private readonly llmService: LlmService) {}

  async getNormalizedContent(
    htmlContent: string,
    originalUrl: string,
  ): Promise<string> {
    this.logger.log('Normalizing the HTML content');
    const parsedHtml = this.parseHtml(htmlContent);
    const folderPath = this.createFolderForResults(originalUrl);
    const tableImageTextContent = await this.extractContentWithTablesAndImages(
      parsedHtml,
      originalUrl,
      folderPath,
    );

    // Combine the content
    // Sanitize the combined content
    const combinedContent = this.sanitizeContent(tableImageTextContent);
    // Process content with LLM service
    const jsonText = await this.llmService.processText(combinedContent);
    // Save the content to a file
    await this.saveContent(originalUrl, jsonText, folderPath);
    return jsonText;
  }

  private parseHtml(htmlContent: string) {
    this.logger.log('Parsing HTML content');
    return parse(htmlContent);
  }

  private async extractContentWithTablesAndImages(
    parsedHtml: any,
    originalUrl: string,
    folderPath: string,
  ): Promise<string> {
    this.logger.log('Extracting content with tables and images');
    let combinedContent = '';

    for (const node of parsedHtml.childNodes) {
      combinedContent += await this.traverseNode(node, originalUrl, folderPath);
    }

    return combinedContent;
  }

  private async traverseNode(
    node: any,
    originalUrl: string,
    folderPath: string,
  ): Promise<string> {
    let content = '';
    if (node.tagName === 'TABLE') {
      const csvContent = this.convertTableToCSV(node);
      const hash = this.calculateHash(csvContent);
      const filename = `table_${hash}.txt`;
      this.saveToFile(filename, csvContent, folderPath);
      content += `[TABLE:${filename}]\n`;
    } else if (node.tagName === 'IMG') {
      const imageUrl = this.extractImageUrl(node, originalUrl);
      const imageContent = await this.fetchImage(imageUrl);
      const hash = this.calculateHash(imageContent);
      const filename = `image_${hash}.jpg`;
      this.saveToFile(filename, imageContent, folderPath, true);
      content += `[IMAGE:${filename}]\n`;
    } else if (node.nodeType === TEXT_TYPE_NODE) {
      const text = node.rawText.trim();
      content += `${text}\n`;
    } else if (
      node.tagName !== 'SCRIPT' &&
      node.tagName !== 'STYLE' &&
      node.childNodes
    ) {
      for (const childNode of node.childNodes) {
        content += await this.traverseNode(childNode, originalUrl, folderPath);
      }
    }
    return content;
  }

  private calculateHash(content: string | Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private saveToFile(
    filename: string,
    content: string | Buffer,
    folderPath: string,
    isBinary: boolean = false,
  ) {
    this.logger.log(`Saving file ${filename}`);
    const filePath = path.join(folderPath, filename);
    if (isBinary) {
      fs.writeFileSync(filePath, content);
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }

  private async fetchImage(url: string): Promise<Buffer> {
    this.logger.log(`Fetching image from ${url}`);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  }

  private convertTableToCSV(tableNode: any): string {
    let csvContent = '';
    const rows = tableNode.querySelectorAll('tr');

    rows.forEach((row: any) => {
      const cells = row.querySelectorAll('th, td');
      const rowContent = cells
        .map((cell: any) => cell.text.trim().replace(/\n/g, ' '))
        .join(',');
      csvContent += rowContent + '\n';
    });

    return csvContent;
  }

  private extractImageUrl(imgElement: any, originalUrl: string): string {
    this.logger.log('Extracting image URL');
    const src = imgElement.getAttribute('src');
    return new URL(src, originalUrl).href;
  }

  private sanitizeContent(content: string): string {
    this.logger.log('Sanitizing content');
    // Remove <!DOCTYPE html> if present
    content = content.replace(/<!DOCTYPE html>/i, '');

    // Replace non-breaking spaces with regular spaces
    content = content.replace(/\u00A0/g, ' ');
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&quot;/g, '"');
    content = content.replace(/&#39;/g, "'");

    // Preserve placeholders and remove unnecessary whitespace around them
    //content = content.replace(/\s*\[SENTENCE:/g, '\n[SENTENCE:');
    content = content.replace(/\s*\[IMAGE:/g, '\n[IMAGE:');
    content = content.replace(/\s*\[TABLE:/g, '\n[TABLE:');

    // Convert multiple newlines into a single newline
    content = content.replace(/\n\s*\n/g, '\n');
    return content;
  }

  private createFolderForResults(url: string): string {
    const normalizedUrl = new URL(url).toString();
    const urlHash = crypto
      .createHash('sha256')
      .update(normalizedUrl)
      .digest('hex');
    const timestamp = Date.now();
    const folderPath = path.join(__dirname, `${urlHash}_${timestamp}`);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    return folderPath;
  }

  private async saveContent(url: string, content: string, folderPath: string) {
    this.logger.log('Saving content...');
    const filename = `result.txt`;
    const filePath = path.join(folderPath, filename);
    fs.writeFileSync(filePath, content);
    this.logger.log(`Text content saved to ${filePath}`);
  }
}
