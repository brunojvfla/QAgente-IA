import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedRequest } from "../common/auth.guard";
import { SubmitLearningAttemptDto } from "./dto/submit-learning-attempt.dto";
import { LearnService } from "./learn.service";

@ApiTags("learn")
@ApiCookieAuth("qagent_session")
@Controller("learn")
export class LearnController {
  constructor(private readonly learn: LearnService) {}

  @Get("tracks")
  @ApiOperation({ summary: "Listar trilhas e progresso do estudante autenticado" })
  tracks(@Req() request: AuthenticatedRequest) {
    return this.learn.tracks(request.user.id);
  }

  @Get("tracks/:trackId")
  @ApiOperation({ summary: "Consultar uma trilha de aprendizado" })
  track(@Req() request: AuthenticatedRequest, @Param("trackId") trackId: string) {
    return this.learn.track(request.user.id, trackId);
  }

  @Get("lessons/:lessonId")
  @ApiOperation({ summary: "Consultar aula e tentativas recentes do estudante" })
  lesson(@Req() request: AuthenticatedRequest, @Param("lessonId") lessonId: string) {
    return this.learn.lesson(request.user.id, lessonId);
  }

  @Get("challenges")
  @ApiOperation({ summary: "Listar desafios e atividades de prática" })
  challenges(@Req() request: AuthenticatedRequest) {
    return this.learn.challenges(request.user.id);
  }

  @Get("progress")
  @ApiOperation({ summary: "Consultar progresso persistido do estudante" })
  progress(@Req() request: AuthenticatedRequest) {
    return this.learn.progress(request.user.id);
  }

  @Post("lessons/:lessonId/attempts")
  @ApiOperation({ summary: "Avaliar e persistir uma tentativa de exercício" })
  submitAttempt(
    @Req() request: AuthenticatedRequest,
    @Param("lessonId") lessonId: string,
    @Body() body: SubmitLearningAttemptDto,
  ) {
    return this.learn.submitAttempt(request.user.id, lessonId, body.answer);
  }
}
