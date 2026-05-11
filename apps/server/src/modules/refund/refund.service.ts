import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RefundStatus } from '@prisma/client';

@Injectable()
export class RefundService {
  constructor(private prisma: PrismaService) {}

  /** 用户申请退款（订单必须已支付或已发货） */
  async create(userId: string, data: { orderId: string; reason: string }) {
    const { orderId, reason } = data;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('无权操作此订单');
    }
    if (order.status !== 'PAID' && order.status !== 'SHIPPED') {
      throw new BadRequestException('只有已支付或已发货的订单才能申请退款');
    }

    // 检查是否已有进行中的退款申请
    const existing = await this.prisma.refund.findFirst({
      where: {
        orderId,
        status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
      },
    });
    if (existing) {
      throw new BadRequestException('该订单已有进行中的退款申请');
    }

    return this.prisma.refund.create({
      data: {
        orderId,
        userId,
        reason,
        amount: order.payAmount,
        status: RefundStatus.PENDING,
      },
    });
  }

  /** 用户查看自己的退款申请 */
  async findMyRefunds(userId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          order: {
            select: { id: true, orderNo: true, totalAmount: true, payAmount: true, status: true },
          },
        },
      }),
      this.prisma.refund.count({ where: { userId } }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 管理员查看所有退款申请 */
  async findAll(page = 1, pageSize = 10, status?: RefundStatus) {
    const skip = (page - 1) * pageSize;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          order: {
            select: { id: true, orderNo: true, totalAmount: true, payAmount: true, status: true },
          },
          user: {
            select: { id: true, nickname: true, phone: true },
          },
        },
      }),
      this.prisma.refund.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 管理员同意退款 */
  async approve(refundId: string, remark?: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }
    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('只能审核待处理的退款申请');
    }

    // 同意退款并更新订单状态为已取消
    const [updatedRefund] = await this.prisma.$transaction([
      this.prisma.refund.update({
        where: { id: refundId },
        data: { status: RefundStatus.COMPLETED, remark },
      }),
      this.prisma.order.update({
        where: { id: refund.orderId },
        data: { status: 'CANCELLED' },
      }),
    ]);

    return updatedRefund;
  }

  /** 管理员拒绝退款 */
  async reject(refundId: string, remark?: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }
    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('只能审核待处理的退款申请');
    }

    return this.prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.REJECTED, remark },
    });
  }
}
