import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const missingConfiguration = !token
  ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
  : !host
    ? "NEXT_PUBLIC_POSTHOG_HOST"
    : null;

export const posthogLoggerProvider =
  token && host
    ? new LoggerProvider({
        resource: resourceFromAttributes({ "service.name": "sethjenks-site" }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: `${host.replace(/\/$/, "")}/i/v1/logs`,
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
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (!posthogLogger) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `${missingConfiguration} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingConfiguration} is configured`
      );
    }
    return;
  }

  posthogLogger.emit({
    body: "PostHog server log capture initialized",
    severityNumber: SeverityNumber.INFO,
    attributes: { runtime: "nodejs" },
  });
}
