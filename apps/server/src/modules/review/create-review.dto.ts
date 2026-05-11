import { IsString, IsInt, Min, Max, IsOptional, IsArray } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
