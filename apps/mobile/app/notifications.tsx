// apps/mobile/app/notifications.tsx
import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/lib/theme'
import { getNotifications, Notification } from '@/lib/api'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useRefreshAlerts } from '@/components/AlertsContext'

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const refreshAlerts = useRefreshAlerts()

  async function load() {
    try {
      const data = await getNotifications()
      setItems(data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function markSeen() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ alerts_last_seen_at: new Date().toISOString() })
      .eq('id', user.id)
    if (!error) refreshAlerts()
  }

  useEffect(() => {
    markSeen()
  }, [])

  useFocusEffect(useCallback(() => { load() }, []))

  function onRefresh() { setRefreshing(true); load() }

  function renderItem({ item }: { item: Notification }) {
    if (item.type === 'follow') {
      return (
        <TouchableOpacity style={styles.item} onPress={() => router.push(`/profile/${item.username}`)}>
          <Text style={styles.itemText}>
            <Text style={styles.accent}>@{item.username}</Text>
            <Text style={styles.muted}> followed you</Text>
          </Text>
        </TouchableOpacity>
      )
    }
    return (
      <TouchableOpacity style={styles.item} onPress={() => item.postId && router.push(`/post/${item.postId}`)}>
        <Text style={styles.itemText}>
          <Text style={styles.accent}>@{item.username}</Text>
          <Text style={styles.muted}> liked · </Text>
          <Text style={styles.muted}>{item.postContent?.slice(0, 60)}{(item.postContent?.length ?? 0) > 60 ? '…' : ''}</Text>
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="alerts" showBack />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>no notifications yet.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  itemText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  accent: { color: colors.accent },
  muted: { color: colors.muted },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 48 },
})
