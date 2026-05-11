import { IsString, IsOptional } from 'class-validator';

export class InitiateGroupDto {
  @IsString()
  activityId: string;

  @IsString()
  @IsOptional()
  addressName?: string;

  @IsString()
  @IsOptional()
  addressPhone?: string;

  @IsString()
  @IsOptional()
  addressDetail?: string;
}

export class JoinGroupDto {
  @IsString()
  groupId: string;

  @IsString()
  @IsOptional()
  addressName?: string;

  @IsString()
  @IsOptional()
  addressPhone?: string;

  @IsString()
  @IsOptional()
  addressDetail?: string;
}
