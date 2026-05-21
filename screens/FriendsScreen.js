import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMMUNITY_USERS } from '../constants/data';
import { loadStorage, saveStorage } from '../utils/storage';
import * as Haptics from 'expo-haptics';

var ORANGE = '#F97316';
var BLACK  = '#000000';
var GRAY1  = '#737373';
var GRAY2  = '#A3A3A3';
var SEP    = '#F0F0F0';
var BG     = '#FFFFFF';

var STORY_VIEWED_KEY  = 'tomoshibi_story_viewed';
var CHEERED_KEY       = 'tomoshibi_friends_cheered';

// モックの最終メッセージ
var MOCK_LAST = {
  1: { text: 'ギター練習30分できた！',      time: '2時間前' },
  2: { text: '今日のタスク全部終わったよ',   time: '5時間前' },
  3: { text: '個展の案内できたよ〜',         time: '昨日' },
  4: { text: 'スニーカーのデザイン見て！',   time: '昨日' },
  5: { text: '今日も走った。23日連続！',     time: '2日前' },
};

// ── ストーリー円（上段） ────────────────────────────────────────────────────
function StoryCircle({ user, viewed, onPress }) {
  var scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(function() {});
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start(function() { onPress && onPress(user); });
  }

  return (
    <Animated.View style={[st.storyWrap, { transform: [{ scale }] }]}>
      <TouchableOpacity activeOpacity={1} onPress={handlePress} style={st.storyBtn}>
        {/* リング: 未読=オレンジ、既読=グレー */}
        <View style={[st.storyRing, viewed && st.storyRingViewed]}>
          <View style={st.storyInner}>
            <Text style={st.storyEmoji}>{user.emoji}</Text>
          </View>
        </View>
        <Text style={st.storyName} numberOfLines={1}>{user.name}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── DMリスト行 ────────────────────────────────────────────────────────────
function DMRow({ user, onPress }) {
  var scale = useRef(new Animated.Value(1)).current;
  var last = MOCK_LAST[user.id] || { text: 'メッセージを送ってみよう', time: '' };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={function() {
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
        }}
        onPressOut={function() {
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
        }}
        onPress={function() {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(function() {});
          onPress && onPress(user);
        }}
        style={dm.row}
      >
        {/* アバター */}
        <View style={dm.avatar}>
          <Text style={dm.avatarEmoji}>{user.emoji}</Text>
          {/* ストリーク30日以上 → オレンジリング */}
          {user.streak >= 30 && <View style={dm.avatarRing} />}
        </View>

        {/* テキスト */}
        <View style={dm.body}>
          <View style={dm.topRow}>
            <Text style={dm.name}>{user.name}</Text>
            <Text style={dm.time}>{last.time}</Text>
          </View>
          <Text style={dm.lastMsg} numberOfLines={1}>{last.text}</Text>
        </View>

        {/* 🔥ストリーク */}
        <View style={dm.streakBadge}>
          <Text style={dm.streakTxt}>🔥{user.streak}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────
export default function FriendsScreen({ userData, onOpenDM }) {
  var insets = useSafeAreaInsets();
  var [viewed, setViewed] = useState({});
  var [search, setSearch] = useState('');

  useEffect(function() {
    loadStorage(STORY_VIEWED_KEY).then(function(saved) {
      if (saved) setViewed(saved);
    });
  }, []);

  function handleStoryPress(user) {
    // ストーリー→DM遷移（既読にする）
    setViewed(function(prev) {
      var next = Object.assign({}, prev, { [user.id]: true });
      saveStorage(STORY_VIEWED_KEY, next);
      return next;
    });
    if (onOpenDM) onOpenDM(user);
  }

  // 検索フィルタ
  var filtered = COMMUNITY_USERS.filter(function(u) {
    if (!search.trim()) return true;
    return u.name.includes(search) || u.dream.includes(search);
  });

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>メッセージ</Text>
        <TouchableOpacity
          onPress={function() { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(function() {}); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="create-outline" size={24} color={BLACK} />
        </TouchableOpacity>
      </View>

      {/* ── 検索バー ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={15} color={GRAY2} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="検索"
            placeholderTextColor={GRAY2}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={function() { setSearch(''); }}>
              <Ionicons name="close-circle" size={16} color={GRAY2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── ストーリー横スクロール ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.storiesWrap}
          style={s.storiesRow}
        >
          {COMMUNITY_USERS.map(function(u) {
            return (
              <StoryCircle
                key={u.id}
                user={u}
                viewed={!!viewed[u.id]}
                onPress={handleStoryPress}
              />
            );
          })}
        </ScrollView>

        <View style={s.sep} />

        {/* ── メッセージリスト ── */}
        <View style={s.msgHeader}>
          <Text style={s.msgHeaderTxt}>メッセージ</Text>
        </View>

        {filtered.map(function(u) {
          return (
            <View key={u.id}>
              <DMRow user={u} onPress={onOpenDM} />
              <View style={s.rowSep} />
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTxt}>「{search}」に一致する仲間がいません</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── StoryCircle styles ──
var st = StyleSheet.create({
  storyWrap:        { alignItems: 'center', marginRight: 16 },
  storyBtn:         { alignItems: 'center' },
  storyRing:        {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2.5, borderColor: ORANGE,
    padding: 2, marginBottom: 6,
  },
  storyRingViewed:  { borderColor: '#D1D5DB' },
  storyInner:       {
    flex: 1, borderRadius: 30,
    backgroundColor: '#F8F8F8',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: BG,
  },
  storyEmoji:       { fontSize: 28 },
  storyName:        { fontSize: 11, color: BLACK, fontWeight: '600', maxWidth: 64, textAlign: 'center' },
});

// ── DMRow styles ──
var dm = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  avatar:      { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F8F8F8', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarEmoji: { fontSize: 28 },
  avatarRing:  { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 30, borderWidth: 2, borderColor: ORANGE },
  body:        { flex: 1 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  name:        { fontSize: 15, fontWeight: '700', color: BLACK },
  time:        { fontSize: 12, color: GRAY2 },
  lastMsg:     { fontSize: 13, color: GRAY1 },
  streakBadge: { backgroundColor: '#FFF7ED', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  streakTxt:   { fontSize: 12, fontWeight: '700', color: ORANGE },
});

// ── Main styles ──
var s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: BG },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: SEP },
  title:      { fontSize: 22, fontWeight: '900', color: BLACK, letterSpacing: -0.5 },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F4F4', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput:{ flex: 1, fontSize: 14, color: BLACK, padding: 0 },

  storiesRow:  { borderBottomWidth: 0.5, borderBottomColor: SEP },
  storiesWrap: { paddingHorizontal: 16, paddingVertical: 14 },

  sep:        { height: 0.5, backgroundColor: SEP },
  msgHeader:  { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  msgHeaderTxt: { fontSize: 13, fontWeight: '700', color: GRAY2, letterSpacing: 0.3 },
  rowSep:     { height: 0.5, backgroundColor: SEP, marginLeft: 84 },

  empty:      { padding: 32, alignItems: 'center' },
  emptyTxt:   { fontSize: 14, color: GRAY2 },
});
