import { Controller, Post, Body } from '@nestjs/common';
import { BrowserService } from './browser.service';
import { RequestDto } from './dto/request.dto';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

/**
 * Controller for handling browser-related operations.
 */
@ApiTags('browser')
@Controller('/api/v1/browser')
export class BrowserController {
  constructor(private readonly browserService: BrowserService) {}

  /**
   * Endpoint to scan a web page.
   * @param {RequestDto} requestDto - The request data transfer object containing URL and optional authentication details.
   * @returns {Promise<string>} - A promise that resolves to the normalized HTML content of the web page.
   */
  @Post('scan')
  @ApiOperation({ summary: 'Scan a web page' })
  @ApiBody({ type: RequestDto })
  async scanPage(@Body() requestDto: RequestDto): Promise<string> {
    return this.browserService.scanPage(requestDto);
  }
}
