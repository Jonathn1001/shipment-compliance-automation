import { LoggerService } from '@nestjs/common';
import { createLogger, format, Logger, transports } from 'winston';

/**
 * Winston-backed Nest logger. Console (human-readable, colorized) plus a JSON
 * file transport for a structured trail. Callers pass messages and IDs only —
 * raw ingested document payloads and other sensitive data are never logged.
 */
export class MyLogger implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL ?? 'info',
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.printf(({ level, message, context, timestamp }) => {
              const ctx = typeof context === 'string' ? ` [${context}]` : '';
              const ts = typeof timestamp === 'string' ? timestamp : '';
              return `[Nest] ${ts} ${level}${ctx} ${String(message)}`;
            }),
          ),
        }),
        new transports.File({
          dirname: 'logs',
          filename: 'app.log',
          format: format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.json(),
          ),
        }),
      ],
    });
  }

  log(message: unknown, context?: string): void {
    this.logger.info(String(message), { context });
  }

  error(message: unknown, stackOrContext?: string, context?: string): void {
    this.logger.error(String(message), { context: context ?? stackOrContext });
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn(String(message), { context });
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug(String(message), { context });
  }

  verbose(message: unknown, context?: string): void {
    this.logger.verbose(String(message), { context });
  }
}
