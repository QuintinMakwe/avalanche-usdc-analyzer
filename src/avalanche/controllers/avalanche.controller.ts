import { Controller, Get, Query, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AvalancheAggregationService } from '../services/avalanche-aggregation.service';

@ApiTags('avalanche')
@Controller('avalanche')
export class AvalancheController {
  private readonly USDC_ADDRESS = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';

  constructor(
    private readonly aggregationService: AvalancheAggregationService
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get transfer statistics for a time period' })
  @ApiQuery({ name: 'startTime', type: Date })
  @ApiQuery({ name: 'endTime', type: Date })
  async getTransferStats(
    @Query('startTime') startTime: Date,
    @Query('endTime') endTime: Date
  ) {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
    return this.aggregationService.getTransferStats(startTime, endTime, this.USDC_ADDRESS, {});
  }

  @Get('top-accounts')
  @ApiOperation({ summary: 'Get top accounts by transaction volume' })
  @ApiQuery({ name: 'startTime', type: Date })
  @ApiQuery({ name: 'endTime', type: Date })
  @ApiQuery({ name: 'tokenAddress', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getTopAccounts(
    @Query('startTime') startTime: Date,
    @Query('endTime') endTime: Date,
    @Query('tokenAddress') tokenAddress: string = this.USDC_ADDRESS,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10
  ) {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Invalid pagination parameters');
    }
    return this.aggregationService.getTopAccounts(startTime, endTime, tokenAddress, { page, limit });
  }

  @Get('transfers')
  @ApiOperation({ summary: 'Get transfers within a time range' })
  @ApiQuery({ name: 'startTime', type: Date })
  @ApiQuery({ name: 'endTime', type: Date })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getTransfersByTimeRange(
    @Query('startTime') startTime: Date,
    @Query('endTime') endTime: Date,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10
  ) {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Invalid pagination parameters');
    }
    return this.aggregationService.getTransfersByTimeRange(startTime, endTime, { page, limit });
  }
} 