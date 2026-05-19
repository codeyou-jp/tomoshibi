import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

async function generateRoadmap(userData) {
  var dream = userData.dream || '';
  var isGoal = /\d+年|\d+ヶ月|\d+か月|\d+週|までに|以内|合格|受験|試験|資格|検定/.test(dream);
  var timeframeNote = userData.timeframe ? '達成期間: ' + userData.timeframe + '\n' : '';
  var prompt = isGoal
    ? '以下は期限付きの目標です。逆算して現実的なロードマップと今日のTodoを生成してください。\n\n目標: ' + dream + '\n' + timeframeNote + '動機: ' + (userData.needs || '') + '\nロールモデル: ' + (userData.model ? userData.model.name : 'なし') + '\nモード: ' + (userData.mode === 'busy' ? '忙しい（短時間集中）' : '余裕あり') + '\n\n各項目は20文字以内。JSON以外不要。\n{"life":"〜","years10":"〜","years5":"〜","year1":"〜","months6":"〜","months3":"〜","month1":"〜","weeks2":"〜","week1":"〜","easy":["〜","〜","〜"],"necessary":["〜","〜","〜"],"advanced":["〜","〜","〜","〜"]}'
    : '以下のユーザー情報をもとに夢を実現するためのロードマップと今日のTodoを生成してください。\n\n夢: ' + dream + '\n' + timeframeNote + '動機: ' + (userData.needs || '') + '\nロールモデル: ' + (userData.model ? userData.model.name : 'なし') + '\nモード: ' + (userData.mode === 'busy' ? '忙しい' : '余裕あり') + '\n\n各項目20文字以内。JSON以外不要。\n{"life":"〜","years10":"〜","years5":"〜","year1":"〜","months6":"〜","months3":"〜","month1":"〜","weeks2":"〜","week1":"〜","easy":["〜","〜","〜"],"necessary":["〜","〜","〜"],"advanced":["〜","〜","〜","〜"]}';
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TodoScreen({ userData, streak, onStreakUpdate, cachedRoadmap, onRoadmapGenerated, onTaskComplete }) {
  var insets = useSafeAreaInsets();
  var [roadmap, setRoadmap] = useState(cachedRoadmap || null);
  var [checked, setChecked] = useState({});
  var [isGenerating, setIsGenerating] = useState(!cachedRoadmap);
  var [showRoadmap, setShowRoadmap] = useState(false);
  var [chatInput, setChatInput] = useState('');
  var [chatHistory, setChatHistory] = useState([]);
  var [isChatLoading, setIsChatLoading] = useState(false);
  var [celebrated, setCelebrated] = useState(false);
  var [rewardMsg, setRewardMsg] = useState('');
  var [showReward, setShowReward] = useState(false);

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

  // ロードマップ生成
  useEffect(function() {
    if (cachedRoadmap) return;
    generateRoadmap(userData)
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
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.hRow}>
          <Text style={s.hTitle}>今日のやること</Text>
          <View style={s.streakRow}>
            <Text>🔥</Text>
            <Text style={s.streakNum}>{streak}</Text>
          </View>
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
            style={s.input}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="ロードマップやTodoを相談..."
            placeholderTextColor={GRAY2}
            multiline
            numberOfLines={1}
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
  header:  { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: SEP },
  hRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hTitle:  { fontSize: 24, fontWeight: '900', color: BLACK, letterSpacing: -0.5 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakNum: { fontSize: 16, fontWeight: '800', color: ORANGE },

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
  input:    { flex: 1, backgroundColor: '#F4F4F4', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: BLACK, fontSize: 15, maxHeight: 120, minHeight: 44 },
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
