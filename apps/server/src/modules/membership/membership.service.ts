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
