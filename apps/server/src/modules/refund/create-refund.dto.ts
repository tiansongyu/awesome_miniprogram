import { IsString } from 'class-validator';

export class CreateRefundDto {
  @IsString()
  orderId: string;

  @IsString()
  reason: string;
}
