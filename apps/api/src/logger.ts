import pino from "pino";

const LOGGER_LEVEL = "info" as const;

export const logger = pino({ level: LOGGER_LEVEL });
