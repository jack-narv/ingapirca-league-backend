import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Test } from '@nestjs/testing';


describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = moduleRef.get<RolesGuard>(RolesGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});