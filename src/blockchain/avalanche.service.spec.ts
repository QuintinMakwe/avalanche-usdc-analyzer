import { Test, TestingModule } from '@nestjs/testing';
import { AvalancheService } from './avalanche.service';

describe('AvalancheService', () => {
  let service: AvalancheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AvalancheService],
    }).compile();

    service = module.get<AvalancheService>(AvalancheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
