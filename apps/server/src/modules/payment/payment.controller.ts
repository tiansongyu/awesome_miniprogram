import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentService } from './payment.service';
import { User } from '@prisma/client';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('pay/:orderId')
  mockPay(@CurrentUser() user: User, @Param('orderId') orderId: string) {
    return this.paymentService.mockPay(orderId, user.id);
  }
}
