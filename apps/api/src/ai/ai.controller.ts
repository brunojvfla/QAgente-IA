import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedRequest } from "../common/auth.guard";
import { AiService } from "./ai.service";
import { RunQaToolDto } from "./dto/run-qa-tool.dto";
import { QaToolsService } from "./qa-tools.service";

@ApiTags("ai")
@ApiCookieAuth("qagent_session")
@Controller("ai")
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly tools: QaToolsService,
  ) {}

  @Get("models")
  @ApiOperation({ summary: "Listar modelos habilitados e disponíveis no OpenRouter" })
  listModels() {
    return this.ai.getModelConfiguration();
  }

  @Post("tools")
  @ApiOperation({ summary: "Executar ferramenta de QA com a QIA" })
  runTool(
    @Req() request: AuthenticatedRequest,
    @Body() body: RunQaToolDto,
  ) {
    return this.tools.execute(request.user.id, body.tool, body.input);
  }

  @Get("tools")
  @ApiOperation({ summary: "Consultar execuções recentes de ferramentas de QA" })
  history(@Req() request: AuthenticatedRequest) {
    return this.tools.history(request.user.id);
  }
}
