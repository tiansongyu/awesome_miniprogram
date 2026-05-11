import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SignInService {
  constructor(private prisma: PrismaService) {}

  /** 用户签到 */
  async signIn(userId: string) {
    const today = this.getToday();

    // 检查今日是否已签到
    const existing = await this.prisma.signIn.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (existing) {
      throw new BadRequestException('今日已签到');
    }

    // 计算连续签到天数来决定积分
    const consecutiveDays = await this.getConsecutiveDays(userId);
    const points = this.calculatePoints(consecutiveDays + 1);

    // 创建签到记录并更新积分
    const [signInRecord] = await this.prisma.$transaction([
      this.prisma.signIn.create({
        data: { userId, date: today, points },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { points: { increment: points } },
      }),
      this.prisma.pointsLog.create({
        data: {
          userId,
          points,
          type: 'SIGN_IN',
          remark: `连续签到第${consecutiveDays + 1}天，获得${points}积分`,
        },
      }),
    ]);

    return {
      points,
      consecutiveDays: consecutiveDays + 1,
      signInRecord,
    };
  }

  /** 获取签到状态 */
  async getStatus(userId: string) {
    const today = this.getToday();

    const todayRecord = await this.prisma.signIn.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    const consecutiveDays = await this.getConsecutiveDays(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });

    return {
      signedToday: !!todayRecord,
      consecutiveDays,
      totalPoints: user?.points ?? 0,
    };
  }

  /** 获取签到历史 */
  async getHistory(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [records, total] = await Promise.all([
      this.prisma.signIn.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.signIn.count({ where: { userId } }),
    ]);

    return { records, total, page, pageSize };
  }

  /** 计算连续签到天数（不含今天） */
  private async getConsecutiveDays(userId: string): Promise<number> {
    const records = await this.prisma.signIn.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
      select: { date: true },
    });

    if (records.length === 0) return 0;

    let count = 0;
    const today = this.getToday();
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 1); // 从昨天开始检查

    for (const record of records) {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      const expectedDate = checkDate.toISOString().split('T')[0];

      if (recordDate === expectedDate) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return count;
  }

  /** 根据连续签到天数计算积分 */
  private calculatePoints(consecutiveDays: number): number {
    if (consecutiveDays >= 7) return 30;
    if (consecutiveDays >= 5) return 20;
    if (consecutiveDays >= 3) return 15;
    return 10;
  }

  /** 获取今天的日期（零时） */
  private getToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}
