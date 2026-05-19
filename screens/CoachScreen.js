import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COMMUNITY_USERS } from '../constants/data';

var API_URL = 'https://cu-tomoshibi.vercel.app/api/chat';

var QUICK = ['やる気が出ない😔', '習慣を続けるコツは？', '夢への進め方がわからない', '不安で一歩が出ない'];

// マークダウンを整形してシンプルなテキストにする
function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')   // **太字** → 太字
    .replace(/\*(.*?)\*/g, '$1')        // *斜体* → 斜体
    .replace(/^#{1,3}\s+/gm, '')        // ### 見出し → 削除
    .replace(/^- /gm, '• ')            // - 箇条書き → •
    .replace(/^\d+\.\s+/gm, '• ')      // 1. 番号付き → •
    .trim();
}

// テキストを改行で分割して表示するコンポーネント
function FormattedText(props) {
  var text = formatMessage(props.text || '');
  var style = props.style;
  var lines = text.split('\n');
  return React.createElement(View, { style: { gap: 4 } },
    lines.map(function(line, i) {
      if (!line.trim()) return React.createElement(View, { key: i, style: { height: 4 } });
      return React.createElement(Text, { key: i, style: style }, line);
    })
  );
}

async function callClaude(history, userData) {
  var messages = history.filter(function(m) { return m.role !== 'loading'; }).map(function(m) {
    return { role: m.role === 'user' ? 'user' : 'assistant', content: m.text };
  });

  var res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages, userData: userData }),
  });

  if (!res.ok) throw new Error('API error: ' + res.status);
  var data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

import { loadStorage, saveStorage } from '../utils/storage';

var COACH_HISTORY_KEY = 'tomoshibi_coach_history';

export default function CoachScreen(props) {
  var userData = props.userData;

  var defaultMsg = [{ role: 'bot', text: 'こんにちは！AIコーチです🤖\n「' + (userData.dream || '') + '」という夢、一緒にかなえましょう。\n何でも話しかけてください！' }];

  var sm = useState(defaultMsg);
  var msgs = sm[0];
  var setMsgs = sm[1];

  // 起動時に会話履歴をロード
  useEffect(function() {
    loadStorage(COACH_HISTORY_KEY).then(function(saved) {
      if (saved && saved.length > 0) setMsgs(saved);
    });
  }, []);

  var si = useState('');
  var input = si[0];
  var setInput = si[1];

  var sl = useState(false);
  var loading = sl[0];
  var setLoading = sl[1];

  var scrollRef = useRef(null);

  // 会話履歴を自動保存（最新50件まで）
  useEffect(function() {
    var toSave = msgs.filter(function(m) { return m.role !== 'loading'; }).slice(-50);
    saveStorage(COACH_HISTORY_KEY, toSave);
  }, [msgs]);

  function scrollDown() {
    setTimeout(function() {
      if (scrollRef.current) scrollRef.current.scrollToEnd({ animated: true });
    }, 120);
  }

  async function send(text) {
    var msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    var newMsgs = msgs.concat([{ role: 'user', text: msg }]);
    setMsgs(newMsgs);
    setLoading(true);
    scrollDown();

    try {
      var reply = await callClaude(newMsgs, userData);
      setMsgs(newMsgs.concat([{ role: 'bot', text: reply }]));
    } catch (e) {
      setMsgs(newMsgs.concat([{ role: 'bot', text: '少し調子が悪いみたいです😅 もう一度話しかけてみてください！' }]));
    } finally {
      setLoading(false);
      scrollDown();
    }
  }

  return React.createElement(View, { style: s.root },
    React.createElement(View, { style: s.header },
      React.createElement(View, { style: s.hRow },
        React.createElement(View, { style: s.avatar },
          React.createElement(Text, { style: { fontSize: 20 } }, '🤖')
        ),
        React.createElement(View, null,
          React.createElement(Text, { style: s.hTitle }, 'コーチ'),
          React.createElement(Text, { style: s.hSub }, 'Claude AI powered')
        )
      )
    ),

    React.createElement(KeyboardAvoidingView, {
      style: { flex: 1 },
      behavior: Platform.OS === 'ios' ? 'padding' : 'height'
    },
      React.createElement(ScrollView, {
        ref: scrollRef,
        style: { flex: 1 },
        contentContainerStyle: s.content,
        showsVerticalScrollIndicator: false
      },
        // Community insight
        React.createElement(View, { style: s.insightCard },
          React.createElement(Text, { style: s.insightTitle }, '🌏 コミュニティの今'),
          COMMUNITY_USERS.slice(0, 3).map(function(u) {
            return React.createElement(View, { key: u.id, style: s.insightRow },
              React.createElement(Text, { style: { fontSize: 16, lineHeight: 22 } }, u.emoji),
              React.createElement(Text, { style: s.insightTxt },
                React.createElement(Text, { style: s.insightName }, u.name),
                'さんは「' + u.dream.slice(0, 18) + '」に向けて🔥' + u.streak + '日継続中'
              )
            );
          })
        ),

        // Messages
        msgs.map(function(msg, i) {
          return React.createElement(View, {
            key: i,
            style: msg.role === 'user' ? s.bubbleUser : s.bubbleBot
          },
            msg.role === 'bot' && React.createElement(Text, { style: s.botLabel }, '🤖 コーチ'),
            msg.role === 'bot'
              ? React.createElement(FormattedText, { text: msg.text, style: s.bubbleBotTxt })
              : React.createElement(Text, { style: s.bubbleUserTxt }, msg.text)
          );
        }),

        // Loading indicator
        loading && React.createElement(View, { style: s.bubbleBot },
          React.createElement(Text, { style: s.botLabel }, '🤖 コーチ'),
          React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 8 } },
            React.createElement(ActivityIndicator, { size: 'small', color: '#F97316' }),
            React.createElement(Text, { style: [s.bubbleBotTxt, { color: '#94A3B8' }] }, '考え中...')
          )
        ),

        // Quick prompts
        msgs.length < 3 && React.createElement(View, { style: s.quickSec },
          React.createElement(Text, { style: s.quickTitle }, 'こんな悩みはありますか？'),
          React.createElement(View, { style: s.quickGrid },
            QUICK.map(function(q, i) {
              return React.createElement(TouchableOpacity, {
                key: i,
                style: s.quickChip,
                onPress: function() { send(q); }
              },
                React.createElement(Text, { style: s.quickTxt }, q)
              );
            })
          )
        ),

        React.createElement(View, { style: { height: 20 } })
      ),

      React.createElement(View, { style: s.inputRow },
        React.createElement(TextInput, {
          style: s.input,
          value: input,
          onChangeText: setInput,
          placeholder: '悩みや質問を入力...',
          placeholderTextColor: '#94A3B8',
          multiline: true,
          numberOfLines: 1,
          editable: !loading
        }),
        React.createElement(TouchableOpacity, {
          style: [s.sendBtn, (!input.trim() || loading) && s.sendOff],
          onPress: function() { send(); },
          disabled: !input.trim() || loading
        },
          loading
            ? React.createElement(ActivityIndicator, { size: 'small', color: '#fff' })
            : React.createElement(Ionicons, { name: 'arrow-up', size: 20, color: '#fff' })
        )
      )
    )
  );
}

var s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F8F8F8', alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontSize: 17, fontWeight: '700', color: '#000000' },
  hSub: { fontSize: 11, color: '#A3A3A3', marginTop: 1 },
  content: { flexGrow: 1, justifyContent: 'flex-end', padding: 16, gap: 12 },
  insightCard: { backgroundColor: '#F8F8F8', borderRadius: 14, padding: 14, gap: 8 },
  insightTitle: { fontSize: 12, fontWeight: '700', color: '#737373', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.8 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  insightTxt: { flex: 1, fontSize: 12, color: '#737373', lineHeight: 19 },
  insightName: { color: '#F97316', fontWeight: '700' },
  bubbleBot: { alignSelf: 'flex-start', backgroundColor: '#F8F8F8', borderRadius: 18, borderBottomLeftRadius: 4, padding: 14, maxWidth: '90%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#000000', borderRadius: 18, borderBottomRightRadius: 4, padding: 14, maxWidth: '90%' },
  botLabel: { fontSize: 10, color: '#F97316', fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  bubbleBotTxt: { color: '#000000', fontSize: 13, lineHeight: 20 },
  bubbleUserTxt: { color: '#fff', fontSize: 13, lineHeight: 20 },
  quickSec: { gap: 8 },
  quickTitle: { fontSize: 12, fontWeight: '600', color: '#A3A3A3' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { backgroundColor: '#F8F8F8', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  quickTxt: { color: '#000000', fontSize: 12, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 12, paddingRight: 16, paddingVertical: 10, paddingBottom: 24, gap: 10, backgroundColor: '#FFFFFF', borderTopWidth: 0.5, borderTopColor: '#F0F0F0' },
  input: { flex: 1, backgroundColor: '#F8F8F8', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: '#000000', fontSize: 16, maxHeight: 120, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendOff: { opacity: 0.35 },
});
