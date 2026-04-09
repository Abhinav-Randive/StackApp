import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export const MILESTONES = [25, 50, 75, 100];

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

  if (item.type === "milestone") {
    return `${name} hit ${item.metadata?.milestone || 0}%${stackName}`;
  }

  if (item.type === "comment") {
    return `${name} commented${stackName}`;
  }

  if (item.type === "like") {
    return `${name} liked an update${stackName}`;
  }

  return `${name} added $${item.amount || 0}${stackName}`;
}

export function formatNotificationLine(item) {
  const name = item.user || "Someone";
  const stackName = item.stack_name ? ` in ${item.stack_name}` : "";

  if (item.type === "milestone") {
    return `${name} hit ${item.metadata?.milestone || 0}%${stackName}`;
  }

  if (item.type === "comment") {
    return `${name} commented on your update${stackName}`;
  }

  if (item.type === "like") {
    return `${name} liked your update${stackName}`;
  }

  return `${name} added $${item.amount || 0}${stackName}`;
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
