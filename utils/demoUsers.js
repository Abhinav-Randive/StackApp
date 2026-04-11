export const DEMO_USERS = [
  {
    id: "demo-ava",
    name: "Ava Bloom",
    email: "ava@stack.demo",
    bio: "Saving for a Lisbon design retreat and cheering everyone else on.",
    friends: ["demo-milo", "demo-zoe"],
    stats: {
      totalSaved: 1240,
      streakDays: 6,
      completedCount: 2,
      stackCount: 4
    },
    completedStacks: ["Lisbon Retreat", "Studio Upgrade"]
  },
  {
    id: "demo-milo",
    name: "Milo Hart",
    email: "milo@stack.demo",
    bio: "Building a travel and camera fund one small sprint at a time.",
    friends: ["demo-ava", "demo-zoe"],
    stats: {
      totalSaved: 860,
      streakDays: 4,
      completedCount: 1,
      stackCount: 3
    },
    completedStacks: ["Japan Flight Fund"]
  },
  {
    id: "demo-zoe",
    name: "Zoe Lane",
    email: "zoe@stack.demo",
    bio: "Focused on wedding goals, soft life goals, and consistent progress.",
    friends: ["demo-ava", "demo-milo", "demo-iris"],
    stats: {
      totalSaved: 2110,
      streakDays: 9,
      completedCount: 3,
      stackCount: 5
    },
    completedStacks: ["Venue Deposit", "Dress Fund", "Mini Moon"]
  },
  {
    id: "demo-iris",
    name: "Iris Cole",
    email: "iris@stack.demo",
    bio: "Testing shared stacks with playful updates and milestone energy.",
    friends: ["demo-zoe"],
    stats: {
      totalSaved: 540,
      streakDays: 2,
      completedCount: 0,
      stackCount: 2
    },
    completedStacks: []
  }
];

export const DEMO_ACTIVITIES = [
  {
    id: "demo-activity-ava",
    type: "contribution",
    user: "Ava Bloom",
    user_id: "demo-ava",
    stack_id: null,
    stack_name: "Lisbon Retreat",
    amount: 140,
    text: "Locked in another flight chunk after freelance week.",
    target_user_ids: [],
    comments: [
      {
        id: "demo-comment-1",
        user: "Milo Hart",
        user_id: "demo-milo",
        text: "That trip fund is moving fast.",
        timestamp: Date.now() - 1000 * 60 * 35
      }
    ],
    likes: [],
    reactions: { heart: ["demo-zoe"], fire: [], clap: ["demo-iris"] },
    read_by: [],
    metadata: {}
  },
  {
    id: "demo-activity-milo",
    type: "milestone",
    user: "Milo Hart",
    user_id: "demo-milo",
    stack_id: null,
    stack_name: "Japan Flight Fund",
    amount: 0,
    text: "Halfway there and finally feeling real.",
    target_user_ids: [],
    comments: [],
    likes: ["demo-ava"],
    reactions: { heart: [], fire: ["demo-zoe"], clap: [] },
    read_by: [],
    metadata: { milestone: 50 }
  },
  {
    id: "demo-activity-zoe",
    type: "contribution",
    user: "Zoe Lane",
    user_id: "demo-zoe",
    stack_id: null,
    stack_name: "Venue Deposit",
    amount: 220,
    text: "One more push and this one is done.",
    target_user_ids: [],
    comments: [
      {
        id: "demo-comment-2",
        user: "Ava Bloom",
        user_id: "demo-ava",
        text: "This is such a satisfying goal.",
        timestamp: Date.now() - 1000 * 60 * 18
      }
    ],
    likes: ["demo-milo"],
    reactions: { heart: ["demo-iris"], fire: [], clap: [] },
    read_by: [],
    metadata: {}
  }
];

export function getDemoUserById(userId) {
  return DEMO_USERS.find((user) => user.id === userId) || null;
}
