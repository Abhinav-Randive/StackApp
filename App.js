import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { COLORS } from "./theme";

import DashboardScreen from "./screens/dashboardScreen";
import FeedScreen from "./screens/feedScreen";
import FriendsScreen from "./screens/friendsScreen";
import HomeScreen from "./screens/StackHomeScreen";
import InviteScreen from "./screens/inviteScreen";
import LoginScreen from "./screens/loginScreen";
import NotificationScreen from "./screens/notificationScreen";
import ProfileScreen from "./screens/profileScreen";
import StackScreen from "./screens/stackScreen";
import PublicProfileScreen from "./screens/PublicProfileScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";
import CompletedStackScreen from "./screens/completedStackScreen";

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
          let iconName;

          if (route.name === "Home") iconName = "home-outline";
          else if (route.name === "Feed") iconName = "list-outline";
          else if (route.name === "Stacks") iconName = "layers-outline";
          else if (route.name === "Profile") iconName = "person-outline";

          return <Ionicons name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Stacks" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="StackDetail" component={StackScreen} />
        <Stack.Screen name="Friends" component={FriendsScreen} />
        <Stack.Screen name="Invite" component={InviteScreen} />
        <Stack.Screen name="Notifications" component={NotificationScreen} />
        <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="CompletedStack" component={CompletedStackScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
