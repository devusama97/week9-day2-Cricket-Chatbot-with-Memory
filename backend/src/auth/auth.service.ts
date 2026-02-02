
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOne(email);
        if (user && await bcrypt.compare(pass, user.passwordHash)) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { passwordHash, ...result } = user.toObject();
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user._id };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user._id,
                email: user.email,
                username: user.username
            }
        };
    }

    async signup(email: string, username: string, pass: string) {
        const passwordHash = await bcrypt.hash(pass, 10);
        const user = await this.usersService.create(email, username, passwordHash);
        return this.login(user);
    }
}
