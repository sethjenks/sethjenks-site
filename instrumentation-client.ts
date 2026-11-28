import posthog from "posthog-js";

import {
  POSTHOG_DEFAULTS,
  POSTHOG_PROXY_PATH,
  posthogIngestionHost,
  posthogProjectKey,
  posthogUiHost,
} from "./src/lib/posthog-config";

const key = posthogProjectKey();

if (key) {
  try {
    posthog.init(key, {
      api_host: POSTHOG_PROXY_PATH,
      ui_host: posthogUiHost(posthogIngestionHost()),
      defaults: POSTHOG_DEFAULTS,
      // history_change covers the first load and App Router navigations.
      capture_pageview: "history_change",
      capture_pageleave: true,
      autocapture: true,
      // Recording still requires the project setting in PostHog.
      disable_session_recording: false,
      capture_exceptions: true,
    });
  } catch {
    // Analytics must never take down the page.
  }
}
