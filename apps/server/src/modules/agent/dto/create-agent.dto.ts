import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateAgentDto {
  @IsString()
  phone: string;

  @IsString()
  nickname: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsEnum(Role)
  role: Role;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  frozen?: boolean;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
