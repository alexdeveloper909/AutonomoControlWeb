These examples should be used as guidance when configuring Sentry functionality within a project.

# Error / Exception Tracking

Use `Sentry.captureException(error)` to capture an exception and log the error in Sentry.
Use this in try catch blocks or areas where exceptions are expected

# Tracing Examples

Spans should be created for meaningful actions within an applications like button clicks, API calls, and function calls
Ensure you are creating custom spans with meaningful names and operations
Use the `Sentry.startSpan` function to create a span
Child spans can exist within a parent span

## Custom Span instrumentation in component actions

```javascript
function TestComponent() {
  const handleTestButtonClick = () => {
    // Create a transaction/span to measure performance
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click",
      },
      (span) => {
        const value = "some config";
        const metric = "some metric";

        // Metrics can be added to the span
        span.setAttribute("config", value);
        span.setAttribute("metric", metric);

        doSomething();
      },
    );
  };

  return (
    <button type="button" onClick={handleTestButtonClick}>
      Test Sentry
    </button>
  );
}
```

## Custom span instrumentation in API calls

```javascript
async function fetchUserData(userId) {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `GET /api/users/${userId}`,
    },
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    },
  );
}
```

# Logs

Where logs are used, ensure Sentry is imported using `import * as Sentry from "@sentry/react"`
Enable logging in Sentry using `Sentry.init({ enableLogs: true })`
Use the structured logger via `Sentry.logger`
Sentry offers a consoleLoggingIntegration that can be used to log specific console error types automatically without instrumenting the individual logger calls

## Configuration

### Baseline

```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://b764da62659e7570a5a9236b9aad413c@o4510810383056896.ingest.de.sentry.io/4510810386792528",

  enableLogs: true,
});
```

### Logger Integration

```javascript
Sentry.init({
  dsn: "https://b764da62659e7570a5a9236b9aad413c@o4510810383056896.ingest.de.sentry.io/4510810386792528",
  integrations: [
    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
});
```

## Logger Examples

`logger.fmt` is a template literal function that should be used to bring variables into the structured logs.

```javascript
Sentry.logger.trace("Starting database connection", { database: "users" });
Sentry.logger.debug(Sentry.logger.fmt`Cache miss for user: ${userId}`);
Sentry.logger.info("Updated profile", { profileId: 345 });
Sentry.logger.warn("Rate limit reached for endpoint", {
  endpoint: "/api/results/",
  isEnterprise: false,
});
Sentry.logger.error("Failed to process payment", {
  orderId: "order_123",
  amount: 99.99,
});
Sentry.logger.fatal("Database connection pool exhausted", {
  database: "users",
  activeConnections: 100,
});
```

# Metrics

Metrics allow you to send counters, gauges, and distributions to Sentry, and then drill into related traces, logs, and errors.

Use the metrics APIs on `Sentry.metrics`:

```javascript
import * as Sentry from "@sentry/react";

// Count occurrences
Sentry.metrics.count("ui.click", 1, {
  attributes: { feature: "workspaces", action: "create" },
});

// Track distributions (durations/latencies, payload sizes, etc.)
Sentry.metrics.distribution("http.client.duration", 187.5, {
  unit: "millisecond",
  attributes: { method: "GET", pathname: "/workspaces/:workspaceId/records" },
});
```

Notes:
- Keep metric names stable and attributes reasonably bounded (avoid raw IDs where possible).
- Metrics are buffered; use `await Sentry.flush()` if you need to ensure delivery before navigation/unload.