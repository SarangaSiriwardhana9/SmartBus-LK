import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserDocument } from '../schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: UserDocument) {
    return this.authService.logout(user._id.toString());
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: UserDocument) {
    return this.authService.getProfile(user._id.toString());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: UserDocument) {
    return {
      user,
      message: 'User retrieved successfully',
    };
  }
}
