import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthResponse, DEMO_USERS, JwtPayload, UpdateProfileInput, UserDto, UserRole } from '@officeping/shared';
import { OAuth2Client } from 'google-auth-library';
import { Repository } from 'typeorm';
import { toUserDto } from '../../common/mappers';
import { User } from '../../entities';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  async googleLogin(idToken: string): Promise<AuthResponse> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }
    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Google token missing email');
    }
    const email = payload.email.toLowerCase();

    let user = await this.users.findOneBy({ googleId: payload.sub });
    if (!user) {
      user = await this.users.findOneBy({ email });
      if (user) {
        user.googleId = payload.sub;
        if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
        if (!user.name && payload.name) user.name = payload.name;
        user = await this.users.save(user);
      } else {
        // Any Google account can register; admins promote to STAFF/ADMIN via Manage panel
        user = await this.users.save(
          this.users.create({
            email,
            name: payload.name ?? email.split('@')[0],
            googleId: payload.sub,
            avatarUrl: payload.picture ?? null,
            role: this.isAdminEmail(email) ? UserRole.ADMIN : UserRole.MEMBER,
          }),
        );
      }
    }
    return this.issueToken(user);
  }

  async demoLogin(email: string): Promise<AuthResponse> {
    if (this.config.get('DEMO_MODE') !== 'true') {
      throw new NotFoundException();
    }
    const demo = DEMO_USERS.find((d) => d.email === email.toLowerCase());
    if (!demo) throw new ForbiddenException('Unknown demo user');
    let user = await this.users.findOneBy({ email: demo.email });
    if (!user) {
      user = await this.users.save(
        this.users.create({ email: demo.email, name: demo.name, role: demo.role as UserRole }),
      );
    }
    return this.issueToken(user);
  }

  private isAdminEmail(email: string): boolean {
    const admins = this.config.get<string>('ADMIN_EMAILS') ?? '';
    return admins.split(',').map((e) => e.trim().toLowerCase()).includes(email);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDto> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException();
    if (input.name?.trim()) user.name = input.name.trim();
    if (input.deskLocation !== undefined) user.deskLocation = input.deskLocation.trim() || null;
    if (input.defaultBreakfast !== undefined) user.defaultBreakfast = input.defaultBreakfast?.trim() || null;
    await this.users.save(user);
    return toUserDto(user);
  }

  private issueToken(user: User): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwt.sign(payload), user: toUserDto(user) };
  }
}
