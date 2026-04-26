import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../utils/errors';

export const authService = {
  async register(input: { username: string; email: string; password: string; firstName?: string; lastName?: string }) {
    const existing = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { username: input.username }] } });
    if (existing) throw new ConflictError('Email or username already exists');
    if (!input.password || input.password.length < 8) throw new ValidationError('Password too short');

    const passwordHash = await bcrypt.hash(input.password, 10);

    // ensure default role exists
    const salesRole = await prisma.role.findUnique({ where: { name: 'SALES_STAFF' } });
    if (!salesRole) {
      await prisma.role.create({ data: { name: 'SALES_STAFF', description: 'Sales staff' } });
    }

    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        roles: {
          create: {
            role: {
              connect: { name: 'SALES_STAFF' },
            },
          },
        },
      },
      include: { roles: { include: { role: true } } },
    });

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email, roles: user.roles.map(r => r.role.name) }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRY,
    });

    return { user: { id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName }, token };
  },

  async login(input: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email: input.email }, include: { roles: { include: { role: true } } } });
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid email or password');
    if (!user.isActive) throw new UnauthorizedError('User account inactive');

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email, roles: user.roles.map(r => r.role.name) }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRY,
    });

    return { user: { id: user.id, username: user.username, email: user.email }, token };
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
    if (!user) throw new NotFoundError('User not found');
    return { id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, roles: user.roles.map(r => r.role.name) };
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Current password incorrect');
    if (newPassword.length < 8) throw new ValidationError('New password too short');
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  },
};