import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

import { posthogIngestionHost, posthogProjectKey } from "./src/lib/posthog-config";

const token = posthogProjectKey();

export const posthogLoggerProvider = token
  ? new LoggerProvider({
      resource: resourceFromAttributes({ "service.name": "sethjenks-site" }),
      processors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: `${posthogIngestionHost()}/i/v1/logs`,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        }),
      ],
    })
  : null;

const posthogLogger = posthogLoggerProvider?.getLogger("posthog-log-capture");

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !posthogLogger) {
    return;
  }

  posthogLogger.emit({
    body: "PostHog server log capture initialized",
    severityNumber: SeverityNumber.INFO,
    attributes: { runtime: "nodejs" },
  });
}
