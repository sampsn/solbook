// apps/mobile/app/(tabs)/profile.tsx
import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { ScreenHeader } from '@/components/ScreenHeader'
import { getProfile, FeedPost, Profile } from '@/lib/api'

export default function OwnProfileScreen() {
  const [username, setUsername] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/(auth)/login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    if (!profileData?.username) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    setUsername(profileData.username)

    const result = await getProfile(profileData.username)
    if (!result.profile) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    setProfile(result.profile)
    setPosts(result.posts)
    setFollowerCount(result.followerCount)
    setFollowingCount(result.followingCount)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={username ? `@${username}` : '@me'} showBell />
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      </View>
    )
  }

  if (!profile) return null

  return (
    <View style={styles.container}>
      <ScreenHeader title={`@${profile.username}`} showBell />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard {...item} onLikeToggled={load} />}
        ListHeaderComponent={
          <View style={styles.profileHeader}>
            <View style={styles.profileTop}>
              <View style={styles.profileInfo}>
                <Text style={styles.displayName}>{profile.display_name}</Text>
                <Text style={styles.usernameText}>@{profile.username}</Text>
                {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
                <View style={styles.counts}>
                  <Text style={styles.count}><Text style={styles.countNum}>{followerCount}</Text> followers</Text>
                  <Text style={styles.count}><Text style={styles.countNum}>{followingCount}</Text> following</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/settings')}>
                <Text style={styles.settingsLink}>settings →</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>no posts yet.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.accent} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: { borderBottomWidth: 1, borderBottomColor: colors.border, padding: 16 },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  profileInfo: { flex: 1 },
  displayName: { fontFamily: font.bold, fontSize: 18, color: colors.text },
  usernameText: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 2 },
  bio: { fontFamily: font.regular, fontSize: 15, color: colors.text, marginTop: 8 },
  counts: { flexDirection: 'row', gap: 16, marginTop: 12 },
  count: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  countNum: { fontFamily: font.bold, color: colors.text },
  settingsLink: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  empty: { fontFamily: font.regular, fontSize: 16, color: colors.muted, textAlign: 'center', paddingVertical: 48 },
})
