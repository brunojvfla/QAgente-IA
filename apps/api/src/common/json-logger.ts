import { ConsoleLogger, Injectable } from "@nestjs/common";

@Injectable()
export class JsonLogger extends ConsoleLogger {
  protected override printMessages(
    messages: unknown[],
    context = "",
    logLevel: string = "log",
    writeStreamType?: "stdout" | "stderr",
  ) {
    const payload = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      context: context || "QAgent",
      message: messages.map(String).join(" "),
    };
    const output = JSON.stringify(payload);
    if (writeStreamType === "stderr") process.stderr.write(`${output}\n`);
    else process.stdout.write(`${output}\n`);
  }
}
