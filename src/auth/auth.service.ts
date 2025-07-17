/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserDocument,
  UserStatus,
  UserRole,
} from '../schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, role, profile } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new this.userModel({
      email,
      password: hashedPassword,
      role,
      profile,
      status:
        role === UserRole.PASSENGER ? UserStatus.ACTIVE : UserStatus.PENDING, // Auto-approve passengers
    });

    await user.save();

    // Convert to plain object and remove password
    const userObj = user.toObject();
    const { password: _, ...userResponse } = userObj;

    return {
      message: 'User registered successfully',
      user: userResponse,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with password
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Account is not active. Please contact admin.',
      );
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update refresh token in database
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userModel.findByIdAndUpdate(user._id, {
      refreshToken: hashedRefreshToken,
    });

    // Convert to plain object and remove password
    const userObj = user.toObject();
    const { password: _, refreshToken: __, ...userResponse } = userObj;

    return {
      message: 'Login successful',
      user: userResponse,
      ...tokens,
    };
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: null,
    });

    return { message: 'Logout successful' };
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -refreshToken');
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  private async generateTokens(user: UserDocument) {
    const payload = {
      email: user.email,
      sub: (user._id as string | { toString(): string }).toString(),
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
