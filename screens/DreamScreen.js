import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMMUNITY_USERS } from '../constants/data';

const ORANGE = '#F97316';
const BLACK  = '#000000';
const GRAY1  = '#737373';
const GRAY2  = '#A3A3A3';
const SEP    = '#F0F0F0';
const BG     = '#FFFFFF';

import { loadStorage, saveStorage } from '../utils/storage';

var CHEERED_KEY = 'tomoshibi_cheered';

function Pressable({ onPress, style, children }) {
  var scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 50 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50 }).start()}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DreamScreen({ userData, streak }) {
  const insets = useSafeAreaInsets();
  const [cheered, setCheered] = useState({});

  // 起動時にハート状態をロード
  useEffect(function() {
    loadStorage(CHEERED_KEY).then(function(saved) {
      if (saved) setCheered(saved);
    });
  }, []);
  const dream = userData.dreamTitle || userData.dream || '';

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.logo}>灯</Text>
        <View style={s.streakRow}>
          <Text style={s.streakFire}>🔥</Text>
          <Text style={s.streakNum}>{streak}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Dream Hero ── */}
        <View style={s.hero}>
          <Text style={s.heroLabel}>YOUR DREAM</Text>
          <Text style={s.heroText}>{dream.length > 30 ? dream.slice(0, 30) + '…' : dream}</Text>
          {userData.model && (
            <Text style={s.heroSub}>{userData.model.name} スタイル</Text>
          )}
          <View style={s.heroAccent} />
        </View>

        <View style={s.sep} />

        {/* ── Community ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>近くの夢想家たち</Text>
            <Text style={s.sectionSub}>みんなも動いている</Text>
          </View>

          {COMMUNITY_USERS.map((u, idx) => (
            <View key={u.id}>
              <View style={s.comRow}>
                <View style={s.comAvatar}>
                  <Text style={s.comAvatarText}>{u.emoji}</Text>
                </View>
                <View style={s.comBody}>
                  <View style={s.comTop}>
                    <Text style={s.comName}>{u.name}</Text>
                    <Text style={s.comStreak}>🔥 {u.streak}日</Text>
                  </View>
                  <Text style={s.comDream} numberOfLines={1}>{u.dream}</Text>
                </View>
                <Pressable onPress={() => {
                  setCheered(function(p) {
                    var next = Object.assign({}, p, { [u.id]: !p[u.id] });
                    saveStorage(CHEERED_KEY, next);
                    return next;
                  });
                }}>
                  <Ionicons
                    name={cheered[u.id] ? 'heart' : 'heart-outline'}
                    size={22}
                    color={cheered[u.id] ? ORANGE : GRAY2}
                  />
                </Pressable>
              </View>
              {idx < COMMUNITY_USERS.length - 1 && <View style={s.rowSep} />}
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG },

  // Header
  header:      { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: SEP },
  logo:        { fontSize: 24, fontWeight: '900', color: BLACK, letterSpacing: -1 },
  streakRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakFire:  { fontSize: 15 },
  streakNum:   { fontSize: 16, fontWeight: '800', color: ORANGE },

  scroll:      { paddingBottom: 20 },

  // Hero
  hero:        { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 28 },
  heroLabel:   { fontSize: 10, fontWeight: '700', color: ORANGE, letterSpacing: 2, marginBottom: 10 },
  heroText:    { fontSize: 32, fontWeight: '900', color: BLACK, lineHeight: 40, letterSpacing: -0.5, marginBottom: 12 },
  heroSub:     { fontSize: 13, color: GRAY1, marginBottom: 20 },
  heroAccent:  { width: 32, height: 3, backgroundColor: ORANGE, borderRadius: 2 },

  sep:         { height: 0.5, backgroundColor: SEP },

  // Section
  section:     { paddingHorizontal: 20, paddingTop: 24 },
  sectionHead: { marginBottom: 16 },
  sectionTitle:{ fontSize: 18, fontWeight: '800', color: BLACK, letterSpacing: -0.3 },
  sectionSub:  { fontSize: 12, color: GRAY2, marginTop: 2 },

  // Community row
  comRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  comAvatar:    { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F8F8F8', alignItems: 'center', justifyContent: 'center' },
  comAvatarText:{ fontSize: 24 },
  comBody:      { flex: 1 },
  comTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  comName:      { fontSize: 15, fontWeight: '700', color: BLACK },
  comStreak:    { fontSize: 11, color: ORANGE, fontWeight: '600' },
  comDream:     { fontSize: 13, color: GRAY1, lineHeight: 18 },
  rowSep:       { height: 0.5, backgroundColor: SEP },
});
