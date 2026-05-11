import { IsEnum } from 'class-validator';
import { MemberLevel } from '@prisma/client';

export class UpdateMemberLevelDto {
  @IsEnum(MemberLevel)
  memberLevel: MemberLevel;
}
