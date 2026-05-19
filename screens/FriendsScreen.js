import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

var ORANGE = '#F97316';
var BLACK  = '#000000';
var GRAY1  = '#737373';
var GRAY2  = '#A3A3A3';
var SEP    = '#F0F0F0';

var FEATURES = [
  { icon: 'people-outline',     label: '同じ分野の仲間を探す' },
  { icon: 'flame-outline',      label: 'お互いの継続日数を応援' },
  { icon: 'chatbubble-outline', label: 'ダイレクトメッセージ' },
  { icon: 'trophy-outline',     label: '一緒に目標を達成する' },
];

export default function FriendsScreen() {
  var insets = useSafeAreaInsets();
  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>友達</Text>
        <Text style={s.sub}>夢を持つ仲間とつながる</Text>
      </View>

      <View style={s.sep} />

      <View style={s.comingSoon}>
        <Text style={s.emoji}>🌱</Text>
        <Text style={s.comingTitle}>友達機能、準備中</Text>
        <Text style={s.comingDesc}>{'同じ夢を持つ仲間と繋がって\nお互いの進捗を応援し合える機能を開発中です。'}</Text>
        <View style={s.badge}>
          <Text style={s.badgeTxt}>もうすぐリリース予定</Text>
        </View>
      </View>

      <View style={s.sep} />

      <View style={s.featureList}>
        <Text style={s.featureHeader}>予定している機能</Text>
        {FEATURES.map(function(item, i) {
          return (
            <View key={i}>
              <View style={s.featureRow}>
                <View style={s.iconWrap}>
                  <Ionicons name={item.icon} size={18} color={ORANGE} />
                </View>
                <Text style={s.featureText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={GRAY2} />
              </View>
              {i < FEATURES.length - 1 && <View style={s.rowSep} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

var s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#FFFFFF' },
  header:      { paddingHorizontal: 20, paddingBottom: 16 },
  title:       { fontSize: 24, fontWeight: '900', color: BLACK, letterSpacing: -0.5 },
  sub:         { fontSize: 13, color: GRAY2, marginTop: 3 },
  sep:         { height: 0.5, backgroundColor: SEP },
  comingSoon:  { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 44, gap: 12 },
  emoji:       { fontSize: 52, marginBottom: 4 },
  comingTitle: { fontSize: 22, fontWeight: '800', color: BLACK, textAlign: 'center', letterSpacing: -0.3 },
  comingDesc:  { fontSize: 14, color: GRAY1, textAlign: 'center', lineHeight: 22 },
  badge:       { backgroundColor: ORANGE + '18', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, marginTop: 4 },
  badgeTxt:    { fontSize: 12, fontWeight: '700', color: ORANGE },
  featureList: { paddingHorizontal: 20, paddingTop: 20 },
  featureHeader: { fontSize: 11, fontWeight: '700', color: GRAY2, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  iconWrap:    { width: 36, height: 36, borderRadius: 10, backgroundColor: ORANGE + '12', alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 15, color: BLACK, fontWeight: '500' },
  rowSep:      { height: 0.5, backgroundColor: SEP, marginLeft: 50 },
});
