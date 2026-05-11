import { MessageType } from '@prisma/client';

export class SendMessageDto {
  title: string;
  content: string;
  type?: MessageType;
  /** 指定用户ID，为空则发送给所有用户 */
  userIds?: string[];
}
