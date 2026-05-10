# Task 5: 认证模块 - JWT + Redis

**Files:**
- Create: `apps/server/src/modules/auth/auth.module.ts`
- Create: `apps/server/src/modules/auth/auth.controller.ts`
- Create: `apps/server/src/modules/auth/auth.service.ts`
- Create: `apps/server/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `apps/server/src/modules/auth/dto/login.dto.ts`
- Create: `apps/server/src/modules/auth/dto/wechat-login.dto.ts`
- Create: `apps/server/src/modules/auth/guards/jwt-auth.guard.ts`
- Create: `apps/server/src/common/decorators/current-user.decorator.ts`
- Create: `apps/server/src/common/decorators/roles.decorator.ts`
- Create: `apps/server/src/common/guards/roles.guard.ts`
- Create: `apps/server/src/modules/redis/redis.module.ts`
- Create: `apps/server/src/modules/redis/redis.service.ts`
- Test: `apps/server/src/modules/auth/auth.service.spec.ts`

---

- [ ] **Step 1: 创建 Redis 模块**

`apps/server/src/modules/redis/redis.service.ts`:
```typescript
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    super(configService.get<string>('redis.url'));
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
```

`apps/server/src/modules/redis/redis.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

- [ ] **Step 2: 创建 DTO**

`apps/server/src/modules/auth/dto/login.dto.ts`:
```typescript
import { IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

`apps/server/src/modules/auth/dto/wechat-login.dto.ts`:
```typescript
import { IsString, IsOptional } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  bindCode?: string;
}
```

- [ ] **Step 3: 创建自定义装饰器**

`apps/server/src/common/decorators/current-user.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

`apps/server/src/common/decorators/roles.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 4: 创建角色守卫**

`apps/server/src/common/guards/roles.guard.ts`:
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

- [ ] **Step 5: 创建 JWT 策略**

`apps/server/src/modules/auth/strategies/jwt.strategy.ts`:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.frozen) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

`apps/server/src/modules/auth/guards/jwt-auth.guard.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 6: 创建 AuthService**

`apps/server/src/modules/auth/auth.service.ts`:
```typescript
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AdminLoginDto } from './dto/login.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {}

  async adminLogin(dto: AdminLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('账号或密码错误');
    }
    if (user.role === Role.CUSTOMER) {
      throw new UnauthorizedException('无管理权限');
    }
    return this.generateTokens(user.id);
  }

  async wechatLogin(dto: WechatLoginDto) {
    const openId = await this.getWechatOpenId(dto.code);

    let user = await this.prisma.user.findUnique({
      where: { openId },
    });

    if (!user) {
      const createData: any = {
        openId,
        role: Role.CUSTOMER,
      };

      if (dto.bindCode) {
        const agent = await this.prisma.user.findUnique({
          where: { bindCode: dto.bindCode },
        });
        if (agent) {
          createData.parentAgentId = agent.id;
        }
      }

      user = await this.prisma.user.create({ data: createData });
    }

    return this.generateTokens(user.id);
  }

  async refreshToken(refreshToken: string) {
    const userId = await this.redis.get(`refresh:${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('Refresh token 已过期');
    }
    await this.redis.del(`refresh:${refreshToken}`);
    return this.generateTokens(userId);
  }

  async logout(refreshToken: string) {
    await this.redis.del(`refresh:${refreshToken}`);
  }

  private async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign({ sub: userId });

    const refreshToken = crypto.randomUUID();
    const refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
    );
    const ttlSeconds = this.parseDuration(refreshExpiresIn);
    await this.redis.set(`refresh:${refreshToken}`, userId, 'EX', ttlSeconds);

    return { accessToken, refreshToken };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 604800; // 7d default
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[unit];
  }

  private async getWechatOpenId(code: string): Promise<string> {
    const appId = this.configService.get<string>('wechat.appId');
    const appSecret = this.configService.get<string>('wechat.appSecret');

    if (!appId || !appSecret) {
      // 开发模式：用 code 作为 mock openId
      return `mock_${code}`;
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errcode) {
      throw new UnauthorizedException('微信登录失败');
    }
    return data.openid;
  }
}
```

- [ ] **Step 7: 创建 AuthController**

`apps/server/src/modules/auth/auth.controller.ts`:
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/login.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('admin/login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Post('wechat/login')
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatLogin(dto);
  }

  @Post('refresh')
  refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }
}
```

- [ ] **Step 8: 创建 AuthModule**

`apps/server/src/modules/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 9: 注册到 AppModule**

修改 `apps/server/src/app.module.ts` imports 添加：
```typescript
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';

// imports 数组中添加:
RedisModule,
AuthModule,
```

- [ ] **Step 10: 编写测试**

`apps/server/src/modules/auth/auth.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn(), create: jest.fn() } },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('7d') },
        },
        {
          provide: RedisService,
          useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);
  });

  describe('adminLogin', () => {
    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.adminLogin({ phone: '123', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if password is wrong', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        phone: '123',
        password: hashed,
        role: Role.SUPER_ADMIN,
      });
      await expect(
        service.adminLogin({ phone: '123', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on success', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        phone: '123',
        password: hashed,
        role: Role.SUPER_ADMIN,
      });
      const result = await service.adminLogin({
        phone: '123',
        password: 'correct',
      });
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBeDefined();
    });
  });
});
```

- [ ] **Step 11: 运行测试**

```bash
cd apps/server
pnpm test -- --testPathPattern=auth.service.spec
```

Expected: 3 tests pass.

- [ ] **Step 12: 提交**

```bash
git add .
git commit -m "feat: add auth module with JWT, Redis refresh token, wechat login"
```
