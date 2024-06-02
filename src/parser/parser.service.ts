import { Injectable, Logger } from '@nestjs/common';
import { parse, HTMLElement } from 'node-html-parser';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { LlmService } from '../llm/llm.service';
import crypto from 'crypto';

const TEXT_TYPE_NODE = 3;
const MAX_CHUNK_SIZE = 3000;
@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  constructor(private readonly llmService: LlmService) {}

  /**
   * Normalizes the HTML content by parsing it, chunking it, extracting relevant content,
   * and processing it through an LLM service.
   * @param {string} htmlContent - The raw HTML content to be normalized.
   * @param {string} originalUrl - The original URL of the HTML content.
   * @returns {Promise<any>} - A promise that resolves to the normalized content.
   */
  async getNormalizedContent(
    htmlContent: string,
    originalUrl: string,
  ): Promise<any> {
    this.logger.log('Normalizing the HTML content');
    const parsedHtml = this.parseHtml(htmlContent);
    const folderPath = this.createFolderForResults(originalUrl);
    const chunks = this.chunkHTML(parsedHtml, MAX_CHUNK_SIZE);

    const responses = [];
    for (const chunk of chunks) {
      if (chunk.childNodes.length === 0) {
        continue;
      }
      this.logger.log(`Processing chunk of size ${chunk.outerHTML.length}`);
      const tableImageTextContent =
        await this.extractContentWithTablesAndImages(
          chunk,
          originalUrl,
          folderPath,
        );
      const sanitizedContent = this.sanitizeContent(tableImageTextContent);
      const response = await this.llmService.processText(sanitizedContent);
      responses.push(JSON.parse(response));
    }

    await this.saveContent(originalUrl, JSON.stringify(responses), folderPath);
    return responses;
  }

  /**
   * Parses the given HTML content into a DOM structure.
   * @param {string} htmlContent - The raw HTML content to be parsed.
   * @returns {HTMLElement} - The parsed HTML element.
   */
  private parseHtml(htmlContent: string) {
    this.logger.log('Parsing HTML content');
    return parse(htmlContent);
  }

  /**
   * Chunks the HTML content into smaller parts to avoid hitting the token limit.
   * @param {HTMLElement} element - The HTML element to be chunked.
   * @param {number} chunkSize - The maximum size of each chunk.
   * @returns {HTMLElement[]} - An array of chunked HTML elements.
   */
  private chunkHTML(element: HTMLElement, chunkSize: number): HTMLElement[] {
    const chunks: HTMLElement[] = [];
    let currentChunk: HTMLElement = parse('<div></div>');
    let currentSize = 0;

    const appendNodeToChunk = (node: HTMLElement) => {
      const nodeHTML = node.outerHTML;
      // If adding this node exceeds chunk size and current chunk is not empty, start a new chunk
      if (currentSize + nodeHTML.length > chunkSize && currentSize > 0) {
        chunks.push(currentChunk);
        currentChunk = parse('<div></div>');
        currentSize = 0;
      }
      // If the node itself is larger than chunk size, it becomes its own chunk
      if (nodeHTML.length > chunkSize) {
        chunks.push(parse(node.outerHTML));
      } else {
        currentChunk.appendChild(parse(node.outerHTML));
        currentSize += nodeHTML.length;
      }
    };

    const traverseNodes = (node: HTMLElement) => {
      node.childNodes.forEach((child) => {
        if (child instanceof HTMLElement) {
          appendNodeToChunk(child);
        }
      });
    };

    traverseNodes(element);

    // Add the last chunk if it has content
    if (currentChunk.childNodes.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Extracts content with tables and images from the parsed HTML.
   * @param {HTMLElement} parsedHtml - The parsed HTML element.
   * @param {string} originalUrl - The original URL of the HTML content.
   * @param {string} folderPath - The folder path to save extracted content.
   * @returns {Promise<string>} - A promise that resolves to the combined content.
   */
  private async extractContentWithTablesAndImages(
    parsedHtml: HTMLElement,
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

  /**
   * Traverses a node and extracts its content, handling tables and images specifically.
   * @param {any} node - The node to traverse.
   * @param {string} originalUrl - The original URL of the HTML content.
   * @param {string} folderPath - The folder path to save extracted content.
   * @returns {Promise<string>} - A promise that resolves to the extracted content.
   */
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

  /**
   * Calculates the SHA-256 hash of the given content.
   * @param {string | Buffer} content - The content to hash.
   * @returns {string} - The calculated hash.
   */
  private calculateHash(content: string | Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Saves the given content to a file.
   * @param {string} filename - The name of the file.
   * @param {string | Buffer} content - The content to save.
   * @param {string} folderPath - The folder path to save the file in.
   * @param {boolean} [isBinary=false] - Whether the content is binary.
   */
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

  /**
   * Fetches an image from the given URL.
   * @param {string} url - The URL of the image.
   * @returns {Promise<Buffer>} - A promise that resolves to the image content as a buffer.
   */
  private async fetchImage(url: string): Promise<Buffer> {
    this.logger.log(`Fetching image from ${url}`);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  }

  /**
   * Converts an HTML table node to CSV format.
   * @param {any} tableNode - The table node to convert.
   * @returns {string} - The CSV representation of the table.
   */
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

  /**
   * Extracts the image URL from an image element.
   * @param {any} imgElement - The image element.
   * @param {string} originalUrl - The original URL of the HTML content.
   * @returns {string} - The extracted image URL.
   */
  private extractImageUrl(imgElement: any, originalUrl: string): string {
    this.logger.log('Extracting image URL');
    const src = imgElement.getAttribute('src');
    return new URL(src, originalUrl).href;
  }

  /**
   * Sanitizes the content by removing unnecessary characters and formatting.
   * @param {string} content - The content to sanitize.
   * @returns {string} - The sanitized content.
   */
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

  /**
   * Creates a folder for saving results based on the URL and timestamp.
   * @param {string} url - The original URL of the HTML content.
   * @returns {string} - The created folder path.
   */
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

  /**
   * Saves the final content to a file.
   * @param {string} url - The original URL of the HTML content.
   * @param {string} content - The content to save.
   * @param {string} folderPath - The folder path to save the content in.
   * @returns {Promise<void>} - A promise that resolves when the content is saved.
   */
  private async saveContent(
    url: string,
    content: string,
    folderPath: string,
  ): Promise<void> {
    this.logger.log('Saving content...');
    const filename = `result.txt`;
    const filePath = path.join(folderPath, filename);
    fs.writeFileSync(filePath, content);
    this.logger.log(`Text content saved to ${filePath}`);
  }
}
