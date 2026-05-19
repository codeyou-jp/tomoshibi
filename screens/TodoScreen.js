import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RANKS, RANK_TEST_QUESTIONS, getRankFromStreak } from '../constants/data';

var API_URL = 'https://hi-backend.vercel.app/api/chat';

var ORANGE = '#F97316';
var BLACK  = '#000000';
var GRAY1  = '#737373';
var GRAY2  = '#A3A3A3';
var SEP    = '#F0F0F0';
var GREEN  = '#22C55E';

// ─── 4段階メッセージプール ────────────────────────────────────────────────────
//
// [1] 基礎の途中（6個中ランダム1個で発火）
var MSGS_BASIC_MID = [
  '着実に。\n基礎が全部できたら、次が見えてくる。',
  'ここが土台。\n積み重ねが、いつか全部繋がる。',
  '日々の基礎を制する者が、\n夢も制する。',
  'これが積み重ねの正体。\n毎日少しずつ、確実に。',
  '地味に見えて、\n一番大事なことをやってる。',
];
// [2] 基礎全完了（CHALLENGEが解放される瞬間）
var MSGS_BASIC_COMPLETE = [
  '基礎、全部クリア。\nここからが本番だ🔥',
  '土台が完成した。\nCHALLENGEが解放されたよ。',
  '6個やりきった。\n続けてきたから、ここにいる。',
  '基礎を制した。\nさあ、一段上へ。',
];
// [3] CHALLENGEの途中（4個中ランダム1個で発火）
var MSGS_CHALLENGE_MID = [
  'CHALLENGEをやりきってる。\n{dream}が、また近くなった。',
  '難しいのにやった。\nその事実は消えない。',
  'ここまで来る人は少ない。\n本当に。',
  'これ、できる人は少ない。\nあなたはその一人。',
];
// [4] CHALLENGE全完了（今日の締め）
var MSGS_CHALLENGE_COMPLETE = [
  '全部やった。\n今日の自分、最高だよ。',
  '基礎からCHALLENGEまで全制覇。\n{streak}日目もやりきった。',
  'これが習慣になった日、\n夢が現実に変わり始める。',
  '今日のあなたは、\n昨日のあなたを超えた。',
];

// ─── RewardToast ─────────────────────────────────────────────────────────────
function RewardToast({ message, onDismiss }) {
  var ty = useRef(new Animated.Value(100)).current;
  var op = useRef(new Animated.Value(0)).current;

  useEffect(function() {
    Animated.parallel([
      Animated.spring(ty, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 7 }),
      Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    var timer = setTimeout(dismiss, 3800);
    return function() { clearTimeout(timer); };
  }, []);

  function dismiss() {
    Animated.parallel([
      Animated.timing(ty, { toValue: 80, duration: 220, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(function() { onDismiss(); });
  }

  return (
    <Animated.View style={[s.toastWrap, { transform: [{ translateY: ty }], opacity: op }]}>
      <TouchableOpacity onPress={dismiss} activeOpacity={0.88} style={s.toast}>
        <View style={s.toastAccent} />
        <Text style={s.toastText}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ width, height, radius, style }) {
  var anim = useRef(new Animated.Value(0.4)).current;
  useEffect(function() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[{
      width: width || '100%', height: height || 16,
      backgroundColor: '#E8E8E8', borderRadius: radius || 8, opacity: anim,
    }, style]} />
  );
}

function SkeletonScreen() {
  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 28, gap: 28 }}>
      <View style={{ gap: 10 }}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="80%" height={40} radius={10} />
      </View>
      <View style={{ height: 0.5, backgroundColor: SEP }} />
      <View style={{ gap: 12 }}>
        <Skeleton width="30%" height={11} />
        <Skeleton height={18} radius={6} />
        <Skeleton height={18} radius={6} />
        <Skeleton width="70%" height={18} radius={6} />
      </View>
      <View style={{ height: 0.5, backgroundColor: SEP }} />
      <View style={{ gap: 12 }}>
        <Skeleton width="35%" height={11} />
        <Skeleton height={18} radius={6} />
        <Skeleton height={18} radius={6} />
        <Skeleton width="60%" height={18} radius={6} />
      </View>
    </View>
  );
}

// ─── Press animation ──────────────────────────────────────────────────────────
function PressRow({ onPress, style, children }) {
  var scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={function() { Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start(); }}
        onPressOut={function() { Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start(); }}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── API ─────────────────────────────────────────────────────────────────────
function isGoalType(dream) {
  return /\d+年|\d+ヶ月|\d+か月|\d+週|までに|以内|合格|受験|試験|資格|検定/.test(dream || '');
}

var SPANS_DREAM = [
  { key: 'life',    label: '人生の夢',  color: '#8B5CF6' },
  { key: 'years10', label: '10年後',   color: '#6366F1' },
  { key: 'years5',  label: '5年後',    color: '#3B82F6' },
  { key: 'year1',   label: '1年後',    color: '#0EA5E9' },
  { key: 'months6', label: '6ヶ月後',  color: '#10B981' },
  { key: 'months3', label: '3ヶ月後',  color: '#22C55E' },
  { key: 'month1',  label: '今月',     color: '#84CC16' },
  { key: 'weeks2',  label: '2週間後',  color: '#EAB308' },
  { key: 'week1',   label: '今週',     color: ORANGE },
];
var SPANS_GOAL = [
  { key: 'life',    label: '最終目標',     color: '#8B5CF6' },
  { key: 'years10', label: '達成後10年',  color: '#6366F1' },
  { key: 'years5',  label: '達成後5年',   color: '#3B82F6' },
  { key: 'year1',   label: '1年後の基準', color: '#0EA5E9' },
  { key: 'months6', label: '6ヶ月の成果', color: '#10B981' },
  { key: 'months3', label: '3ヶ月の到達', color: '#22C55E' },
  { key: 'month1',  label: '今月のゴール',color: '#84CC16' },
  { key: 'weeks2',  label: '2週間の成果', color: '#EAB308' },
  { key: 'week1',   label: '今週のゴール',color: ORANGE },
];

var TIERS = [
  { key: 'easy',      label: 'MUST',      color: GREEN,     desc: '必ずやる' },
  { key: 'necessary', label: 'SHOULD',    color: '#3B82F6', desc: '頑張ってこなす' },
  { key: 'advanced',  label: 'CHALLENGE', color: ORANGE,    desc: '達成できたら最高' },
];

var FALLBACK = {
  life: '自分の力で人々の人生をより良くする', years10: '業界をリードする起業家になる',
  years5: '年商1億円のビジネスを作る', year1: '最初のプロダクトをローンチ',
  months6: 'MVP完成・最初の10人を獲得', months3: 'プロトタイプ完成',
  month1: '核となる機能の開発開始', weeks2: '競合調査完了・技術選定',
  week1: '毎日2時間の学習タイムを確保する',
  easy: ['今日の夢を声に出して言う', '今日のルーティンを1つこなす', '明日の最優先タスクを決める'],
  necessary: ['集中して作業する（25分）', '夢に向けた一歩を踏み出す', '今日学んだことをメモする'],
  advanced: ['新しいスキルを30分学ぶ', '夢に関係する人に連絡', '来週の計画を立てる', 'アイデアを文章にまとめる'],
};

async function generateRoadmap(userData, streak) {
  var dream = userData.dream || '';
  var isGoal = /\d+年|\d+ヶ月|\d+か月|\d+週|までに|以内|合格|受験|試験|資格|検定/.test(dream);
  var timeframeNote = userData.timeframe ? '達成期間: ' + userData.timeframe + '\n' : '';
  var modeNote = userData.mode === 'busy' ? '忙しい（1タスク15〜30分以内）' : '余裕あり（1タスク1時間以内）';

  // ランクに応じたTodo難易度ガイド
  var currentRank = getRankFromStreak(streak || 0);
  var rankGuide = {
    novice:       '【初歩ランク】超初心者向け。5〜15分でできる最小の行動。まず習慣をつけることが最優先。',
    basic:        '【基礎ランク】初級者向け。30分以内。基礎スキルを固める具体的な行動。',
    intermediate: '【中級ランク】中級者向け。1時間程度。本格的で実践的な取り組み。',
    advanced:     '【上級ランク】上級者向け。2時間程度。深い専門性が求められる挑戦的なタスク。',
    expert:       '【応用ランク】プロレベル。実践・発信・教える立場になる行動。',
  }[currentRank.key] || '';

  var todoRules = [
    rankGuide,
    '【Todoの絶対ルール】',
    '・今日1日で完了できる具体的な行動にすること',
    '・「〇〇する」という動詞で終わる形にする（「〇〇の構築」「〇〇作り」はNG）',
    '・抽象的な概念（人脈作り・スキル習得・能力構築など）は禁止',
    '・easy: 毎日続けられるシンプルな習慣（例：「関連ニュースを1本読む」「今日の学びをメモする」）',
    '・necessary: 具体的に取り組める行動（例：「YouTubeで〇〇の入門動画を1本見る」「〇〇について30分調べる」）',
    '・advanced: 少し頑張れば今日できること（例：「〇〇についてノートにまとめる」「〇〇の無料体験に登録する」）',
    '・モード: ' + modeNote,
  ].join('\n');

  var prompt = isGoal
    ? '以下は期限付きの目標です。逆算して現実的なロードマップと今日のTodoを生成してください。\n\n目標: ' + dream + '\n' + timeframeNote + '動機: ' + (userData.needs || '') + '\nロールモデル: ' + (userData.model ? userData.model.name : 'なし') + '\n\n' + todoRules + '\n\n各項目は20文字以内。JSON以外不要。\n{"life":"〜","years10":"〜","years5":"〜","year1":"〜","months6":"〜","months3":"〜","month1":"〜","weeks2":"〜","week1":"〜","easy":["〜","〜","〜"],"necessary":["〜","〜","〜"],"advanced":["〜","〜","〜","〜"]}'
    : '以下のユーザー情報をもとに夢を実現するためのロードマップと今日のTodoを生成してください。\n\n夢: ' + dream + '\n' + timeframeNote + '動機: ' + (userData.needs || '') + '\nロールモデル: ' + (userData.model ? userData.model.name : 'なし') + '\n\n' + todoRules + '\n\n各項目20文字以内。JSON以外不要。\n{"life":"〜","years10":"〜","years5":"〜","year1":"〜","months6":"〜","months3":"〜","month1":"〜","weeks2":"〜","week1":"〜","easy":["〜","〜","〜"],"necessary":["〜","〜","〜"],"advanced":["〜","〜","〜","〜"]}';

  var res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], userData: {} }) });
  var data = await res.json();
  var match = ((data && data.text) || '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error('parse');
  return JSON.parse(match[0]);
}

async function updateWithChat(userMsg, roadmap, chatHistory, userData) {
  var history = chatHistory.filter(function(m) { return m.role !== 'loading'; }).map(function(m) { return { role: m.role === 'user' ? 'user' : 'assistant', content: m.text }; });

  // systemOverride でバックエンドのシステムプロンプトを上書きし、REPLY:/JSON: 形式を強制
  var systemOverride = 'あなたはTodoリストを一緒に考えるAIアシスタントです。ユーザーの夢に寄り添いながら、ロードマップとTodoリストを更新します。\n\nユーザーの夢: ' + (userData.dream || '') + '\n\n現在のロードマップ：\n' + JSON.stringify(roadmap, null, 2) + '\n\n【返答ルール】\n- ユーザーの気持ちに共感し、フレンドリーな日本語で話す\n- 必ず以下のフォーマットで返すこと（他の形式は不可）:\n\nREPLY: （ユーザーへの一言。共感・励まし。1〜2文、絵文字1個まで）\nJSON: （ロードマップ全体のJSON。life/years10/years5/year1/months6/months3/month1/weeks2/week1/easy(3個)/necessary(3個)/advanced(4個)を必ず含む）\n\n※JSON以外の余計な説明は不要。フォーマット厳守。';

  var messages = history.concat([{ role: 'user', content: userMsg }]);
  var res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: messages, userData: userData, systemOverride: systemOverride }) });
  var data = await res.json();
  var text = (data && data.text) || '';
  var replyMatch = text.match(/REPLY:\s*(.+?)(?=JSON:|$)/s);
  var jsonMatch = text.match(/JSON:\s*(\{[\s\S]*\})/);
  var reply = replyMatch ? replyMatch[1].trim() : '';
  // replyが空の場合はtextからJSONを除いた部分を使う
  if (!reply && text) {
    reply = text.replace(/JSON:\s*\{[\s\S]*\}/, '').replace(/REPLY:\s*/, '').trim().slice(0, 80) || 'ロードマップを更新したよ！';
  }
  var newRoadmap = roadmap;
  if (jsonMatch) { try { newRoadmap = JSON.parse(jsonMatch[1]); } catch (e) {} }
  return { reply: reply, roadmap: newRoadmap };
}

// ─── 段階突破試験モーダル ─────────────────────────────────────────────────────
function BreakthroughTestModal({ visible, rankKey, streak, userData, onPass, onClose }) {
  var [phase, setPhase] = useState('questions'); // questions | evaluating | pass | fail
  var [currentQ, setCurrentQ] = useState(0);
  var [answers, setAnswers] = useState(['', '', '']);
  var [feedback, setFeedback] = useState('');
  var slideAnim = useRef(new Animated.Value(800)).current;

  var rank = RANKS.find(function(r) { return r.key === rankKey; }) || RANKS[0];
  var nextRank = RANKS[RANKS.findIndex(function(r) { return r.key === rankKey; }) + 1];

  var rawQs = RANK_TEST_QUESTIONS[rankKey] || RANK_TEST_QUESTIONS.novice;
  var questions = rawQs.map(function(q) { return q.replace('{dream}', (userData && userData.dream) || '夢'); });

  useEffect(function() {
    if (visible) {
      setPhase('questions');
      setCurrentQ(0);
      setAnswers(['', '', '']);
      setFeedback('');
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 800, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  async function evaluate() {
    setPhase('evaluating');
    try {
      var qa = questions.map(function(q, i) { return 'Q' + (i + 1) + ': ' + q + '\nA' + (i + 1) + ': ' + answers[i]; }).join('\n\n');
      var prompt = '以下は段階突破試験の回答です。ユーザーが「' + rank.label + '」ランクから「' + (nextRank ? nextRank.label : '応用') + '」ランクに進む準備ができているか判定してください。\n\n夢: ' + (userData && userData.dream || '') + '\n\n' + qa + '\n\n【判定基準】回答が具体的で誠実であればPASS。短すぎたり「わからない」だけならFAIL。\n必ず「PASS: （一言）」または「FAIL: （一言アドバイス）」の形式で返してください。';
      var res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], userData: {} }),
      });
      var data = await res.json();
      var text = (data && data.text) || '';
      if (text.includes('PASS')) {
        var msg = text.replace(/PASS:\s*/i, '').trim();
        setFeedback(msg);
        setPhase('pass');
      } else {
        var msg = text.replace(/FAIL:\s*/i, '').trim();
        setFeedback(msg || 'もう少し具体的に取り組んでみよう。また挑戦できるよ！');
        setPhase('fail');
      }
    } catch (e) {
      // エラー時はパスにする（ユーザー体験優先）
      setFeedback('よく頑張った！次のステージへ進もう。');
      setPhase('pass');
    }
  }

  function handleAnswer(text) {
    var next = answers.slice();
    next[currentQ] = text;
    setAnswers(next);
  }

  function handleNext() {
    if (currentQ < 2) {
      setCurrentQ(currentQ + 1);
    } else {
      evaluate();
    }
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent presentationStyle="overFullScreen">
      <View style={bt.overlay}>
        <TouchableOpacity style={bt.backdrop} activeOpacity={1} onPress={phase === 'pass' || phase === 'fail' ? onClose : undefined} />
        <Animated.View style={[bt.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle */}
          <View style={bt.handle} />

          {/* Header */}
          <View style={[bt.rankBanner, { backgroundColor: rank.bg }]}>
            <Text style={bt.rankBannerEmoji}>{rank.emoji}</Text>
            <View>
              <Text style={[bt.rankBannerLabel, { color: rank.color }]}>段階突破試験</Text>
              <Text style={bt.rankBannerSub}>{rank.label} → {nextRank ? nextRank.label : '応用'}</Text>
            </View>
          </View>

          {/* Content by phase */}
          {phase === 'questions' && (
            <View style={bt.body}>
              <View style={bt.qProgress}>
                {[0, 1, 2].map(function(i) {
                  return <View key={i} style={[bt.qDot, i <= currentQ && { backgroundColor: rank.color }]} />;
                })}
                <Text style={bt.qNum}>問{currentQ + 1} / 3</Text>
              </View>
              <Text style={bt.question}>{questions[currentQ]}</Text>
              <TextInput
                style={bt.answerInput}
                value={answers[currentQ]}
                onChangeText={handleAnswer}
                placeholder="正直に答えてみよう..."
                placeholderTextColor="#A3A3A3"
                multiline
                numberOfLines={4}
                autoFocus
              />
              <TouchableOpacity
                style={[bt.nextBtn, { backgroundColor: rank.color }, answers[currentQ].trim().length < 10 && bt.nextBtnOff]}
                onPress={handleNext}
                disabled={answers[currentQ].trim().length < 10}
              >
                <Text style={bt.nextBtnTxt}>{currentQ < 2 ? '次の問題へ →' : '判定する'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'evaluating' && (
            <View style={[bt.body, bt.center]}>
              <ActivityIndicator size="large" color={rank.color} />
              <Text style={bt.evalTxt}>AIが判定中...</Text>
            </View>
          )}

          {phase === 'pass' && (
            <View style={[bt.body, bt.center]}>
              <Text style={bt.resultEmoji}>{nextRank ? nextRank.emoji : '👑'}</Text>
              <Text style={bt.resultTitle}>突破！</Text>
              <Text style={[bt.resultRank, { color: nextRank ? nextRank.color : '#EAB308' }]}>
                {nextRank ? nextRank.label : '応用'} ランク解放
              </Text>
              <Text style={bt.resultFeedback}>{feedback}</Text>
              <TouchableOpacity style={[bt.nextBtn, { backgroundColor: nextRank ? nextRank.color : '#EAB308' }]} onPress={onPass}>
                <Text style={bt.nextBtnTxt}>次のステージへ 🚀</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'fail' && (
            <View style={[bt.body, bt.center]}>
              <Text style={bt.resultEmoji}>💪</Text>
              <Text style={bt.resultTitle}>もう少し！</Text>
              <Text style={bt.resultFeedback}>{feedback}</Text>
              <Text style={bt.retryTxt}>明日また挑戦できるよ</Text>
              <TouchableOpacity style={[bt.nextBtn, { backgroundColor: '#737373' }]} onPress={onClose}>
                <Text style={bt.nextBtnTxt}>続ける</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

var bt = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet:    { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 44 },
  handle:   { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 0 },
  rankBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, paddingTop: 16, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  rankBannerEmoji: { fontSize: 32 },
  rankBannerLabel: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  rankBannerSub:   { fontSize: 12, color: '#737373', marginTop: 2 },
  body:     { padding: 20, gap: 16 },
  center:   { alignItems: 'center', paddingVertical: 10 },
  qProgress: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
  qNum:     { fontSize: 11, color: '#A3A3A3', fontWeight: '600', marginLeft: 4 },
  question: { fontSize: 16, fontWeight: '700', color: '#000', lineHeight: 24 },
  answerInput: {
    backgroundColor: '#F8F8F8', borderRadius: 14, padding: 16,
    fontSize: 15, color: '#000', minHeight: 120,
    textAlignVertical: 'top', borderWidth: 1, borderColor: '#F0F0F0',
  },
  nextBtn:    { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', marginTop: 4 },
  nextBtnOff: { opacity: 0.3 },
  nextBtnTxt: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  evalTxt:    { fontSize: 14, color: '#A3A3A3', marginTop: 16 },
  resultEmoji: { fontSize: 64, marginBottom: 8 },
  resultTitle: { fontSize: 28, fontWeight: '900', color: '#000', letterSpacing: -0.5 },
  resultRank:  { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  resultFeedback: { fontSize: 14, color: '#737373', textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  retryTxt:    { fontSize: 12, color: '#A3A3A3', marginBottom: 16 },
});

// ─── 深夜リセットカウントダウン ───────────────────────────────────────────────
function useResetCountdown() {
  var [label, setLabel] = useState('');
  var [urgent, setUrgent] = useState(false);

  useEffect(function() {
    function calc() {
      var now = new Date();
      var midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0); // 翌日0:00
      var diff = midnight - now; // ms
      var h = Math.floor(diff / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var isUrgent = h < 3; // 3時間切ったら警告色
      var txt = h > 0 ? h + '時間' + m + '分でリセット' : m + '分でリセット';
      setLabel(txt);
      setUrgent(isUrgent);
    }
    calc();
    var id = setInterval(calc, 60000); // 1分ごとに更新
    return function() { clearInterval(id); };
  }, []);

  return { label: label, urgent: urgent };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TodoScreen({ userData, streak, onStreakUpdate, cachedRoadmap, onRoadmapGenerated, onTaskComplete, rankData, onRankUpdate }) {
  var insets = useSafeAreaInsets();
  var [roadmap, setRoadmap] = useState(cachedRoadmap || null);
  var [checked, setChecked] = useState({});
  var [isGenerating, setIsGenerating] = useState(!cachedRoadmap);
  var [showRoadmap, setShowRoadmap] = useState(false);
  var [chatInput, setChatInput] = useState('');
  var [chatInputHeight, setChatInputHeight] = useState(44);
  var [chatHistory, setChatHistory] = useState([]);
  var [isChatLoading, setIsChatLoading] = useState(false);
  var [celebrated, setCelebrated] = useState(false);
  var [rewardMsg, setRewardMsg] = useState('');
  var [showReward, setShowReward] = useState(false);
  var [breakthroughRankKey, setBreakthroughRankKey] = useState(null); // 試験対象ランク
  var countdown = useResetCountdown();

  // 現在のランク
  var currentRank = getRankFromStreak(streak || 0);

  // ── 4段階メッセージの管理 ──────────────────────────────────────────────────
  // basicRewardId: 基礎6個のうちメッセージを出す1個のID（ロード時にランダム決定）
  // challengeRewardId: CHALLENGE4個のうちメッセージを出す1個のID
  var [rewardState, setRewardState] = useState({
    basicRewardId: null,
    challengeRewardId: null,
    shownBasicMid: false,
    shownBasicComplete: false,
    shownChallengeMid: false,
    shownChallengeComplete: false,
  });

  var pulseAnim = useRef(new Animated.Value(1)).current;
  var scrollRef = useRef(null);

  // ─── 段階突破試験トリガー ───────────────────────────────────────────────────
  // RANKS の testAt (7, 30, 90, 180) をstreakが踏んだら試験モーダルを出す
  useEffect(function() {
    if (!streak || !rankData) return;
    var rd = rankData || {};
    var shownFor = rd.testShownFor || {};
    var passedTests = rd.passedTests || {};
    // 各ランクの testAt と streak が一致 && まだパスしてない && 今日まだ表示してない
    for (var i = 0; i < RANKS.length; i++) {
      var r = RANKS[i];
      if (r.testAt && streak === r.testAt && !passedTests[r.key] && !shownFor[r.key]) {
        setBreakthroughRankKey(r.key);
        // 表示済みフラグを立てる（当日再表示しない）
        if (onRankUpdate) {
          onRankUpdate(function(prev) {
            return Object.assign({}, prev, { testShownFor: Object.assign({}, (prev.testShownFor || {}), { [r.key]: true }) });
          });
        }
        break;
      }
    }
  }, [streak]);

  // ロードマップ生成
  useEffect(function() {
    if (cachedRoadmap) return;
    generateRoadmap(userData, streak)
      .then(function(rm) { setRoadmap(rm); if (onRoadmapGenerated) onRoadmapGenerated(rm); setIsGenerating(false); })
      .catch(function() { setRoadmap(FALLBACK); setIsGenerating(false); });
  }, []);

  // ロードマップが確定したらメッセージ発火IDをランダム決定
  useEffect(function() {
    if (!roadmap) return;
    var basicIds = [];
    (roadmap.easy || []).forEach(function(_, i) { basicIds.push('e_' + i); });
    (roadmap.necessary || []).forEach(function(_, i) { basicIds.push('n_' + i); });
    var challengeIds = [];
    (roadmap.advanced || []).forEach(function(_, i) { challengeIds.push('a_' + i); });

    setRewardState({
      basicRewardId:     basicIds.length > 0     ? basicIds[Math.floor(Math.random() * basicIds.length)]         : null,
      challengeRewardId: challengeIds.length > 0 ? challengeIds[Math.floor(Math.random() * challengeIds.length)] : null,
      shownBasicMid:      false,
      shownBasicComplete: false,
      shownChallengeMid:  false,
      shownChallengeComplete: false,
    });
  }, [roadmap]);

  // allTodos 生成
  var allTodos = roadmap ? [].concat(
    (roadmap.easy || []).map(function(t, i) { return { id: 'e_' + i, text: t, tier: 'easy' }; }),
    (roadmap.necessary || []).map(function(t, i) { return { id: 'n_' + i, text: t, tier: 'necessary' }; }),
    (roadmap.advanced || []).map(function(t, i) { return { id: 'a_' + i, text: t, tier: 'advanced' }; })
  ) : [];

  // 基礎（MUST+SHOULD）とCHALLENGEを分ける
  var basicTodos     = allTodos.filter(function(t) { return t.tier !== 'advanced'; });
  var challengeTodos = allTodos.filter(function(t) { return t.tier === 'advanced'; });
  var basicDoneCount = basicTodos.filter(function(t) { return !!checked[t.id]; }).length;
  var basicAllDone   = basicTodos.length > 0 && basicDoneCount === basicTodos.length;

  // 進捗（基礎完了 = 今日の目標達成 → ストリーク）
  var done   = allTodos.filter(function(t) { return !!checked[t.id]; }).length;
  var pct    = allTodos.length > 0 ? Math.round(done / allTodos.length * 100) : 0;
  var hit75  = basicAllDone; // 基礎を全部終えたらストリーク

  var SPANS = isGoalType(userData.dream) ? SPANS_GOAL : SPANS_DREAM;

  // ストリーク更新
  useEffect(function() {
    if (hit75 && !celebrated && allTodos.length > 0) {
      setCelebrated(true);
      onStreakUpdate(function(s) { return s + 1; });
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 150, useNativeDriver: true }),
      ]).start();
    }
    if (!hit75 && celebrated) setCelebrated(false);
  }, [hit75]);

  // ── タスク完了ハンドラ（4段階メッセージ） ───────────────────────────────────
  function handleCheck(item) {
    var wasChecked = !!checked[item.id];
    var newChecked = Object.assign({}, checked);
    newChecked[item.id] = !wasChecked;
    setChecked(newChecked);
    if (!wasChecked && onTaskComplete) onTaskComplete(1);
    if (wasChecked) return; // チェックを外したときはメッセージ出さない

    // 新しい状態で基礎・CHALLENGEの完了数を計算
    var newBasicDone     = basicTodos.filter(function(t) { return !!newChecked[t.id]; }).length;
    var newChallengeDone = challengeTodos.filter(function(t) { return !!newChecked[t.id]; }).length;
    var rs = rewardState;

    // ── 優先順位：完了 > 途中（完了タスクが途中タスクと同じでも完了優先） ──

    // [2] 基礎全完了メッセージ
    if (!rs.shownBasicComplete && newBasicDone === basicTodos.length && basicTodos.length > 0) {
      var pool = MSGS_BASIC_COMPLETE;
      setRewardMsg(pool[Math.floor(Math.random() * pool.length)]);
      setShowReward(true);
      setRewardState(function(p) { return Object.assign({}, p, { shownBasicComplete: true }); });
      return;
    }

    // [1] 基礎途中メッセージ（ランダムに選ばれた1個に当たったとき）
    if (!rs.shownBasicMid && item.id === rs.basicRewardId) {
      var pool = MSGS_BASIC_MID;
      setRewardMsg(pool[Math.floor(Math.random() * pool.length)]);
      setShowReward(true);
      setRewardState(function(p) { return Object.assign({}, p, { shownBasicMid: true }); });
      return;
    }

    // [4] CHALLENGE全完了メッセージ
    if (!rs.shownChallengeComplete && newChallengeDone === challengeTodos.length && challengeTodos.length > 0) {
      var dream = (userData.dream || '').slice(0, 12);
      var pool = MSGS_CHALLENGE_COMPLETE;
      var msg = pool[Math.floor(Math.random() * pool.length)]
        .replace('{streak}', String(streak))
        .replace('{dream}', dream);
      setRewardMsg(msg);
      setShowReward(true);
      setRewardState(function(p) { return Object.assign({}, p, { shownChallengeComplete: true }); });
      return;
    }

    // [3] CHALLENGE途中メッセージ
    if (!rs.shownChallengeMid && item.id === rs.challengeRewardId) {
      var dream = (userData.dream || '').slice(0, 12);
      var pool = MSGS_CHALLENGE_MID;
      var msg = pool[Math.floor(Math.random() * pool.length)].replace('{dream}', dream);
      setRewardMsg(msg);
      setShowReward(true);
      setRewardState(function(p) { return Object.assign({}, p, { shownChallengeMid: true }); });
      return;
    }
  }

  // チャット
  var sendChat = async function() {
    var msg = chatInput.trim();
    if (!msg || isChatLoading || !roadmap) return;
    setChatInput('');
    var newHistory = chatHistory.concat([{ role: 'user', text: msg }]);
    setChatHistory(newHistory.concat([{ role: 'loading', text: '...' }]));
    setIsChatLoading(true);
    setTimeout(function() { if (scrollRef.current) scrollRef.current.scrollToEnd({ animated: true }); }, 100);
    try {
      var result = await updateWithChat(msg, roadmap, newHistory, userData);
      setRoadmap(result.roadmap); // これがrewardState初期化のuseEffectも発火する
      if (onRoadmapGenerated) onRoadmapGenerated(result.roadmap);
      setChecked({});
      setChatHistory(newHistory.concat([{ role: 'bot', text: result.reply }]));
    } catch (e) {
      setChatHistory(newHistory.concat([{ role: 'bot', text: '少し調子が悪いみたい。もう一度試してみて！' }]));
    } finally {
      setIsChatLoading(false);
      setTimeout(function() { if (scrollRef.current) scrollRef.current.scrollToEnd({ animated: true }); }, 150);
    }
  };

  // ── Loading ──
  if (isGenerating) {
    return (
      <View style={s.root}>
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <View style={s.hRow}><Text style={s.hTitle}>今日のやること</Text></View>
        </View>
        <SkeletonScreen />
      </View>
    );
  }

  // ── Main UI ──
  return (
    <View style={s.root}>
      {/* 段階突破試験モーダル */}
      <BreakthroughTestModal
        visible={!!breakthroughRankKey}
        rankKey={breakthroughRankKey}
        streak={streak}
        userData={userData}
        onPass={function() {
          setBreakthroughRankKey(null);
          if (onRankUpdate) {
            onRankUpdate(function(prev) {
              return Object.assign({}, prev, {
                passedTests: Object.assign({}, (prev.passedTests || {}), { [breakthroughRankKey]: true }),
              });
            });
          }
        }}
        onClose={function() { setBreakthroughRankKey(null); }}
      />

      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.hRow}>
          <Text style={s.hTitle}>今日のやること</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* ランクバッジ */}
            <View style={s.rankBadge}>
              <Text style={s.rankBadgeEmoji}>{currentRank.emoji}</Text>
              <Text style={s.rankBadgeTxt}>{currentRank.label}</Text>
            </View>
            <View style={s.streakRow}>
              <Text>🔥</Text>
              <Text style={s.streakNum}>{streak}</Text>
            </View>
          </View>
        </View>
        {/* リセットカウントダウン */}
        <View style={s.resetRow}>
          <View style={[s.resetDot, { backgroundColor: countdown.urgent ? '#EF4444' : '#D1D5DB' }]} />
          <Text style={[s.resetTxt, countdown.urgent && s.resetTxtUrgent]}>
            {countdown.urgent ? '⚠️ ' : ''}{countdown.label}
          </Text>
          {hit75 && <Text style={s.streakSafeTag}>✓ ストリーク確保済み</Text>}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Progress ── */}
          <Animated.View style={[s.progressSection, { transform: [{ scale: pulseAnim }] }]}>
            <View style={s.progressTop}>
              <View>
                <Text style={s.progressLabel}>PROGRESS</Text>
                <Text style={[s.progressPct, hit75 && { color: GREEN }]}>{pct}%</Text>
                <Text style={s.progressSub}>{done} / {allTodos.length} 完了</Text>
              </View>
              <View style={[s.ring, { borderColor: hit75 ? GREEN : pct > 0 ? ORANGE : SEP }]}>
                <Text style={[s.ringNum, { color: hit75 ? GREEN : pct > 0 ? ORANGE : GRAY2 }]}>
                  {hit75 ? '✓' : pct + '%'}
                </Text>
              </View>
            </View>
            {hit75 && <Text style={s.successMsg}>今日の目標達成！🔥 {streak}日連続</Text>}
            <View style={s.bar}>
              <View style={[s.barFill, { width: pct + '%', backgroundColor: hit75 ? GREEN : ORANGE }]} />
            </View>
          </Animated.View>

          <View style={s.sep} />

          {/* ── Roadmap (collapsible) ── */}
          <View style={s.section}>
            <TouchableOpacity style={s.roadmapToggle} onPress={function() { setShowRoadmap(!showRoadmap); }} activeOpacity={0.7}>
              <Text style={s.sectionTitle}>ロードマップ</Text>
              <Ionicons name={showRoadmap ? 'chevron-up' : 'chevron-down'} size={16} color={GRAY2} />
            </TouchableOpacity>
            {showRoadmap && roadmap && SPANS.map(function(sp, i) {
              return (
                <View key={sp.key}>
                  <View style={s.spanRow}>
                    <View style={[s.spanDot, { backgroundColor: sp.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.spanLabel, { color: sp.color }]}>{sp.label}</Text>
                      <Text style={s.spanText}>{roadmap[sp.key] || ''}</Text>
                    </View>
                  </View>
                  {i < SPANS.length - 1 && <View style={s.rowSep} />}
                </View>
              );
            })}
          </View>

          <View style={s.sep} />

          {/* ── Todos ── */}
          {TIERS.map(function(tier) {
            var items = allTodos.filter(function(t) { return t.tier === tier.key; });
            var isChallenge = tier.key === 'advanced';
            var isLocked = isChallenge && !basicAllDone;

            return (
              <View key={tier.key}>
                <View style={s.section}>

                  {/* ティアヘッダー */}
                  <View style={s.tierHead}>
                    <View style={[s.tierPill, { backgroundColor: tier.color + '18' }]}>
                      <Text style={[s.tierLabel, { color: tier.color }]}>{tier.label}</Text>
                    </View>
                    <Text style={s.tierDesc}>{tier.desc}</Text>
                    {isLocked && (
                      <View style={s.lockBadge}>
                        <Ionicons name="lock-closed" size={11} color={GRAY2} />
                        <Text style={s.lockBadgeTxt}>基礎クリアで解放</Text>
                      </View>
                    )}
                  </View>

                  {/* ロック中：タスクをグレーアウト表示（中身は見える） */}
                  {isLocked ? (
                    items.map(function(item, idx) {
                      return (
                        <View key={item.id} style={{ opacity: 0.3 }}>
                          <View style={s.todoRow}>
                            <View style={[s.check, { borderColor: '#D0D0D0' }]}>
                              <Ionicons name="lock-closed" size={9} color={GRAY2} />
                            </View>
                            <Text style={[s.todoText, { color: GRAY1 }]}>{item.text}</Text>
                          </View>
                          {idx < items.length - 1 && <View style={s.rowSep} />}
                        </View>
                      );
                    })
                  ) : (
                    /* 解放中：通常インタラクティブ表示 */
                    items.map(function(item, idx) {
                      var isDone = !!checked[item.id];
                      return (
                        <View key={item.id}>
                          <PressRow onPress={function() { handleCheck(item); }}>
                            <View style={[s.todoRow, isDone && s.todoRowDone]}>
                              <View style={[s.check, isDone && { backgroundColor: tier.color, borderColor: tier.color }]}>
                                {isDone && <Ionicons name="checkmark" size={12} color="#fff" />}
                              </View>
                              <Text style={[s.todoText, isDone && s.todoTextDone]}>{item.text}</Text>
                            </View>
                          </PressRow>
                          {idx < items.length - 1 && <View style={s.rowSep} />}
                        </View>
                      );
                    })
                  )}
                </View>
                <View style={s.sep} />
              </View>
            );
          })}

          {/* ── Chat history ── */}
          {chatHistory.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>AIとの会話</Text>
              <View style={{ gap: 8, marginTop: 8 }}>
                {chatHistory.map(function(m, i) {
                  if (m.loading) return (
                    <View key={i} style={s.bubbleBot}><ActivityIndicator size="small" color={GRAY2} /></View>
                  );
                  return (
                    <View key={i} style={m.role === 'user' ? s.bubbleUser : s.bubbleBot}>
                      <Text style={m.role === 'user' ? s.bubbleUserTxt : s.bubbleBotTxt}>{m.text}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          {chatHistory.length === 0 && (
            <View style={s.section}>
              <Text style={s.hintTxt}>AIに「今日のTodoを変えたい」「今週の目標を修正して」と話しかけてみよう</Text>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* ── Input ── */}
        <View style={s.inputRow}>
          <TextInput
            style={[s.input, { height: chatInputHeight }]}
            value={chatInput}
            onChangeText={setChatInput}
            onContentSizeChange={function(e) {
              var h = e.nativeEvent.contentSize.height;
              setChatInputHeight(Math.min(Math.max(44, h + 4), 120));
            }}
            placeholder="ロードマップやTodoを相談..."
            placeholderTextColor={GRAY2}
            multiline
            editable={!isChatLoading}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!chatInput.trim() || isChatLoading) && s.sendOff]}
            onPress={sendChat}
            disabled={!chatInput.trim() || isChatLoading}
          >
            {isChatLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="arrow-up" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── 変動報酬トースト ── */}
      {showReward && (
        <RewardToast
          message={rewardMsg}
          onDismiss={function() { setShowReward(false); }}
        />
      )}
    </View>
  );
}

var s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#FFFFFF' },
  header:  { paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: SEP },
  hRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
  hTitle:  { fontSize: 24, fontWeight: '900', color: BLACK, letterSpacing: -0.5 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakNum: { fontSize: 16, fontWeight: '800', color: ORANGE },
  resetRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resetDot: { width: 6, height: 6, borderRadius: 3 },
  resetTxt: { fontSize: 11, color: '#A3A3A3', fontWeight: '500' },
  resetTxtUrgent: { color: '#EF4444', fontWeight: '700' },
  streakSafeTag: { marginLeft: 'auto', fontSize: 10, color: '#22C55E', fontWeight: '700' },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rankBadgeEmoji: { fontSize: 12 },
  rankBadgeTxt: { fontSize: 11, fontWeight: '600', color: '#A3A3A3' },

  scroll:  { paddingBottom: 20 },
  sep:     { height: 0.5, backgroundColor: SEP },
  section: { paddingHorizontal: 20, paddingVertical: 16 },
  rowSep:  { height: 0.5, backgroundColor: SEP, marginLeft: 20 },

  // Progress
  progressSection: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, gap: 12 },
  progressTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { fontSize: 10, fontWeight: '700', color: GRAY2, letterSpacing: 2, marginBottom: 6 },
  progressPct:   { fontSize: 48, fontWeight: '900', color: BLACK, lineHeight: 54, letterSpacing: -1 },
  progressSub:   { fontSize: 12, color: GRAY1, marginTop: 2 },
  ring:      { width: 68, height: 68, borderRadius: 34, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  ringNum:   { fontSize: 15, fontWeight: '800' },
  successMsg:{ fontSize: 13, fontWeight: '700', color: GREEN },
  bar:       { height: 3, backgroundColor: '#F0F0F0', borderRadius: 2, overflow: 'hidden' },
  barFill:   { height: 3, borderRadius: 2 },

  // Roadmap
  roadmapToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle:  { fontSize: 16, fontWeight: '800', color: BLACK, letterSpacing: -0.2 },
  spanRow:  { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' },
  spanDot:  { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  spanLabel:{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2, textTransform: 'uppercase' },
  spanText: { fontSize: 13, color: GRAY1, lineHeight: 19 },

  // Tiers
  tierHead:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tierPill:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tierLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  tierDesc:     { fontSize: 12, color: GRAY2, flex: 1 },
  lockBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  lockBadgeTxt: { fontSize: 10, color: GRAY2, fontWeight: '600' },

  // Todos
  todoRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  todoRowDone: { opacity: 0.4 },
  check:       { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D0D0D0', alignItems: 'center', justifyContent: 'center' },
  todoText:    { flex: 1, fontSize: 14, color: BLACK, lineHeight: 20 },
  todoTextDone:{ textDecorationLine: 'line-through', color: GRAY2 },

  // Chat
  bubbleBot:    { alignSelf: 'flex-start', backgroundColor: '#F4F4F4', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '88%' },
  bubbleUser:   { alignSelf: 'flex-end', backgroundColor: BLACK, borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '88%' },
  bubbleBotTxt: { color: BLACK, fontSize: 13, lineHeight: 20 },
  bubbleUserTxt:{ color: '#fff', fontSize: 13, lineHeight: 20 },
  hintTxt:      { fontSize: 12, color: GRAY2, lineHeight: 18 },

  // Input
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 24, gap: 10, backgroundColor: '#FFFFFF', borderTopWidth: 0.5, borderTopColor: SEP },
  input:    { flex: 1, backgroundColor: '#F4F4F4', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, color: BLACK, fontSize: 15, minHeight: 44, maxHeight: 120 },
  sendBtn:  { width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  sendOff:  { opacity: 0.3 },

  // 変動報酬トースト
  toastWrap: { position: 'absolute', bottom: 90, left: 16, right: 16, zIndex: 1000 },
  toast: {
    backgroundColor: '#111111', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 24, elevation: 24,
  },
  toastAccent: { width: 3, height: 36, backgroundColor: ORANGE, borderRadius: 2, flexShrink: 0 },
  toastText:   { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '700', lineHeight: 21, letterSpacing: -0.2 },
});
