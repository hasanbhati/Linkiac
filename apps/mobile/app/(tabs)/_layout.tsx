import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, Inbox, Users, BarChart3, Settings } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/context/ThemeContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 4);
  const { suggestions, friends, currentUser } = useApp();
  const { theme } = useTheme();

  const inboxBadgeCount = suggestions.filter(
    s => s.status === 'pending' && s.recipient_id === currentUser.id
  ).length;
  const friendsBadgeCount = friends.filter(
    f => f.status === 'pending' && f.recipient_id === currentUser.id
  ).length;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopColor: theme.tabBarBorder,
          height: 52 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
      }}
    >
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => <Bookmark color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size }) => <Inbox color={color} size={size} />,
          tabBarBadge: inboxBadgeCount > 0 ? inboxBadgeCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.accentPrimary,
            color: theme.accentText,
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          tabBarBadge: friendsBadgeCount > 0 ? friendsBadgeCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.accentPrimary,
            color: theme.accentText,
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
