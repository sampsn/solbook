import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { colors, font } from '@/lib/theme'
import { getNotifications, Notification } from '@/lib/api'

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const data = await getNotifications()
    setItems(data)
    setLoading(false)
    setRefreshing(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function onRefresh() { setRefreshing(true); load() }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
  }

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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerText}>notifications</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>no notifications yet.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  header: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  headerText: { fontFamily: font.bold, fontSize: 14, color: colors.accent },
  item: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  itemText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  accent: { color: colors.accent },
  muted: { color: colors.muted },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 48 },
})
