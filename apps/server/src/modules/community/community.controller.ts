import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('posts')
  async listPosts(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.communityService.listPosts(+page, +pageSize);
  }

  @Get('posts/:id')
  async getPost(@Param('id') id: string) {
    const result = await this.communityService.getPost(id);
    if (!result) throw new NotFoundException('不存在');
    return result;
  }
}
