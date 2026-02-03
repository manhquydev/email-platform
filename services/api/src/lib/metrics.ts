/**
 * Business Metrics Module
 * Prometheus counters and gauges for email operations and queue monitoring
 */

import { Counter, Gauge, register as promRegister } from "prom-client";

// Email counters
let emailsReceivedCounter: Counter<string>;
try {
  emailsReceivedCounter = new Counter({
    name: "emails_received_total",
    help: "Total emails received via SMTP",
    labelNames: ["domain"],
  });
} catch (e) {
  emailsReceivedCounter = promRegister.getSingleMetric("emails_received_total") as Counter<string>;
}

let emailsSentCounter: Counter<string>;
try {
  emailsSentCounter = new Counter({
    name: "emails_sent_total",
    help: "Total outbound emails sent",
    labelNames: ["provider", "status"],
  });
} catch (e) {
  emailsSentCounter = promRegister.getSingleMetric("emails_sent_total") as Counter<string>;
}

// Queue gauge for job monitoring
let queueJobsGauge: Gauge<string>;
try {
  queueJobsGauge = new Gauge({
    name: "queue_jobs_current",
    help: "Current job count by queue and state",
    labelNames: ["queue", "state"],
  });
} catch (e) {
  queueJobsGauge = promRegister.getSingleMetric("queue_jobs_current") as Gauge<string>;
}

export { emailsReceivedCounter, emailsSentCounter, queueJobsGauge };
