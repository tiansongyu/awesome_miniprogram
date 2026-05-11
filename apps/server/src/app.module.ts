import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AgentModule } from './modules/agent/agent.module';
import { OrderModule } from './modules/order/order.module';
import { ProductModule } from './modules/product/product.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { QrcodeModule } from './modules/qrcode/qrcode.module';
import { UploadModule } from './modules/upload/upload.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AddressModule } from './modules/address/address.module';
import { StatsModule } from './modules/stats/stats.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { SignInModule } from './modules/sign-in/sign-in.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { ReviewModule } from './modules/review/review.module';
import { MessageModule } from './modules/message/message.module';
import { RefundModule } from './modules/refund/refund.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    AgentModule,
    OrderModule,
    ProductModule,
    SettlementModule,
    QrcodeModule,
    UploadModule,
    PaymentModule,
    AddressModule,
    StatsModule,
    CouponModule,
    SignInModule,
    FavoriteModule,
    ReviewModule,
    MessageModule,
    RefundModule,
  ],
})
export class AppModule {}
