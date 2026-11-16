import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  findForUser(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true, type: true, createdAt: true },
    });
  }
}
