import type { IntentResult } from "../types";

export class IntentEngine {
  private taskKeywords = [
    "buy",
    "finish",
    "complete",
    "build",
    "make",
    "call",
    "study",
    "submit",
    "fix",
    "practice",
    "send",
  ];

  private calendarKeywords = [
    "meeting",
    "today",
    "tomorrow",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "am",
    "pm",
    ":",
  ];

  private habitKeywords = [
    "every day",
    "daily",
    "every morning",
    "every evening",
    "habit",
    "routine",
  ];

  analyze(text: string): IntentResult | null {
    const value = text.toLowerCase();

    if (
      this.calendarKeywords.some((word) =>
        value.includes(word)
      )
    ) {
      return {
        type: "calendar",
        confidence: 95,
        title: "Calendar Event Detected",
        actionId: "create-calendar-event",
        actionLabel: "Create Event",
        reason: "Detected date or time information.",
      };
    }

    if (
      this.taskKeywords.some((word) =>
        value.includes(word)
      )
    ) {
      return {
        type: "task",
        confidence: 93,
        title: "Mission Detected",
        actionId: "create-task",
        actionLabel: "Create Mission",
        reason: "Detected an action-oriented task.",
      };
    }

    if (
      this.habitKeywords.some((word) =>
        value.includes(word)
      )
    ) {
      return {
        type: "habit",
        confidence: 90,
        title: "Habit Detected",
        actionId: "create-habit",
        actionLabel: "Create Habit",
        reason: "Detected a recurring activity.",
      };
    }

    // Nothing actionable detected.
    return null;
  }
}