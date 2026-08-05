// ==========================================
// LifeOS Parser Engine
// Version: Ultimate V1
// ==========================================

import type { IntentPackage } from "../types";

export class ParserEngine {
  parse(
    input: IntentPackage
  ): IntentPackage {

    const text =
      input.originalText.trim();

    return {
      ...input,

      title: text,

      priority: "medium",
    };
  }
}