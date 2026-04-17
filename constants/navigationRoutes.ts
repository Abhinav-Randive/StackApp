// Tab names
export const TAB_ROUTES = {
  HOME: "Home",
  FEED: "Feed",
  STACKS: "Stacks",
  PROFILE: "Profile"
} as const;

// Stack navigator routes
export const STACK_ROUTES = {
  LOGIN: "Login",
  MAIN: "Main",
  STACK_DETAIL: "StackDetail",
  FRIENDS: "Friends",
  INVITE: "Invite",
  NOTIFICATIONS: "Notifications",
  PUBLIC_PROFILE: "PublicProfile",
  LEADERBOARD: "Leaderboard",
  COMPLETED_STACK: "CompletedStack",
  ONBOARDING: "Onboarding"
} as const;

// Icon mapping for tabs
export const TAB_ICONS = {
  [TAB_ROUTES.HOME]: "home-outline",
  [TAB_ROUTES.FEED]: "list-outline",
  [TAB_ROUTES.STACKS]: "layers-outline",
  [TAB_ROUTES.PROFILE]: "person-outline"
} as const;
