import { Controller, Post, Body } from '@nestjs/common';
import { BrowserService } from './browser.service';
import { RequestDto } from './dto/request.dto';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('browser')
@Controller('/api/v1/browser')
export class BrowserController {
  constructor(private readonly browserService: BrowserService) {}

  @Post('scan')
  @ApiOperation({ summary: 'Scan a web page' })
  @ApiBody({ type: RequestDto })
  async scanPage(@Body() requestDto: RequestDto) {
    return this.browserService.scanPage(requestDto);
  }
}
