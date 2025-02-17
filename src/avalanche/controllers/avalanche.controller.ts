import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AvalancheAggregationService } from '../services/avalanche-aggregation.service';
import { AvalancheMonitorService } from '../services/avalanche-monitor.service';

@ApiTags('avalanche')
@Controller('avalanche')
export class AvalancheController {
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
    return this.aggregationService.getTransferStats(startTime, endTime);
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
    @Query('tokenAddress') tokenAddress?: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10
  ) {
    return this.aggregationService.getTopAccounts(startTime, endTime, tokenAddress, { page, limit });
  }
} 