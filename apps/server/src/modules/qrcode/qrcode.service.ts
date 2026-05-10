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
