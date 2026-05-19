import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

var TABS = [
  { key: 'dream',   label: '夢',      icon: 'star',                iconOff: 'star-outline' },
  { key: 'todo',    label: 'やること', icon: 'checkmark-circle',    iconOff: 'checkmark-circle-outline' },
  { key: 'friends', label: '友達',     icon: 'people',              iconOff: 'people-outline' },
  { key: 'coach',   label: 'コーチ',  icon: 'chatbubble-ellipses', iconOff: 'chatbubble-ellipses-outline' },
  { key: 'profile', label: '自分',     icon: 'person-circle',       iconOff: 'person-circle-outline' },
];

export default function App() {
  var s1 = useState(null);
  var s2 = useState('dream');
  var s3 = useState(0);
  var s4 = useState(null);
  var s5 = useState(null);
  var s6 = useState(true);
  var s7 = useState({ totalTasksDone: 0, joinDate: Date.now(), daysActive: [] });
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

  // 起動時にAsyncStorageから一括ロード
  useEffect(function() {
    async function boot() {
      var saved      = await loadStorage(STORAGE_KEY);
      var savedStreak = await loadStorage(STREAK_KEY);
      var savedStats  = await loadStorage(STATS_KEY);
      if (saved)       s1[1](saved);
      if (savedStreak) s3[1](savedStreak);
      if (savedStats)  s7[1](savedStats);
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
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
      </SafeAreaProvider>
    );
  }

  if (!userDataVal) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          <StatusBar style="light" />
          <OnboardingScreen onComplete={function(data) {
            setUserData(data);
            // オンボーディング完了後にデイリーリマインダーをセットアップ
            setupDailyReminder();
          }} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (dmFriend) {
    return (
      <SafeAreaProvider>
        <View style={styles.root}>
          <StatusBar style="light" />
          {React.createElement(DMScreen, {
            friend: dmFriend,
            userData: userDataVal,
            onBack: function() { setDmFriend(null); }
          })}
        </View>
      </SafeAreaProvider>
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

  return (
    <SafeAreaProvider>
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.body}>{screen}</View>
      <View style={styles.tabBar}>
        {TABS.map(function(tab) {
          var isActive = activeTabVal === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBtn}
              onPress={function() { setActiveTab(tab.key); }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.icon : tab.iconOff}
                size={24}
                color={isActive ? '#000000' : MUTED}
              />
              {isActive && <View style={styles.tabDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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
    paddingTop: 10,
    paddingBottom: 16,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#F97316' },
});
