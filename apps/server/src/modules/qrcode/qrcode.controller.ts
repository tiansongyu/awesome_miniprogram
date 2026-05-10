import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QrcodeService } from './qrcode.service';
import { Role, User } from '@prisma/client';

@Controller('qrcode')
@UseGuards(JwtAuthGuard)
export class QrcodeController {
  constructor(private qrcodeService: QrcodeService) {}

  @Get('my-code')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2, Role.AGENT_L3)
  getMyBindCode(@CurrentUser() user: User) {
    return this.qrcodeService.getAgentBindCode(user.id);
  }

  @Post('bind/:bindCode')
  bind(@CurrentUser() user: User, @Param('bindCode') bindCode: string) {
    return this.qrcodeService.bindCustomerToAgent(user.id, bindCode);
  }

  @Post('regenerate')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2, Role.AGENT_L3)
  regenerate(@CurrentUser() user: User) {
    return this.qrcodeService.regenerateBindCode(user.id);
  }
}
