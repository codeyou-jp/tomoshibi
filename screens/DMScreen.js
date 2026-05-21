import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

var PRIMARY = '#F97316';
var BLACK   = '#000000';
var WHITE   = '#FFFFFF';
var BG      = '#FFFFFF';
var BORDER  = '#F0F0F0';
var MUTED   = '#A3A3A3';
var TEXT    = '#000000';
var BUBBLE_BG = '#F5F5F5';

// Mock initial messages per friend
var MOCK_MESSAGES = {
  u1: [
    { id: 'm1', from: 'them', text: 'おつかれ！今日のデザイン作業どうだった？', time: '14:20' },
    { id: 'm2', from: 'me',   text: 'めちゃよかった！Figmaで新しいコンポーネント作れた', time: '14:22' },
    { id: 'm3', from: 'them', text: 'すごい！見せて〜🎨', time: '14:23' },
  ],
  u2: [
    { id: 'm1', from: 'them', text: 'MVP完成おめでとう！来週リリースだっけ？', time: '11:05' },
    { id: 'm2', from: 'me',   text: 'ありがとう！緊張するわ笑', time: '11:10' },
  ],
  u3: [
    { id: 'm1', from: 'them', text: '今日のストリーク21日目！お互いがんばろうね', time: '09:00' },
  ],
  u4: [
    { id: 'm1', from: 'them', text: 'よろしく！同じ夢追ってる仲間として応援してるよ', time: '昨日' },
  ],
  u5: [
    { id: 'm1', from: 'them', text: '連続30日達成したよ！！🔥', time: '8:30' },
    { id: 'm2', from: 'me',   text: 'やばい！すごすぎる！！おめでとう🎉', time: '8:45' },
    { id: 'm3', from: 'them', text: 'ありがとう、あなたのフィード見て毎日刺激もらってます', time: '8:46' },
  ],
};

var AUTO_REPLIES = [
  'いいね！頑張ってるね🔥',
  'それ最高だわ！',
  'わかる〜！一緒に頑張ろう',
  'すごい！その調子！',
  '応援してるよ✨',
  'マジで？！それやばいね',
];

function formatTime() {
  var now = new Date();
  return now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
}

export default function DMScreen(props) {
  var friend   = props.friend;
  var onBack   = props.onBack;
  var userData = props.userData;

  var insets = useSafeAreaInsets();
  var initMsgs = MOCK_MESSAGES[friend.id] || [];

  var sm = React.useState(initMsgs);
  var messages  = sm[0];
  var setMessages = sm[1];

  var si = React.useState('');
  var inputText  = si[0];
  var setInputText = si[1];


  var flatRef = React.useRef(null);

  var scaleAnim = React.useRef(new Animated.Value(1)).current;

  function scrollDown() {
    setTimeout(function() {
      if (flatRef.current) flatRef.current.scrollToEnd({ animated: true });
    }, 100);
  }

  function sendMessage() {
    var text = inputText.trim();
    if (!text) return;

    // Send button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
    ]).start();

    var newMsg = { id: 'm' + Date.now(), from: 'me', text: text, time: formatTime() };
    setMessages(function(prev) { return prev.concat([newMsg]); });
    setInputText('');
    scrollDown();

    // Mock auto-reply
    setTimeout(function() {
      var reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      setMessages(function(prev) {
        return prev.concat([{ id: 'm' + Date.now(), from: 'them', text: reply, time: formatTime() }]);
      });
      scrollDown();
    }, 1200);
  }

  function renderMessage(info) {
    var msg  = info.item;
    var isMe = msg.from === 'me';
    return React.createElement(View, { style: [s.msgRow, isMe && s.msgRowMe] },
      !isMe && React.createElement(View, { style: s.msgAvatar },
        React.createElement(Text, { style: s.msgAvatarText }, friend.displayName.charAt(0))
      ),
      React.createElement(View, { style: { maxWidth: '72%' } },
        React.createElement(View, { style: [s.bubble, isMe ? s.bubbleMe : s.bubbleThem] },
          React.createElement(Text, { style: [s.bubbleTxt, isMe && s.bubbleTxtMe] }, msg.text)
        ),
        React.createElement(Text, { style: [s.msgTime, isMe && s.msgTimeMe] }, msg.time)
      )
    );
  }

  return React.createElement(View, { style: s.root },

    // ── Header ──
    React.createElement(View, { style: [s.header, { paddingTop: insets.top + 12 }] },
      React.createElement(TouchableOpacity, { style: s.backBtn, onPress: onBack, activeOpacity: 0.7 },
        React.createElement(Ionicons, { name: 'arrow-back', size: 22, color: WHITE })
      ),
      React.createElement(View, { style: s.headerCenter },
        React.createElement(View, { style: s.headerAvatar },
          React.createElement(Text, { style: s.headerAvatarText }, friend.displayName.charAt(0))
        ),
        React.createElement(View, { style: { flex: 1 } },
          React.createElement(Text, { style: s.headerName }, friend.displayName),
          React.createElement(Text, { style: s.headerDream, numberOfLines: 1 }, friend.dream)
        )
      ),
      React.createElement(View, { style: s.streakPill },
        React.createElement(Text, { style: s.streakPillTxt }, '🔥' + friend.streak)
      )
    ),

    // ── Messages + Input ──
    React.createElement(KeyboardAvoidingView, {
      style: { flex: 1 },
      behavior: Platform.OS === 'ios' ? 'padding' : undefined,
      keyboardVerticalOffset: 0,
    },
      React.createElement(FlatList, {
        ref: flatRef,
        style: { flex: 1 },
        data: messages,
        keyExtractor: function(item) { return item.id; },
        renderItem: renderMessage,
        contentContainerStyle: s.listContent,
        showsVerticalScrollIndicator: false,
        onLayout: function() {
          if (flatRef.current && messages.length > 0) {
            flatRef.current.scrollToEnd({ animated: false });
          }
        },
        ListHeaderComponent: React.createElement(View, { style: s.dateSep },
          React.createElement(Text, { style: s.dateSepTxt }, '今日')
        ),
      }),

      // ── Input bar ──
      React.createElement(View, { style: s.inputBar },
        React.createElement(TextInput, {
          style: [s.input, { height: Math.min(Math.max(44, ((inputText.match(/\n/g) || []).length + 1) * 24 + 20), 120) }],
          value: inputText,
          onChangeText: setInputText,
          placeholder: 'メッセージを入力...',
          placeholderTextColor: MUTED,
          multiline: true,
          returnKeyType: 'default',
        }),
        React.createElement(Animated.View, { style: { transform: [{ scale: scaleAnim }] } },
          React.createElement(TouchableOpacity, {
            style: [s.sendBtn, !inputText.trim() && s.sendBtnOff],
            onPress: sendMessage,
            disabled: !inputText.trim(),
            activeOpacity: 0.85,
          },
            React.createElement(Ionicons, { name: 'arrow-up', size: 20, color: WHITE })
          )
        )
      )
    )
  );
}

var s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    paddingBottom: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BLACK,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 15, fontWeight: '800', color: WHITE },
  headerName: { fontSize: 15, fontWeight: '700', color: WHITE },
  headerDream: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  streakPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
  },
  streakPillTxt: { color: WHITE, fontSize: 12, fontWeight: '700' },

  // List
  listContent: { padding: 16, gap: 10, paddingBottom: 8 },
  dateSep: { alignItems: 'center', marginBottom: 10 },
  dateSepTxt: {
    fontSize: 11, color: MUTED,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,
  },

  // Message rows
  msgRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E8E8E8',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  msgAvatarText: { fontSize: 12, fontWeight: '800', color: BLACK },

  // Bubbles
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe:   { backgroundColor: BLACK, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: BUBBLE_BG, borderBottomLeftRadius: 4 },
  bubbleTxt:   { fontSize: 14, color: BLACK, lineHeight: 20 },
  bubbleTxtMe: { color: WHITE },
  msgTime:   { fontSize: 10, color: MUTED, marginTop: 3, marginLeft: 4 },
  msgTimeMe: { textAlign: 'right', marginRight: 4 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 24,
    backgroundColor: WHITE,
    borderTopWidth: 0.5, borderTopColor: BORDER,
  },
  input: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 11,
    fontSize: 15, color: TEXT,
    minHeight: 44, maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.35 },
});
