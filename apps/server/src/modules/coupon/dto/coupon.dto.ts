import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { CouponType, CouponStatus } from '@prisma/client';

export class CreateCouponDto {
  @IsString()
  name: string;

  @IsEnum(CouponType)
  type: CouponType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @Min(1)
  totalCount: number;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

export class UpdateCouponDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(CouponType)
  @IsOptional()
  type?: CouponType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  totalCount?: number;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsEnum(CouponStatus)
  @IsOptional()
  status?: CouponStatus;
}
