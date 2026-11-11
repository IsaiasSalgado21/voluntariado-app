import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SessionProvider } from '@/features/auth/session-provider';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SessionProvider>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="voluntariados/[id]" />
          <Stack.Screen name="flora-fauna/[id]" />
          <Stack.Screen name="articulos/index" />
          <Stack.Screen name="articulos/[id]" />
          <Stack.Screen name="login" />
          <Stack.Screen name="perfil" />
          <Stack.Screen name="inscripciones" />
          <Stack.Screen name="notificaciones" />
          <Stack.Screen name="dashboard" />
        </Stack>
      </SessionProvider>
    </ThemeProvider>
  );
}
