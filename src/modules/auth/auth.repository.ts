import { prisma } from '../../config/database';

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
  },

  createUser(data: {
    username: string;
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    roleName?: string;
  }) {
    const createData: any = {
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
    };

    if (data.roleName) {
      createData.roles = {
        create: {
          role: { connect: { name: data.roleName } },
        },
      };
    }

    return prisma.user.create({
      data: createData,
      include: { roles: { include: { role: true } } },
    });
  },

  updateLastLogin(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { lastLogin: new Date() } });
  },

  updateProfile(userId: string, updates: Partial<{ firstName: string; lastName: string }>) {
    return prisma.user.update({ where: { id: userId }, data: updates, include: { roles: { include: { role: true } } } });
  },

  changePassword(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },
};