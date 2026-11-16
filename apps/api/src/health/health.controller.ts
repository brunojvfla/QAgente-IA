import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Verificar a disponibilidade da API e do PostgreSQL" })
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", database: "ok", timestamp: new Date().toISOString() };
  }
}
