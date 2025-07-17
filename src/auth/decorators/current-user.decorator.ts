import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserDocument } from '../../schemas/user.schema';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserDocument => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as UserDocument;
  },
);
