# Task 13: 二维码绑定 + 文件上传模块

**Files:**
- Create: `apps/server/src/modules/qrcode/qrcode.module.ts`
- Create: `apps/server/src/modules/qrcode/qrcode.controller.ts`
- Create: `apps/server/src/modules/qrcode/qrcode.service.ts`
- Create: `apps/server/src/modules/upload/upload.module.ts`
- Create: `apps/server/src/modules/upload/upload.controller.ts`
- Create: `apps/server/src/modules/upload/upload.service.ts`
- Create: `apps/server/src/modules/payment/payment.module.ts`
- Create: `apps/server/src/modules/payment/payment.service.ts`
- Create: `apps/server/src/modules/payment/payment.controller.ts`

---

- [ ] **Step 1: 创建 QrcodeService**

`apps/server/src/modules/qrcode/qrcode.service.ts`:
```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { generateBindCode } from '@agent-saler/utils';

@Injectable()
export class QrcodeService {
  constructor(private prisma: PrismaService) {}

  async getAgentBindCode(agentId: string) {
    const agent = await this.prisma.user.findUnique({
      where: { id: agentId },
      select: { bindCode: true, role: true },
    });
    if (!agent || agent.role === Role.CUSTOMER) {
      throw new BadRequestException('非代理用户');
    }
    if (!agent.bindCode) {
      const bindCode = generateBindCode();
      await this.prisma.user.update({
        where: { id: agentId },
        data: { bindCode },
      });
      return { bindCode };
    }
    return { bindCode: agent.bindCode };
  }

  async bindCustomerToAgent(userId: string, bindCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new BadRequestException('用户不存在');
    if (user.parentAgentId) {
      throw new BadRequestException('已绑定代理，不可更改');
    }

    const agent = await this.prisma.user.findUnique({
      where: { bindCode },
    });
    if (!agent) throw new BadRequestException('无效的绑定码');
    if (agent.role === Role.CUSTOMER) {
      throw new BadRequestException('绑定目标不是代理');
    }
    if (agent.frozen) {
      throw new BadRequestException('该代理已被冻结');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { parentAgentId: agent.id },
    });

    return { agentId: agent.id, agentNickname: agent.nickname };
  }

  async regenerateBindCode(agentId: string) {
    const bindCode = generateBindCode();
    await this.prisma.user.update({
      where: { id: agentId },
      data: { bindCode },
    });
    return { bindCode };
  }
}
```

- [ ] **Step 2: 创建 QrcodeController**

`apps/server/src/modules/qrcode/qrcode.controller.ts`:
```typescript
import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QrcodeService } from './qrcode.service';
import { Role, User } from '@prisma/client';

@Controller('api/v1/qrcode')
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
```

- [ ] **Step 3: 创建 QrcodeModule**

`apps/server/src/modules/qrcode/qrcode.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { QrcodeController } from './qrcode.controller';
import { QrcodeService } from './qrcode.service';

@Module({
  controllers: [QrcodeController],
  providers: [QrcodeService],
  exports: [QrcodeService],
})
export class QrcodeModule {}
```

- [ ] **Step 4: 创建 UploadService**

`apps/server/src/modules/upload/upload.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filepath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);
    return `/uploads/${filename}`;
  }

  async saveFiles(files: Express.Multer.File[]): Promise<string[]> {
    return Promise.all(files.map((file) => this.saveFile(file)));
  }
}
```

- [ ] **Step 5: 创建 UploadController**

`apps/server/src/modules/upload/upload.controller.ts`:
```typescript
import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@Controller('api/v1/upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadService.saveFile(file);
    return { url };
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 9, { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.uploadService.saveFiles(files);
    return { urls };
  }
}
```

- [ ] **Step 6: 创建 UploadModule**

`apps/server/src/modules/upload/upload.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
```

- [ ] **Step 7: 创建模拟支付模块**

`apps/server/src/modules/payment/payment.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { SettlementService } from '../settlement/settlement.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private settlementService: SettlementService,
  ) {}

  async mockPay(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.userId !== userId) {
      throw new Error('订单不存在');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new Error('订单状态不允许支付');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
    });

    // 触发分润结算
    await this.settlementService.settleOrder(orderId);

    return { success: true, orderNo: order.orderNo };
  }
}
```

`apps/server/src/modules/payment/payment.controller.ts`:
```typescript
import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentService } from './payment.service';
import { User } from '@prisma/client';

@Controller('api/v1/payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('pay/:orderId')
  pay(@CurrentUser() user: User, @Param('orderId') orderId: string) {
    return this.paymentService.mockPay(orderId, user.id);
  }
}
```

`apps/server/src/modules/payment/payment.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SettlementModule } from '../settlement/settlement.module';

@Module({
  imports: [SettlementModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
```

- [ ] **Step 8: 注册所有新模块到 AppModule**

在 `apps/server/src/app.module.ts` 中添加：
```typescript
import { QrcodeModule } from './modules/qrcode/qrcode.module';
import { UploadModule } from './modules/upload/upload.module';
import { PaymentModule } from './modules/payment/payment.module';

// imports 数组中添加:
QrcodeModule,
UploadModule,
PaymentModule,
```

- [ ] **Step 9: 提交**

```bash
git add .
git commit -m "feat: add qrcode binding, file upload, and mock payment modules"
```
