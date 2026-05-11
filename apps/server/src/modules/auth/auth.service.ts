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
import { AdminLoginDto, LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { Role, MemberLevel } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('该手机号已注册');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    let parentAgentId: string | undefined;
    if (dto.bindCode) {
      const agent = await this.prisma.user.findUnique({
        where: { bindCode: dto.bindCode },
      });
      if (agent) {
        parentAgentId = agent.id;
      }
    }

    const bindCode = this.generateBindCode();

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashedPassword,
        nickname: dto.nickname || undefined,
        role: Role.CUSTOMER,
        memberLevel: MemberLevel.BRONZE,
        parentAgentId,
        bindCode,
      },
    });

    return this.generateTokens(user.id, user.role);
  }

  private generateBindCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

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
    return this.generateTokens(user.id, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('账号或密码错误');
    }
    if (user.frozen) {
      throw new UnauthorizedException('账号已被冻结');
    }
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('账号或密码错误');
    }
    return this.generateTokens(user.id, user.role);
  }

  async wechatLogin(dto: WechatLoginDto) {
    const { openId } = await this.getWechatOpenId(dto.code);

    let user = await this.prisma.user.findUnique({
      where: { openId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openId,
          role: Role.CUSTOMER,
          parentAgentId: dto.bindCode
            ? (await this.prisma.user.findUnique({ where: { bindCode: dto.bindCode } }))?.id
            : undefined,
        },
      });
    }

    return this.generateTokens(user.id, user.role);
  }

  async refreshToken(refreshToken: string) {
    const userId = await this.redis.get(`refresh:${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('Refresh token 已过期');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.frozen) {
      throw new UnauthorizedException();
    }
    await this.redis.del(`refresh:${refreshToken}`);
    return this.generateTokens(user.id, user.role);
  }

  async logout(refreshToken: string) {
    await this.redis.del(`refresh:${refreshToken}`);
  }

  private async generateTokens(userId: string, role: Role) {
    const payload = { sub: userId, role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = require('crypto').randomUUID();
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';
    const seconds = this.parseExpiry(refreshExpiresIn);
    await this.redis.set(`refresh:${refreshToken}`, userId, 'EX', seconds);
    return { accessToken, refreshToken };
  }

  private parseExpiry(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 604800;
    const num = parseInt(match[1]);
    switch (match[2]) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 3600;
      case 'd': return num * 86400;
      default: return 604800;
    }
  }

  private async getWechatOpenId(code: string): Promise<{ openId: string }> {
    const appId = this.configService.get<string>('wechat.appId');
    const appSecret = this.configService.get<string>('wechat.appSecret');
    // In production, call WeChat API. For dev, use code as openId.
    if (!appId || !appSecret) {
      return { openId: `dev_${code}` };
    }
    // TODO: implement real WeChat API call
    return { openId: `dev_${code}` };
  }
}
