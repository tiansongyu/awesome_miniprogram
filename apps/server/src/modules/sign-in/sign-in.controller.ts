import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { SignInService } from './sign-in.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('sign-in')
@UseGuards(JwtAuthGuard)
export class SignInController {
  constructor(private signInService: SignInService) {}

  @Post()
  async signIn(@CurrentUser('id') userId: string) {
    return this.signInService.signIn(userId);
  }

  @Get('status')
  async getStatus(@CurrentUser('id') userId: string) {
    return this.signInService.getStatus(userId);
  }

  @Get('history')
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.signInService.getHistory(
      userId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }
}
