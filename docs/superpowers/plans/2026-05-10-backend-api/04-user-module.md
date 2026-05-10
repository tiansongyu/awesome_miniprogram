# Task 7: 用户模块

**Files:**
- Create: `apps/server/src/modules/user/user.module.ts`
- Create: `apps/server/src/modules/user/user.controller.ts`
- Create: `apps/server/src/modules/user/user.service.ts`
- Create: `apps/server/src/modules/user/dto/update-user.dto.ts`
- Create: `apps/server/src/modules/membership/membership.module.ts`
- Create: `apps/server/src/modules/membership/membership.service.ts`
- Test: `apps/server/src/modules/user/user.service.spec.ts`

---

- [ ] **Step 1: 创建 DTO**

`apps/server/src/modules/user/dto/update-user.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
```

- [ ] **Step 2: 创建 MembershipService**

`apps/server/src/modules/membership/membership.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { MemberLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

const SILVER_THRESHOLD = new Decimal(1000);
const GOLD_THRESHOLD = new Decimal(5000);

@Injectable()
export class MembershipService {
  constructor(private prisma: PrismaService) {}

  async checkAndUpgrade(userId: string): Promise<MemberLevel> {
    const result = await this.prisma.order.aggregate({
      where: { userId, status: 'COMPLETED' },
      _sum: { totalAmount: true },
    });

    const total = result._sum.totalAmount || new Decimal(0);
    let newLevel: MemberLevel = MemberLevel.BRONZE;

    if (total.gte(GOLD_THRESHOLD)) {
      newLevel = MemberLevel.GOLD;
    } else if (total.gte(SILVER_THRESHOLD)) {
      newLevel = MemberLevel.SILVER;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { memberLevel: newLevel },
    });

    return newLevel;
  }

  async manualSetLevel(userId: string, level: MemberLevel) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { memberLevel: level },
    });
  }
}
```

`apps/server/src/modules/membership/membership.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { MembershipService } from './membership.service';

@Module({
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
```

- [ ] **Step 3: 创建 UserService**

`apps/server/src/modules/user/user.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        phone: true,
        role: true,
        memberLevel: true,
        balance: true,
        bindCode: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        nickname: true,
        avatar: true,
        phone: true,
        role: true,
        memberLevel: true,
      },
    });
  }

  async listCustomers(agentId: string, page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { parentAgentId: agentId, role: Role.CUSTOMER },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nickname: true,
          avatar: true,
          memberLevel: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({
        where: { parentAgentId: agentId, role: Role.CUSTOMER },
      }),
    ]);
    return { items, total, page, pageSize };
  }
}
```

- [ ] **Step 4: 创建 UserController**

`apps/server/src/modules/user/user.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.userService.getProfile(user.id);
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Get('customers')
  listCustomers(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.userService.listCustomers(user.id, page, pageSize);
  }
}
```

- [ ] **Step 5: 创建 UserModule**

`apps/server/src/modules/user/user.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [MembershipModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

- [ ] **Step 6: 注册到 AppModule**

在 `apps/server/src/app.module.ts` 的 imports 中添加 `UserModule`。

- [ ] **Step 7: 编写测试**

`apps/server/src/modules/user/user.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(UserService);
    prisma = module.get(PrismaService);
  });

  it('should return user profile', async () => {
    const mockUser = {
      id: 'user-1',
      nickname: 'Test',
      avatar: null,
      phone: '13800000000',
      role: 'CUSTOMER',
      memberLevel: 'BRONZE',
      balance: 0,
      bindCode: null,
      createdAt: new Date(),
    };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const result = await service.getProfile('user-1');
    expect(result).toEqual(mockUser);
  });

  it('should throw NotFoundException for non-existent user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.getProfile('non-existent')).rejects.toThrow('用户不存在');
  });
});
```

- [ ] **Step 8: 运行测试并提交**

```bash
cd apps/server
pnpm test -- --testPathPattern=user.service.spec
git add .
git commit -m "feat: add user module with profile and membership"
```
