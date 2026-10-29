import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';

import { ErrorToast } from '../components/ErrorToast';
import { start } from '../state/app';
import { useColors, useScheme } from '../theme/useTheme';

export default function RootLayout() {
  const colors = useColors();
  const scheme = useScheme();
  const [fontsLoaded, fontError] = useFonts({
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_800ExtraBold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    start();
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bgBase).catch(() => undefined);
  }, [colors.bgBase]);

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: colors.bgBase },
          }}
        />
        <ErrorToast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
