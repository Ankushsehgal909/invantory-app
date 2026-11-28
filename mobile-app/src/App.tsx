import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { colors, paperTheme } from './theme';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { ProductDetailScreen } from './screens/ProductDetailScreen';
import { PurchasesScreen } from './screens/PurchasesScreen';
import { SalesScreen } from './screens/SalesScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { Home, Package, ShoppingCart, Users, FileText, Settings as SettingsIcon } from 'lucide-react-native';

const Stack = createNativeStackNavigator<any>();
const Tab = createBottomTabNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function TabNavigator() {
  const { user } = useAuth();
  const tabs = [
    { name: 'Dashboard', component: DashboardScreen, icon: Home, label: 'Home' },
    { name: 'Products', component: ProductsScreen, icon: Package, label: 'Products' },
    { name: 'Purchases', component: PurchasesScreen, icon: ShoppingCart, label: 'Purchases' },
    { name: 'Sales', component: SalesScreen, icon: ShoppingCart, label: 'Sales' },
    { name: 'Customers', component: CustomersScreen, icon: Users, label: 'Customers' },
    { name: 'Reports', component: ReportsScreen, icon: FileText, label: 'Reports' },
  ];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const tab = tabs.find(t => t.name === route.name);
          if (!tab) return null;
          const Icon = tab.icon;
          return <Icon size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        headerShown: false,
      })}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerTintColor: '#1e293b',
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen as React.ComponentType<any>} options={{ title: 'Product Details' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </AuthProvider>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}