# Task 8: 代理体系模块

**Files:**
- Create: `apps/server/src/modules/agent/agent.module.ts`
- Create: `apps/server/src/modules/agent/agent.controller.ts`
- Create: `apps/server/src/modules/agent/agent.service.ts`
- Create: `apps/server/src/modules/agent/dto/create-agent.dto.ts`
- Test: `apps/server/src/modules/agent/agent.service.spec.ts`

---

- [ ] **Step 1: 创建 DTO**

`apps/server/src/modules/agent/dto/create-agent.dto.ts`:
```typescript
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
  role: Role.AGENT_L1 | Role.AGENT_L2 | Role.AGENT_L3;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  frozen?: boolean;
}
```

- [ ] **Step 2: 创建 AgentService**

`apps/server/src/modules/agent/agent.service.ts`:
```typescript
import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { CreateAgentDto, UpdateAgentDto } from './dto/create-agent.dto';
import * as bcrypt from 'bcrypt';
import { generateBindCode } from '@agent-saler/utils';

const ROLE_HIERARCHY: Record<string, Role> = {
  SUPER_ADMIN: Role.AGENT_L1,
  AGENT_L1: Role.AGENT_L2,
  AGENT_L2: Role.AGENT_L3,
};

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  async createSubAgent(currentUser: User, dto: CreateAgentDto) {
    const allowedChildRole = ROLE_HIERARCHY[currentUser.role];
    if (!allowedChildRole || dto.role !== allowedChildRole) {
      throw new ForbiddenException('无权创建该级别代理');
    }

    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new BadRequestException('该手机号已注册');
    }

    const hashedPassword = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : await bcrypt.hash('123456', 10);

    return this.prisma.user.create({
      data: {
        phone: dto.phone,
        nickname: dto.nickname,
        password: hashedPassword,
        role: dto.role,
        parentAgentId: currentUser.id,
        bindCode: generateBindCode(),
      },
      select: {
        id: true,
        phone: true,
        nickname: true,
        role: true,
        bindCode: true,
        createdAt: true,
      },
    });
  }

  async getSubAgents(currentUser: User, page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          parentAgentId: currentUser.id,
          role: { not: Role.CUSTOMER },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nickname: true,
          phone: true,
          role: true,
          frozen: true,
          balance: true,
          bindCode: true,
          createdAt: true,
          _count: { select: { children: true } },
        },
      }),
      this.prisma.user.count({
        where: {
          parentAgentId: currentUser.id,
          role: { not: Role.CUSTOMER },
        },
      }),
    ]);
    return { items, total, page, pageSize };
  }

  async getAgentTree(currentUser: User) {
    const agents = await this.prisma.user.findMany({
      where: { parentAgentId: currentUser.id },
      select: {
        id: true,
        nickname: true,
        role: true,
        frozen: true,
        children: {
          select: {
            id: true,
            nickname: true,
            role: true,
            frozen: true,
            children: {
              select: {
                id: true,
                nickname: true,
                role: true,
                frozen: true,
              },
            },
          },
        },
      },
    });
    return agents;
  }

  async updateAgent(currentUser: User, agentId: string, dto: UpdateAgentDto) {
    const agent = await this.prisma.user.findUnique({
      where: { id: agentId },
    });
    if (!agent) throw new NotFoundException('代理不存在');
    if (agent.parentAgentId !== currentUser.id) {
      throw new ForbiddenException('只能管理自己的下级');
    }

    return this.prisma.user.update({
      where: { id: agentId },
      data: dto,
      select: {
        id: true,
        nickname: true,
        role: true,
        frozen: true,
      },
    });
  }

  async freezeAgent(currentUser: User, agentId: string) {
    return this.updateAgent(currentUser, agentId, { frozen: true });
  }

  async unfreezeAgent(currentUser: User, agentId: string) {
    return this.updateAgent(currentUser, agentId, { frozen: false });
  }

  async getAgentStats(agentId: string) {
    const [customerCount, subAgentCount, totalProfit] = await Promise.all([
      this.prisma.user.count({
        where: { parentAgentId: agentId, role: Role.CUSTOMER },
      }),
      this.prisma.user.count({
        where: { parentAgentId: agentId, role: { not: Role.CUSTOMER } },
      }),
      this.prisma.settlement.aggregate({
        where: { agentId },
        _sum: { profit: true },
      }),
    ]);

    return {
      customerCount,
      subAgentCount,
      totalProfit: totalProfit._sum.profit || 0,
    };
  }
}
```

- [ ] **Step 3: 创建 AgentController**

`apps/server/src/modules/agent/agent.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/create-agent.dto';
import { Role, User } from '@prisma/client';

@Controller('api/v1/agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  create(@CurrentUser() user: User, @Body() dto: CreateAgentDto) {
    return this.agentService.createSubAgent(user, dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  list(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.agentService.getSubAgents(user, page, pageSize);
  }

  @Get('tree')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  tree(@CurrentUser() user: User) {
    return this.agentService.getAgentTree(user);
  }

  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2, Role.AGENT_L3)
  stats(@CurrentUser() user: User) {
    return this.agentService.getAgentStats(user.id);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agentService.updateAgent(user, id, dto);
  }

  @Put(':id/freeze')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  freeze(@CurrentUser() user: User, @Param('id') id: string) {
    return this.agentService.freezeAgent(user, id);
  }

  @Put(':id/unfreeze')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  unfreeze(@CurrentUser() user: User, @Param('id') id: string) {
    return this.agentService.unfreezeAgent(user, id);
  }
}
```

- [ ] **Step 4: 创建 AgentModule**

`apps/server/src/modules/agent/agent.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
```

- [ ] **Step 5: 注册到 AppModule**

在 `apps/server/src/app.module.ts` 的 imports 中添加 `AgentModule`。

- [ ] **Step 6: 编写测试**

`apps/server/src/modules/agent/agent.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('AgentService', () => {
  let service: AgentService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    settlement: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createSubAgent', () => {
    it('should throw ForbiddenException if role hierarchy is violated', async () => {
      const currentUser = { id: '1', role: Role.AGENT_L3 } as any;
      const dto = { phone: '13800000001', nickname: 'test', role: Role.AGENT_L3 as any };

      await expect(service.createSubAgent(currentUser, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if phone already exists', async () => {
      const currentUser = { id: '1', role: Role.SUPER_ADMIN } as any;
      const dto = { phone: '13800000001', nickname: 'test', role: Role.AGENT_L1 as any };
      mockPrisma.user.findUnique.mockResolvedValue({ id: '2' });

      await expect(service.createSubAgent(currentUser, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create sub agent successfully', async () => {
      const currentUser = { id: '1', role: Role.SUPER_ADMIN } as any;
      const dto = { phone: '13800000001', nickname: 'test', role: Role.AGENT_L1 as any };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: '2',
        phone: dto.phone,
        nickname: dto.nickname,
        role: dto.role,
        bindCode: 'ABC123',
        createdAt: new Date(),
      });

      const result = await service.createSubAgent(currentUser, dto);
      expect(result.phone).toBe(dto.phone);
      expect(result.role).toBe(Role.AGENT_L1);
    });
  });
});
```

- [ ] **Step 7: 运行测试并验证**

```bash
cd apps/server
pnpm test -- --testPathPattern=agent.service.spec
```

Expected: 3 tests pass。

- [ ] **Step 8: 提交**

```bash
git add .
git commit -m "feat: add agent module with hierarchy management"
```
