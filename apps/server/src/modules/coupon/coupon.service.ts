import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { CouponStatus, UserCouponStatus } from '@prisma/client';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        name: dto.name,
        type: dto.type,
        value: dto.value,
        minAmount: dto.minAmount ?? 0,
        totalCount: dto.totalCount,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
    });
  }

  async findAll(params?: { page?: number; pageSize?: number; status?: CouponStatus }) {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const where: any = {};

    if (params?.status) {
      where.status = params.status;
    }

    const [list, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...dto,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
    });
  }

  async claim(couponId: string, userId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('优惠券已失效');
    }

    const now = new Date();
    if (now < coupon.startTime || now > coupon.endTime) {
      throw new BadRequestException('优惠券不在有效期内');
    }

    if (coupon.usedCount >= coupon.totalCount) {
      throw new BadRequestException('优惠券已领完');
    }

    // 检查用户是否已领取过
    const existing = await this.prisma.userCoupon.findFirst({
      where: { userId, couponId },
    });
    if (existing) {
      throw new BadRequestException('您已领取过该优惠券');
    }

    // 领取优惠券（事务）
    const [userCoupon] = await this.prisma.$transaction([
      this.prisma.userCoupon.create({
        data: { userId, couponId },
      }),
      this.prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    return userCoupon;
  }

  async findMyCoupons(userId: string, status?: UserCouponStatus) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.userCoupon.findMany({
      where,
      include: { coupon: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
