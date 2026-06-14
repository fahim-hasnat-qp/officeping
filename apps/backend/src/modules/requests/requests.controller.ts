import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { RequestDto, RequestNoteDto } from '@officeping/shared';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

function originFromReq(req: ExpressRequest): string {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? 'localhost';
  return `${proto}://${host}`;
}
import {
  CreateNoteDto,
  CreateRequestDto,
  ReasonDto,
  RequestsQueryDto,
  UpdateQuickSendLabelDto,
  UpdateRequestStatusDto,
} from './dto';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateRequestDto,
    @Req() req: ExpressRequest,
  ): Promise<RequestDto> {
    return this.service.create(user, body, originFromReq(req));
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: RequestsQueryDto,
  ): Promise<RequestDto[]> {
    return this.service.findAll(user, query);
  }

  @Get('quick-send')
  getQuickSend(@CurrentUser() user: AuthUser): Promise<RequestDto[]> {
    return this.service.getQuickSend(user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RequestDto> {
    return this.service.findOne(id, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateRequestStatusDto,
    @Req() req: ExpressRequest,
  ): Promise<RequestDto> {
    return this.service.updateStatus(id, user, body, originFromReq(req));
  }

  @Patch(':id/delay')
  addDelay(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: ReasonDto,
  ): Promise<RequestDto> {
    return this.service.addDelay(id, user, body);
  }

  @Patch(':id/cancel')
  addCancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: ReasonDto,
  ): Promise<RequestDto> {
    return this.service.addCancel(id, user, body);
  }

  @Patch(':id/save')
  toggleSave(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RequestDto> {
    return this.service.toggleSave(id, user);
  }

  @Patch(':id/quick-send-label')
  updateQuickSendLabel(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateQuickSendLabelDto,
  ): Promise<RequestDto> {
    return this.service.updateQuickSendLabel(id, user, body.label);
  }

  @Post(':id/notes')
  @HttpCode(201)
  async addNote(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateNoteDto,
    @Req() req: ExpressRequest,
  ): Promise<RequestNoteDto> {
    const { note } = await this.service.addNote(id, user, body, originFromReq(req));
    return note;
  }
}
