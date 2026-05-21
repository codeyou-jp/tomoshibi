import * as Sentry from '@sentry/react-native';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

Sentry.init({
  dsn: 'https://ce322c9f6c91f82d23214cd19405f2f7@o4511414398156800.ingest.us.sentry.io/4511414416048128',
  enableInExpoDevelopment: false,
  debug: false,
  tracesSampleRate: 1.0,
});

import OnboardingScreen from './screens/OnboardingScreen';
import DreamScreen from './screens/DreamScreen';
import TodoScreen from './screens/TodoScreen';
import CoachScreen from './screens/CoachScreen';
import FriendsScreen from './screens/FriendsScreen';
import ProfileScreen from './screens/ProfileScreen';
import DMScreen from './screens/DMScreen';
import { loadStorage, saveStorage } from './utils/storage';
import { setupDailyReminder } from './utils/notifications';

var PRIMARY = '#F97316';
var MUTED = '#C0C0C0';
var BG = '#FFFFFF';
var TAB_BG = '#FFFFFF';
var BORDER = '#F0F0F0';
var STORAGE_KEY = 'tomoshibi_user';
var STREAK_KEY = 'tomoshibi_streak';
var STATS_KEY = 'tomoshibi_stats';
var RANK_KEY = 'tomoshibi_rank';

var TABS = [
  { key: 'dream',   label: '夢',      icon: 'star',                iconOff: 'star-outline' },
  { key: 'todo',    label: 'やること', icon: 'checkmark-circle',    iconOff: 'checkmark-circle-outline' },
  { key: 'friends', label: '友達',     icon: 'people',              iconOff: 'people-outline' },
  { key: 'coach',   label: 'コーチ',  icon: 'chatbubble-ellipses', iconOff: 'chatbubble-ellipses-outline' },
  { key: 'profile', label: '自分',     icon: 'person-circle',       iconOff: 'person-circle-outline' },
];

// ── AppContent: SafeAreaProvider の内側で動くメインコンポーネント ─────────────
function AppContent() {
  var insets = useSafeAreaInsets();

  var s1 = useState(null);
  var s2 = useState('dream');
  var s3 = useState(0);
  var s4 = useState(null);
  var s5 = useState(null);
  var s6 = useState(true);
  var s7 = useState({ totalTasksDone: 0, joinDate: Date.now(), daysActive: [] });
  var s8 = useState({ passedTests: {}, testShownFor: {} });
  var userDataVal = s1[0];
  var setUserData = s1[1];
  var activeTabVal = s2[0];
  var setActiveTab = s2[1];
  var streakVal = s3[0];
  var setStreak = s3[1];
  var dmFriend = s4[0];
  var setDmFriend = s4[1];
  var cachedRoadmap = s5[0];
  var setCachedRoadmap = s5[1];
  var isBooting = s6[0];
  var setIsBooting = s6[1];
  var stats = s7[0];
  var setStats = s7[1];
  var rankData = s8[0];
  var setRankData = s8[1];

  // Web: キーボード表示中はタブバーを隠す
  var s9 = useState(false);
  var webKbVisible = s9[0];
  var setWebKbVisible = s9[1];

  // Web専用: ズーム禁止 + タブバー固定 + フォーカスリング除去
  useEffect(function() {
    if (Platform.OS !== 'web') return;

    var style = document.createElement('style');
    style.textContent = [
      '#root { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; height: auto !important; overflow: hidden !important; max-width: 100vw !important; }',
      'input, textarea { outline: none !important; -webkit-tap-highlight-color: transparent !important; }',
      'html, body { overflow: hidden !important; max-width: 100vw !important; overscroll-behavior: none !important; }',
    ].join('\n');
    document.head.appendChild(style);

    var meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    }

    function preventGesture(e) { e.preventDefault(); }
    function preventPinch(e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }
    document.addEventListener('gesturestart',  preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });
    document.addEventListener('gestureend',    preventGesture, { passive: false });
    document.addEventListener('touchmove',     preventPinch,   { passive: false });

    function onFocusIn(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        setWebKbVisible(true);
      }
    }
    function onFocusOut(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        setWebKbVisible(false);
      }
    }
    document.addEventListener('focusin',  onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    return function() {
      document.removeEventListener('gesturestart',  preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend',    preventGesture);
      document.removeEventListener('touchmove',     preventPinch);
      document.removeEventListener('focusin',  onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // 起動時にAsyncStorageから一括ロード
  useEffect(function() {
    async function boot() {
      var saved       = await loadStorage(STORAGE_KEY);
      var savedStreak = await loadStorage(STREAK_KEY);
      var savedStats  = await loadStorage(STATS_KEY);
      var savedRank   = await loadStorage(RANK_KEY);
      if (saved)       s1[1](saved);
      if (savedStreak) s3[1](savedStreak);
      if (savedStats)  s7[1](savedStats);
      if (savedRank)   s8[1](savedRank);
      setIsBooting(false);
    }
    boot();
  }, []);

  useEffect(function() {
    if (userDataVal) saveStorage(STORAGE_KEY, userDataVal);
  }, [userDataVal]);

  useEffect(function() {
    saveStorage(STREAK_KEY, streakVal);
  }, [streakVal]);

  useEffect(function() {
    saveStorage(STATS_KEY, stats);
  }, [stats]);

  useEffect(function() {
    saveStorage(RANK_KEY, rankData);
  }, [rankData]);

  function handleTaskComplete(count) {
    setStats(function(prev) {
      var today = new Date().toDateString();
      var days = (prev.daysActive || []).slice();
      if (days.indexOf(today) === -1) days.push(today);
      return Object.assign({}, prev, {
        totalTasksDone: (prev.totalTasksDone || 0) + count,
        daysActive: days,
      });
    });
  }

  if (isBooting) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  if (!userDataVal) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={function(data) {
          setUserData(data);
          setupDailyReminder();
        }} />
      </View>
    );
  }

  if (dmFriend) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        {React.createElement(DMScreen, {
          friend: dmFriend,
          userData: userDataVal,
          onBack: function() { setDmFriend(null); }
        })}
      </View>
    );
  }

  var screen = null;
  if (activeTabVal === 'dream') {
    screen = React.createElement(DreamScreen, { userData: userDataVal, streak: streakVal, onStreakUpdate: setStreak });
  } else if (activeTabVal === 'todo') {
    screen = React.createElement(TodoScreen, {
      userData: userDataVal,
      streak: streakVal,
      onStreakUpdate: setStreak,
      cachedRoadmap: cachedRoadmap,
      onRoadmapGenerated: setCachedRoadmap,
      onTaskComplete: handleTaskComplete,
      rankData: rankData,
      onRankUpdate: setRankData,
      onOpenCoach: function() { setActiveTab('coach'); },  // ← コーチタブに飛ぶ
    });
  } else if (activeTabVal === 'friends') {
    screen = React.createElement(FriendsScreen, {
      userData: userDataVal,
      onOpenDM: function(friend) { setDmFriend(friend); }
    });
  } else if (activeTabVal === 'coach') {
    screen = React.createElement(CoachScreen, { userData: userDataVal });
  } else if (activeTabVal === 'profile') {
    screen = React.createElement(ProfileScreen, {
      userData: userDataVal,
      streak: streakVal,
      stats: stats,
      onUpdate: function(newData) { setUserData(newData); }
    });
  }

  // safe area: ホームバーがあるデバイスはinsets.bottom、ないデバイスは最低8px
  var tabBarPaddingBottom = Math.max(insets.bottom, 8);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.body}>{screen}</View>
      {!webKbVisible && (
        <View style={[styles.tabBar, { paddingBottom: tabBarPaddingBottom }]}>
          {TABS.map(function(tab) {
            var isActive = activeTabVal === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabBtn}
                onPress={function() { setActiveTab(tab.key); }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isActive ? tab.icon : tab.iconOff}
                  size={26}
                  color={isActive ? '#000000' : MUTED}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── App: SafeAreaProvider でラップするだけ ────────────────────────────────────
function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

var styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: TAB_BG,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 8,
    // paddingBottom は動的に tabBarPaddingBottom で上書き
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4 },
  tabLabel: { fontSize: 10, color: MUTED, fontWeight: '500', marginTop: 1 },
  tabLabelActive: { color: '#000000', fontWeight: '700' },
});

export default Sentry.wrap(App);
