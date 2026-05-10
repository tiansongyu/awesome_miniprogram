import {
  IsNumber,
  IsObject,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PriceType } from '@prisma/client';

export class SkuPriceDto {
  @IsEnum(PriceType)
  priceType: PriceType;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateSkuDto {
  @IsObject()
  specs: Record<string, string>;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkuPriceDto)
  prices: SkuPriceDto[];
}
