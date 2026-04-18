import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export const MILESTONES = [25, 50, 75, 100];
export const STACK_TYPES = {
  SAVINGS: "savings",
  INVESTING: "investing"
};
export const INVESTING_RISK_LEVELS = ["Safe", "Balanced", "Growth"];
export const INVESTING_CHALLENGES = {
  consistency: {
    key: "consistency",
    label: "Consistency club",
    description: "Contribute every week and build the habit together."
  },
  first500: {
    key: "first500",
    label: "First $500 club",
    description: "Race together toward the first real investing milestone."
  },
  indexfund: {
    key: "indexfund",
    label: "Index starter",
    description: "Build a starter fund with steady group momentum."
  }
};

export function makeActivity({
  type,
  user,
  userId,
  stack,
  amount = 0,
  text = "",
  targetUserIds = [],
  comments = [],
  likes = [],
  reactions = { heart: [], fire: [], clap: [] },
  readBy = [],
  metadata = {}
}) {
  return {
    type,
    user,
    user_id: userId,
    stack_id: stack?.id || null,
    stack_name: stack?.name || "",
    stack_type: stack?.stack_type || STACK_TYPES.SAVINGS,
    stack_risk_level: stack?.risk_level || "",
    challenge_key: stack?.challenge_key || "",
    amount,
    text,
    target_user_ids: targetUserIds,
    comments,
    likes,
    reactions,
    read_by: readBy,
    metadata,
    timestamp: Date.now()
  };
}

export function getTargetUserIds(stack = {}, actorId) {
  return (stack.members || []).filter((memberId) => memberId && memberId !== actorId);
}

export async function createActivity(payload) {
  return addDoc(collection(db, "activities"), makeActivity(payload));
}

export async function createNotification(payload) {
  return addDoc(collection(db, "notifications"), makeActivity(payload));
}

export function formatActivityLine(item) {
  const name = item.user || "Someone";
  const stackName = item.stack_name ? ` in ${item.stack_name}` : "";
  const investingLabel = item.stack_type === STACK_TYPES.INVESTING ? " investing" : "";

  if (item.type === "milestone") {
    return `${name} hit ${item.metadata?.milestone || 0}%${stackName}${investingLabel}`;
  }

  if (item.type === "challenge") {
    return `${name} started the ${getChallengeLabel(item.challenge_key)}${stackName}`;
  }

  if (item.type === "comment") {
    return `${name} commented${stackName}`;
  }

  if (item.type === "like") {
    return `${name} liked an update${stackName}`;
  }

  if (item.type === "reaction") {
    return `${name} reacted${stackName}`;
  }

  if (item.text) {
    return `${name} added $${item.amount || 0}${stackName}${investingLabel} and shared why`;
  }

  return `${name} added $${item.amount || 0}${stackName}${investingLabel}`;
}

export function formatNotificationLine(item) {
  const name = item.user || "Someone";
  const stackName = item.stack_name ? ` in ${item.stack_name}` : "";
  const investingLabel = item.stack_type === STACK_TYPES.INVESTING ? " investing" : "";

  if (item.type === "milestone") {
    return `${name} hit ${item.metadata?.milestone || 0}%${stackName}${investingLabel}`;
  }

  if (item.type === "challenge") {
    return `${name} kicked off the ${getChallengeLabel(item.challenge_key)}${stackName}`;
  }

  if (item.type === "comment") {
    return `${name} commented on your update${stackName}`;
  }

  if (item.type === "like") {
    return `${name} liked your update${stackName}`;
  }

  if (item.type === "reaction") {
    return `${name} reacted to your update${stackName}`;
  }

  return `${name} added $${item.amount || 0}${stackName}${investingLabel}`;
}

export function getStackProgress(total, goal) {
  const safeGoal = Number(goal) || 0;

  if (safeGoal <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, total / safeGoal));
}

export function getReachedMilestones(progress) {
  const percent = Math.round(progress * 100);
  return MILESTONES.filter((milestone) => percent >= milestone);
}

export function getLatestMilestone(progress) {
  const milestones = getReachedMilestones(progress);
  return milestones[milestones.length - 1] || 0;
}

export function getNextMilestone(progress) {
  const percent = Math.round(progress * 100);
  return MILESTONES.find((milestone) => percent < milestone) || null;
}

export function getDaysUntil(deadline) {
  if (!deadline) return null;

  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) return null;

  const diff = end.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isCompletedStack(stack = {}, total = 0) {
  if (stack.status === "completed" || stack.completed_at) {
    return true;
  }

  return getStackProgress(total, stack.goal_amount) >= 1;
}

export function buildShareMessage(stack, total, memberCount) {
  return [
    `We completed "${stack.name}" on Stack.`,
    `Saved: $${total} of $${stack.goal_amount || total}.`,
    `${memberCount || 1} ${memberCount === 1 ? "member" : "members"} helped make it happen.`
  ].join(" ");
}

export function formatCurrency(value) {
  return `$${Math.round(Number(value) || 0)}`;
}

export function getContributionStreak(contributions = []) {
  const days = [...new Set(
    contributions
      .map((item) => {
        const timestamp = Number(item.timestamp) || 0;
        if (!timestamp) return null;
        return new Date(timestamp).toISOString().slice(0, 10);
      })
      .filter(Boolean)
  )].sort((a, b) => (a < b ? 1 : -1));

  if (!days.length) {
    return 0;
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (days[0] !== todayKey && days[0] !== yesterdayKey) {
    return 0;
  }

  let streak = 1;
  let cursor = new Date(`${days[0]}T00:00:00`);

  for (let index = 1; index < days.length; index += 1) {
    const previous = new Date(cursor);
    previous.setDate(previous.getDate() - 1);
    const previousKey = previous.toISOString().slice(0, 10);

    if (days[index] !== previousKey) {
      break;
    }

    streak += 1;
    cursor = previous;
  }

  return streak;
}

export function buildProfileBadges({
  totalSaved = 0,
  completedCount = 0,
  friendCount = 0,
  streakDays = 0,
  stackCount = 0
}) {
  const badges = [];

  if (totalSaved >= 1000) {
    badges.push("Four-digit saver");
  }

  if (completedCount >= 1) {
    badges.push("Goal finisher");
  }

  if (friendCount >= 3) {
    badges.push("Community builder");
  }

  if (streakDays >= 3) {
    badges.push("Momentum streak");
  }

  if (stackCount >= 3) {
    badges.push("Multi-stack planner");
  }

  if (!badges.length) {
    badges.push("Getting started");
  }

  return badges;
}

export function getInitials(name = "", fallback = "") {
  const source = (name || fallback || "").trim();

  if (!source) {
    return "ST";
  }

  const pieces = source
    .replace(/@.*/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!pieces.length) {
    return "ST";
  }

  return pieces.map((piece) => piece[0].toUpperCase()).join("");
}

export function getInactiveDays(timestamp) {
  if (!timestamp) {
    return null;
  }

  const diff = Date.now() - Number(timestamp);
  if (Number.isNaN(diff) || diff < 0) {
    return null;
  }

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getChallengeLabel(challengeKey) {
  return INVESTING_CHALLENGES[challengeKey]?.label || "investing challenge";
}

export function getChallengeDescription(challengeKey) {
  return INVESTING_CHALLENGES[challengeKey]?.description || "";
}

export function getExpectedAnnualReturn(riskLevel = "Balanced") {
  if (riskLevel === "Safe") {
    return 0.04;
  }

  if (riskLevel === "Growth") {
    return 0.09;
  }

  return 0.07;
}

export function getProjectedValue(total, riskLevel, months = 12) {
  const principal = Number(total) || 0;
  const annualRate = getExpectedAnnualReturn(riskLevel);
  const projected = principal * ((1 + (annualRate / 12)) ** months);
  return Math.round(projected);
}

export function getStackTypeLabel(stackType = STACK_TYPES.SAVINGS) {
  return stackType === STACK_TYPES.INVESTING ? "Investing" : "Savings";
}
