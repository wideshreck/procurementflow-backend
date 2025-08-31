import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersResolver } from './suppliers.resolver';
import { SuppliersService } from './suppliers.service';

describe('SuppliersResolver', () => {
  let resolver: SuppliersResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuppliersResolver, SuppliersService],
    }).compile();

    resolver = module.get<SuppliersResolver>(SuppliersResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
