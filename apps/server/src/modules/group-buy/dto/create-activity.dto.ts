import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  productId: string;

  @IsString()
  skuId: string;

  @IsNumber()
  @Min(0.01)
  groupPrice: number;

  @IsNumber()
  @Min(2)
  @IsOptional()
  groupSize?: number = 2;

  @IsNumber()
  @Min(1)
  @IsOptional()
  duration?: number = 24;

  @IsNumber()
  @IsOptional()
  maxGroups?: number = 0;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}
