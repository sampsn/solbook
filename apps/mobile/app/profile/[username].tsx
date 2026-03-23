// apps/mobile/app/profile/[username].tsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { ScreenHeader } from '@/components/ScreenHeader'
import { getProfile, toggleFollow, FeedPost, Profile } from '@/lib/api'

export default function ProfileScreen() {
  const { colors } = useTheme()
  const { username } = useLocalSearchParams<{ username: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    profileHeader: { borderBottomWidth: 1, borderBottomColor: colors.border, padding: 16 },
    profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    profileInfo: { flex: 1 },
    displayName: { fontFamily: font.bold, fontSize: 18, color: colors.textStrong },
    username: { fontFamily: font.regular, fontSize: 15, color: colors.accentAlt, marginTop: 2 },
    bio: { fontFamily: font.regular, fontSize: 15, color: colors.text, marginTop: 8 },
    counts: { flexDirection: 'row', gap: 16, marginTop: 12 },
    count: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
    countNum: { fontFamily: font.bold, color: colors.text },
    settingsLink: { fontFamily: font.regular, fontSize: 14, color: colors.textStrong },
    followBtn: { borderWidth: 1, borderColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6 },
    followingBtn: { borderColor: colors.border },
    followBtnText: { fontFamily: font.regular, fontSize: 14, color: colors.accent },
    followingBtnText: { color: colors.muted },
    empty: { fontFamily: font.regular, fontSize: 16, color: colors.muted, textAlign: 'center', paddingVertical: 48 },
  }), [colors])

  async function load() {
    if (!username) return
    const result = await getProfile(username)
    if (!result.profile) { router.back(); return }

    const { data: { user } } = await supabase.auth.getUser()
    setProfile(result.profile)
    setPosts(result.posts)
    setFollowerCount(result.followerCount)
    setFollowingCount(result.followingCount)
    setIsFollowing(result.isFollowing)
    setIsOwnProfile(user?.id === result.profile.id)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [username])

  async function handleFollow() {
    if (!profile) return
    setIsFollowing((f) => !f)
    setFollowerCount((c) => isFollowing ? c - 1 : c + 1)
    await toggleFollow(profile.id)
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={username ? `@${username}` : ''} showBack />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      ) : profile ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard {...item} onLikeToggled={load} />}
          ListHeaderComponent={
            <View style={styles.profileHeader}>
              <View style={styles.profileTop}>
                <View style={styles.profileInfo}>
                  <Text style={styles.displayName}>{profile.display_name}</Text>
                  <Text style={styles.username}>@{profile.username}</Text>
                  {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
                  <View style={styles.counts}>
                    <Text style={styles.count}><Text style={styles.countNum}>{followerCount}</Text> followers</Text>
                    <Text style={styles.count}><Text style={styles.countNum}>{followingCount}</Text> following</Text>
                  </View>
                </View>
                {isOwnProfile ? (
                  <TouchableOpacity onPress={() => router.push('/settings')}>
                    <Text style={styles.settingsLink}>settings →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.followBtn, isFollowing && styles.followingBtn]}
                    onPress={handleFollow}
                  >
                    <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                      {isFollowing ? 'unfollow' : 'follow'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>no posts yet.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.accent} />}
        />
      ) : null}
    </View>
  )
}
