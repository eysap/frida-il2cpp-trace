import type { Reporter, ToolkitEvent } from "../shared/events.js";

export interface ToolkitEventMessage {
  readonly type: "toolkit.event";
  readonly event: ToolkitEvent;
}

export class MessageReporter implements Reporter {
  public report(event: ToolkitEvent): void {
    send({ type: "toolkit.event", event } satisfies ToolkitEventMessage);
  }
}
