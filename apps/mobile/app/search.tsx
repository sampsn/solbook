import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { router } from 'expo-router'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { search, Profile, FeedPost } from '@/lib/api'
import { ScreenHeader } from '@/components/ScreenHeader'
import { PostCard } from '@/components/PostCard'

function ClearIcon({ color }: { color: string }) {
  return (
    <Svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  )
}

type Section =
  | { title: 'People'; data: Profile[] }
  | { title: 'Posts'; data: FeedPost[] }

export default function SearchScreen() {
  const { colors } = useTheme()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSubmit() {
    const trimmed = query.trim()
    if (!trimmed) return
    setLoading(true)
    setSearched(true)
    try {
      const result = await search(trimmed)
      setUsers(result.users)
      setPosts(result.posts)
    } finally {
      setLoading(false)
    }
  }

  const sections: Section[] = []
  if (users.length > 0) sections.push({ title: 'People', data: users })
  if (posts.length > 0) sections.push({ title: 'Posts', data: posts })

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    inputRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      backgroundColor: colors.bg,
    },
    input: {
      flex: 1,
      fontFamily: font.regular,
      fontSize: 16,
      color: colors.textStrong,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    clearBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 6,
      backgroundColor: colors.bg,
    },
    sectionTitle: {
      fontFamily: font.bold,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.muted,
    },
    profileRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    profileName: { fontFamily: font.bold, fontSize: 14, color: colors.heading },
    profileUsername: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
    profileBio: { fontFamily: font.regular, fontSize: 13, color: colors.textStrong, marginTop: 2 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { fontFamily: font.regular, fontSize: 16, color: colors.muted, textAlign: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  }), [colors])

  function renderSectionHeader({ section }: { section: { title: string } }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    )
  }

  function renderItem({ item, section }: { item: Profile | FeedPost; section: Section }) {
    if (section.title === 'People') {
      const user = item as Profile
      return (
        <TouchableOpacity
          style={styles.profileRow}
          onPress={() => router.push(`/profile/${user.username}`)}
        >
          <Text style={styles.profileName}>{user.display_name}</Text>
          <Text style={styles.profileUsername}>@{user.username}</Text>
          {user.bio ? <Text style={styles.profileBio}>{user.bio}</Text> : null}
        </TouchableOpacity>
      )
    }
    const post = item as FeedPost
    return <PostCard {...post} />
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="search" showBack />
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            placeholder="search people and posts"
            placeholderTextColor={colors.muted}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setQuery('')}>
              <ClearIcon color={colors.textStrong} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : searched && sections.length === 0 ? (
        <Text style={styles.empty}>no results for "{query.trim()}"</Text>
      ) : !searched ? (
        <Text style={styles.empty}>search for people and posts</Text>
      ) : (
        <SectionList
          sections={sections as any}
          keyExtractor={(item) => ('id' in item ? item.id : item.username)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  )
}
