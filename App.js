import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { STACK_ROUTES, TAB_ICONS, TAB_ROUTES } from "./constants/navigationRoutes";
import { COLORS } from "./theme";

import LeaderboardScreen from "./screens/LeaderboardScreen";
import PublicProfileScreen from "./screens/PublicProfileScreen";
import HomeScreen from "./screens/StackHomeScreen";
import CompletedStackScreen from "./screens/completedStackScreen";
import DashboardScreen from "./screens/dashboardScreen";
import FeedScreen from "./screens/feedScreen";
import FriendsScreen from "./screens/friendsScreen";
import InviteScreen from "./screens/inviteScreen";
import LoginScreen from "./screens/loginScreen";
import NotificationScreen from "./screens/notificationScreen";
import OnboardingScreen from "./screens/onboardingScreen";
import ProfileScreen from "./screens/profileScreen";
import StackScreen from "./screens/stackScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.tab,
          borderTopColor: COLORS.border,
          height: 76,
          paddingBottom: 10,
          paddingTop: 10
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700"
        },
        tabBarActiveTintColor: COLORS.accent2,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarIcon: ({ color, size }) => {
          const iconName = TAB_ICONS[route.name];
          return <Ionicons name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name={TAB_ROUTES.HOME} component={DashboardScreen} />
      <Tab.Screen name={TAB_ROUTES.FEED} component={FeedScreen} />
      <Tab.Screen name={TAB_ROUTES.STACKS} component={HomeScreen} />
      <Tab.Screen name={TAB_ROUTES.PROFILE} component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name={STACK_ROUTES.LOGIN} component={LoginScreen} />
        <Stack.Screen name={STACK_ROUTES.MAIN} component={MainTabs} />
        <Stack.Screen name={STACK_ROUTES.STACK_DETAIL} component={StackScreen} />
        <Stack.Screen name={STACK_ROUTES.FRIENDS} component={FriendsScreen} />
        <Stack.Screen name={STACK_ROUTES.INVITE} component={InviteScreen} />
        <Stack.Screen name={STACK_ROUTES.NOTIFICATIONS} component={NotificationScreen} />
        <Stack.Screen name={STACK_ROUTES.PUBLIC_PROFILE} component={PublicProfileScreen} />
        <Stack.Screen name={STACK_ROUTES.LEADERBOARD} component={LeaderboardScreen} />
        <Stack.Screen name={STACK_ROUTES.COMPLETED_STACK} component={CompletedStackScreen} />
        <Stack.Screen name={STACK_ROUTES.ONBOARDING} component={OnboardingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
