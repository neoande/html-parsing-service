import { ApiProperty } from '@nestjs/swagger';

export class RequestDto {
  @ApiProperty({ description: 'The URL to scan' })
  url: string;

  @ApiProperty({ description: 'Proxy server address', required: false })
  proxy?: string;

  @ApiProperty({ description: 'Username for authentication', required: false })
  username?: string;

  @ApiProperty({ description: 'Password for authentication', required: false })
  password?: string;
}
