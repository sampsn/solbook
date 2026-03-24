import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import {
  useFonts,
  CourierPrime_400Regular,
  CourierPrime_700Bold,
  CourierPrime_400Regular_Italic,
  CourierPrime_700Bold_Italic,
} from '@expo-google-fonts/courier-prime'
import * as SplashScreen from 'expo-splash-screen'
import { lightColors, darkColors } from '@/lib/theme'
import { ThemeContextProvider, useTheme } from '@/lib/ThemeContext'
import { AlertsContextProvider } from '@/components/AlertsContext'

function ThemedStatusBar() {
  const { colors } = useTheme()
  const isDark = colors.bg === darkColors.bg
  return <StatusBar style={isDark ? 'light' : 'dark'} />
}

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CourierPrime_400Regular,
    CourierPrime_700Bold,
    CourierPrime_400Regular_Italic,
    CourierPrime_700Bold_Italic,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: lightColors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={lightColors.accent} />
      </View>
    )
  }

  return (
    <ThemeContextProvider>
      <AlertsContextProvider>
        <ThemedStatusBar />
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/[username]" options={{ presentation: 'card' }} />
        <Stack.Screen name="post/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="search" options={{ presentation: 'card' }} />
        </Stack>
      </AlertsContextProvider>
    </ThemeContextProvider>
  )
}
