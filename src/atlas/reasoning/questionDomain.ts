// ==========================================
// LifeOS ATLAS Question Domain V1
// ==========================================
//
// Pure relevance classification only. This
// module never reads or produces factual LifeOS
// evidence and conversation remains linguistic
// context only.
// ==========================================

import type {
  AtlasConversationTurn,
} from "./atlasAIProvider";

export const ATLAS_QUESTION_DOMAIN_VERSION =
  "1.0.0" as const;

export type AtlasQuestionDomain =
  | "tasks-priorities"
  | "habits"
  | "goals-planning"
  | "risks"
  | "execution-progress"
  | "xp"
  | "daily-status"
  | "weekly-status"
  | "recommendations-next-action"
  | "general";

export type AtlasQuestionMode =
  | "direct"
  | "explanation-follow-up";

export type AtlasQuestionDomainResolution =
  | "current-question"
  | "conversation"
  | "fallback";

export type AtlasQuestionDetail =
  | "aggregate"
  | "item-specific"
  | "unspecified";

export interface AtlasQuestionDomainClassification {
  version: typeof ATLAS_QUESTION_DOMAIN_VERSION;
  domain: AtlasQuestionDomain;
  mode: AtlasQuestionMode;
  resolution: AtlasQuestionDomainResolution;
  detail: AtlasQuestionDetail;
  matchedPatterns: readonly string[];
}

interface DomainRule {
  domain: Exclude<AtlasQuestionDomain, "general">;
  patterns: readonly RegExp[];
}

const DOMAIN_RULES: readonly DomainRule[] = [
  {
    domain: "habits",
    patterns: [
      /\bhabits?\b/,
      /\bstreaks?\b/,
      /\broutines?\b/,
      /\bconsistency\b/,
    ],
  },
  {
    domain: "xp",
    patterns: [
      /\bxp\b/,
      /\bexperience points?\b/,
    ],
  },
  {
    domain: "goals-planning",
    patterns: [
      /\bgoals?\b/,
      /\blife goals?\b/,
      /\bmonthly targets?\b/,
      /\bweekly targets?\b/,
      /\bplanning\b/,
      /\bplans?\b/,
    ],
  },
  {
    domain: "tasks-priorities",
    patterns: [
      /\btasks?\b/,
      /\bto[ -]?dos?\b/,
      /\bpriorit(?:y|ies)\b/,
      /\bfinish\b/,
      /\bwhich\b.*\bfirst\b/,
      /\bfocus\b.*\bfirst\b/,
    ],
  },
  {
    domain: "risks",
    patterns: [
      /\brisks?\b/,
      /\bfalling behind\b/,
      /\bbehind\b/,
      /\boverdue\b/,
      /\bstuck\b/,
    ],
  },
  {
    domain: "weekly-status",
    patterns: [
      /\bthis week\b/,
      /\bweekly\b/,
      /\bweek\b/,
    ],
  },
  {
    domain: "execution-progress",
    patterns: [
      /\bcompleted?\b/,
      /\baccomplish(?:ed|ment|ments)?\b/,
      /\bprogress\b/,
      /\bexecution\b/,
      /\bdone\b/,
    ],
  },
  {
    domain: "recommendations-next-action",
    patterns: [
      /\bwhat should i do\b/,
      /\bwhat next\b/,
      /\bwhat should i focus on\b/,
      /\bnext action\b/,
      /\brecommend(?:ation|ations)?\b/,
    ],
  },
  {
    domain: "daily-status",
    patterns: [
      /\btoday(?:'s)?\b/,
      /\bdaily\b/,
    ],
  },
] as const;

const FOLLOW_UP_PATTERNS: readonly RegExp[] = [
  /^why\b/,
  /\bwhy (?:that|this|it|one)\b/,
  /\bexplain (?:that|this|it)\b/,
  /\bwhat about (?:the )?(?:second|next|other) (?:one|task|priority)?\b/,
] as const;

function normalizeQuestion(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchDomain(
  question: string
): {
  domain: AtlasQuestionDomain;
  matchedPatterns: string[];
} {
  for (const rule of DOMAIN_RULES) {
    const matchedPatterns = rule.patterns
      .filter((pattern) => pattern.test(question))
      .map((pattern) => pattern.source);

    if (matchedPatterns.length > 0) {
      return {
        domain: rule.domain,
        matchedPatterns,
      };
    }
  }

  return {
    domain: "general",
    matchedPatterns: [],
  };
}

function isFollowUp(question: string): boolean {
  return FOLLOW_UP_PATTERNS.some((pattern) =>
    pattern.test(question)
  );
}

function getQuestionDetail(
  question: string,
  domain: AtlasQuestionDomain
): AtlasQuestionDetail {
  const itemSpecific =
    /\b(?:which|what)\s+(?:specific\s+)?(?:habit|task|goal)\b/.test(
      question
    ) ||
    /\b(?:habit|task|goal)\b.*\bstruggl(?:e|es|ing)?\b/.test(
      question
    );

  if (itemSpecific) {
    return "item-specific";
  }

  return domain === "general"
    ? "unspecified"
    : "aggregate";
}

function recoverConversationDomain(
  conversation: readonly AtlasConversationTurn[]
): AtlasQuestionDomain | undefined {
  for (
    let index = conversation.length - 1;
    index >= 0;
    index -= 1
  ) {
    const turn = conversation[index];

    if (!turn || turn.role !== "user") {
      continue;
    }

    const matched = matchDomain(
      normalizeQuestion(turn.content)
    );

    if (matched.domain !== "general") {
      return matched.domain;
    }
  }

  return undefined;
}

export function classifyAtlasQuestionDomain(
  question: string,
  conversation: readonly AtlasConversationTurn[] = []
): AtlasQuestionDomainClassification {
  const normalized = normalizeQuestion(question);
  const current = matchDomain(normalized);
  const followUp = isFollowUp(normalized);

  if (current.domain !== "general") {
    return {
      version: ATLAS_QUESTION_DOMAIN_VERSION,
      domain: current.domain,
      mode: followUp
        ? "explanation-follow-up"
        : "direct",
      resolution: "current-question",
      detail: getQuestionDetail(
        normalized,
        current.domain
      ),
      matchedPatterns: current.matchedPatterns,
    };
  }

  if (followUp) {
    const recoveredDomain =
      recoverConversationDomain(conversation);

    if (recoveredDomain) {
      return {
        version: ATLAS_QUESTION_DOMAIN_VERSION,
        domain: recoveredDomain,
        mode: "explanation-follow-up",
        resolution: "conversation",
        detail: "unspecified",
        matchedPatterns: ["conversation-domain"],
      };
    }
  }

  return {
    version: ATLAS_QUESTION_DOMAIN_VERSION,
    domain: "general",
    mode: followUp
      ? "explanation-follow-up"
      : "direct",
    resolution: "fallback",
    detail: "unspecified",
    matchedPatterns: [],
  };
}
