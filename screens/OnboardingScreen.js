import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Animated, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

var API_URL = 'https://hi-backend.vercel.app/api/chat';

var C = {
  orange: '#F97316', navy: '#0F172A', navyMid: '#1E3A5F',
  bg: '#F8FAFC', white: '#FFFFFF', border: '#E2E8F0',
  text: '#0F172A', textSub: '#475569', textMuted: '#94A3B8',
  blue: '#3B82F6',
};

function isValidUsername(val) {
  return val.length >= 2 && val.length <= 20 && !/\s/.test(val);
}

async function processDream(rawInput) {
  var prompt =
    'ユーザーが「どんな夢がある？」という質問に対して以下を入力しました：\n「' + rawInput + '」\n\n' +
    '以下のJSONのみで返してください（他の文章は不要）：\n' +
    '{\n' +
    '  "dream": "夢を一文で言語化する（例：〇〇になること、〇〇を実現すること）",\n' +
    '  "dreamTitle": "夢を映画タイトルのように10文字以内で表現する（例：世界を変える、人を笑顔に、音楽で生きる）",\n' +
    '  "reply": "その言葉への自然な相槌（1〜2文）と「なんでその夢を叶えたいと思ったの？」を自然につなげた文。3文以内、絵文字1〜2個OK。"\n' +
    '}';
  var res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], userData: {} }),
  });
  var data = await res.json();
  var text = (data && data.text) || '';
  var match = text.match(/\{[\s\S]*\}/);
  if (match) {
    var parsed = JSON.parse(match[0]);
    return { dream: parsed.dream || rawInput, dreamTitle: parsed.dreamTitle || rawInput, reply: parsed.reply || '' };
  }
  return { dream: rawInput, dreamTitle: rawInput, reply: 'いいね！\nなんでその夢を叶えたいと思ったの？' };
}

async function processPassion(rawInput) {
  var prompt =
    'ユーザーが「好きなこと・ハマっていることは？」という質問に対して以下を入力しました：\n「' + rawInput + '」\n\n' +
    '以下のJSONのみで返してください（他の文章は不要）：\n' +
    '{\n' +
    '  "passion": "好きなことを一文で言語化する。曖昧でも最善の解釈で明確な文章にする",\n' +
    '  "reply": "その言葉への自然な相槌（1〜2文）と、次の質問「それってどこが一番好き？何がたまらないの？」を自然につなげた文。3文以内、絵文字1〜2個OK。"\n' +
    '}';
  var res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], userData: {} }),
  });
  var data = await res.json();
  var text = (data && data.text) || '';
  var match = text.match(/\{[\s\S]*\}/);
  if (match) {
    var parsed = JSON.parse(match[0]);
    return { passion: parsed.passion || rawInput, reply: parsed.reply || '' };
  }
  return { passion: rawInput, reply: 'いいね！\nそれってどこが一番好き？' };
}

async function getReaction(userInput, contextInfo, nextQ) {
  var prompt =
    'あなたは夢のカウンセラーです。フレンドリーな日本語で話します。\n' +
    contextInfo + '\n' +
    'ユーザーが言った: 「' + userInput + '」\n\n' +
    'まずその言葉に自然に反応してください（共感・面白がる・驚くなど 1〜2文）。' +
    'その後、次の質問「' + nextQ + '」を自然な流れで聞いてください。' +
    '合計3文以内。絵文字1〜2個OK。テンプレートっぽい返しはNG。';
  var res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], userData: {} }),
  });
  var data = await res.json();
  return (data && data.text) || nextQ;
}

async function suggestModels(ctx, feedback) {
  var lines = ctx.hasDream
    ? ['夢: ' + ctx.dream, 'なぜ叶えたいか: ' + ctx.why, 'なりたい自分: ' + ctx.vision]
    : ['好きなこと: ' + ctx.passion, 'その何が好きか: ' + ctx.why, 'なりたい自分: ' + ctx.vision];

  var feedbackLine = feedback
    ? '\n前回の提案が合わなかった理由: ' + feedback + '\n→ 前回とは別の3人を提案してください。'
    : '';

  var prompt =
    'ユーザーの情報：\n' + lines.join('\n') + feedbackLine + '\n\n' +
    'このユーザーの価値観・思考回路・動機に最も近い人物を3人選んでください。' +
    '同じ分野ではなく、考え方・生き方が似ている人を選ぶこと。有名人・偉人・歴史上の人物・現代人なんでもOK。' +
    '必ず以下のJSON配列のみを返してください。説明文・前置き・コードブロック不要：\n' +
    '[{"name":"名前","emoji":"その人を表す絵文字1個","tagline":"考え方・生き方を表す一言（20文字以内）"},{"name":"...","emoji":"...","tagline":"..."},{"name":"...","emoji":"...","tagline":"..."}]';

  var systemOverride = 'あなたはJSONを生成するAIです。ユーザーの価値観に合う人物を3人選び、必ずJSON配列のみを返してください。前置き・説明・コードブロック（```）は絶対に使わないこと。';

  var res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], userData: {}, systemOverride: systemOverride }),
  });
  var data = await res.json();
  var text = (data && data.text) || '';
  var match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  return JSON.parse(match[0]);
}

var FALLBACK_MODELS = [
  { name: 'スティーブ・ジョブズ', emoji: '🍎', tagline: '情熱と直感で世界を変えた' },
  { name: 'イチロー', emoji: '⚾', tagline: '小さな積み重ねが偉大さをつくる' },
  { name: 'マリー・キュリー', emoji: '🔬', tagline: '信念を曲げずに道を切り開いた' },
];

var STEP_PROGRESS = {
  username: 0,
  dream_choice: 0.12,
  dream_input: 0.22,
  passion_input: 0.22,
  dream_reacting: 0.35,
  why: 0.42,
  why_reacting: 0.55,
  vision: 0.62,
  suggesting: 0.78,
  model_pick: 0.85,
  model_feedback: 0.87,
  mode_pick: 0.93,
  timeframe_pick: 0.97,
};

var TIMEFRAME_OPTIONS = [
  { label: '1ヶ月以内', icon: '⚡', value: '1ヶ月以内' },
  { label: '3ヶ月',    icon: '🌱', value: '3ヶ月' },
  { label: '半年',     icon: '🚀', value: '半年' },
  { label: '1年',      icon: '🎯', value: '1年' },
  { label: '3年',      icon: '🏔️', value: '3年' },
  { label: '5年以上',  icon: '🌟', value: '5年以上' },
  { label: '人生をかけて', icon: '♾️', value: '人生をかけて' },
];

function hasTimeframe(dream) {
  return /\d+年|\d+ヶ月|\d+か月|\d+週|までに|以内に|一生|人生をかけて/.test(dream || '');
}

// ── ヘルパー：バブルを行ラッパーで包む ────────────────────────────
// LINEスタイル：短いメッセージは1行、長い場合だけ折り返す
function BotRow({ msgKey, children }) {
  return (
    <View key={msgKey} style={s.rowBot}>
      {children}
    </View>
  );
}
function UserRow({ msgKey, children }) {
  return (
    <View key={msgKey} style={s.rowUser}>
      {children}
    </View>
  );
}

export default function OnboardingScreen(props) {
  var onComplete = props.onComplete;

  var [step, setStep] = useState('username');
  var [usernameInput, setUsernameInput] = useState('');
  var [username, setUsername] = useState('');
  var [usernameError, setUsernameError] = useState('');
  var [hasDream, setHasDream] = useState(null);
  var [dreamInput, setDreamInput] = useState('');
  var [dreamText, setDreamText] = useState('');
  var [passionInput, setPassionInput] = useState('');
  var [passionText, setPassionText] = useState('');
  var [dreamReply, setDreamReply] = useState('');
  var [whyInput, setWhyInput] = useState('');
  var [whyText, setWhyText] = useState('');
  var [whyReply, setWhyReply] = useState('');
  var [visionInput, setVisionInput] = useState('');
  var [visionText, setVisionText] = useState('');
  var [dreamTitle, setDreamTitle] = useState('');
  var [suggestCtx, setSuggestCtx] = useState(null);
  var [suggestedModels, setSuggestedModels] = useState(null);
  var [selectedModel, setSelectedModel] = useState(null);
  var [modelFeedbackInput, setModelFeedbackInput] = useState('');
  var [modelFeedbackText, setModelFeedbackText] = useState('');
  var [selectedMode, setSelectedMode] = useState(null);
  var [timeframe, setTimeframe] = useState('');
  var [isLoading, setIsLoading] = useState(false);

  var scrollRef = useRef(null);
  var progressAnim = useRef(new Animated.Value(0)).current;

  var scrollToBottom = function() {
    setTimeout(function() {
      if (scrollRef.current) scrollRef.current.scrollToEnd({ animated: true });
    }, 220);
  };

  var goStep = function(st) {
    var target = STEP_PROGRESS[st] || 0;
    Animated.timing(progressAnim, { toValue: target, duration: 400, useNativeDriver: false }).start();
    setStep(st);
    scrollToBottom();
  };

  var progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  // ── ハンドラー ──────────────────────────────────────────────

  var handleUsernameSubmit = function() {
    var val = usernameInput.trim();
    if (!val) return;
    if (!isValidUsername(val)) {
      setUsernameError('スペースなし、2〜20文字で入力してください');
      return;
    }
    setUsernameError('');
    setUsername(val);
    goStep('dream_choice');
  };

  var handleDreamChoice = function(has) {
    setHasDream(has);
    goStep(has ? 'dream_input' : 'passion_input');
  };

  var handleDreamSubmit = async function() {
    var val = dreamInput.trim();
    if (!val) return;
    goStep('dream_reacting');
    setIsLoading(true);
    try {
      var result = await processDream(val);
      setDreamText(result.dream);
      setDreamTitle(result.dreamTitle || result.dream);
      setDreamReply(result.reply);
    } catch (e) {
      setDreamText(val);
      setDreamReply('いい夢だね！\nなんでその夢を叶えたいと思ったの？きっかけでも感情でもなんでもいい。');
    } finally {
      setIsLoading(false);
      goStep('why');
    }
  };

  var handlePassionSubmit = async function() {
    var val = passionInput.trim();
    if (!val) return;
    goStep('dream_reacting');
    setIsLoading(true);
    try {
      var result = await processPassion(val);
      setPassionText(result.passion);
      setDreamReply(result.reply);
    } catch (e) {
      setPassionText(val);
      setDreamReply('いいね！\nそれってどこが一番好き？何がたまらないの？');
    } finally {
      setIsLoading(false);
      goStep('why');
    }
  };

  var handleWhySubmit = async function() {
    var val = whyInput.trim();
    if (!val) return;
    setWhyText(val);
    goStep('why_reacting');
    setIsLoading(true);
    try {
      var reply = await getReaction(
        val,
        'ユーザーが夢への動機を話してくれた。夢: ' + (dreamText || passionText),
        hasDream
          ? 'その夢が叶ったとき、どんな自分になってると思う？'
          : 'そのまま突き進んだとき、どんな自分になりたい？'
      );
      setWhyReply(reply);
    } catch (e) {
      setWhyReply('なるほど、そういう気持ちがあるんだね。\nその夢が叶ったとき、どんな自分になってると思う？');
    } finally {
      setIsLoading(false);
      goStep('vision');
    }
  };

  var handleVisionSubmit = async function() {
    var val = visionInput.trim();
    if (!val) return;
    setVisionText(val);
    var ctx = {
      hasDream: hasDream,
      dream: dreamText,
      passion: passionText,
      why: whyText,
      vision: val,
    };
    setSuggestCtx(ctx);
    goStep('suggesting');
    setIsLoading(true);
    try {
      var models = await suggestModels(ctx, null);
      setSuggestedModels(models && models.length >= 3 ? models : FALLBACK_MODELS);
    } catch (e) {
      setSuggestedModels(FALLBACK_MODELS);
    } finally {
      setIsLoading(false);
      goStep('model_pick');
    }
  };

  var handleModelFeedbackSubmit = async function() {
    var val = modelFeedbackInput.trim();
    if (!val) return;
    setModelFeedbackText(val);
    setModelFeedbackInput('');
    goStep('suggesting');
    setIsLoading(true);
    try {
      var models = await suggestModels(suggestCtx, val);
      setSuggestedModels(models && models.length >= 3 ? models : FALLBACK_MODELS);
    } catch (e) {
      setSuggestedModels(FALLBACK_MODELS);
    } finally {
      setIsLoading(false);
      goStep('model_pick');
    }
  };

  var handleModelSelect = function(model) {
    setSelectedModel(model);
    goStep('mode_pick');
  };

  var handleModeSelect = function(mode) {
    setSelectedMode(mode);
    var dream = dreamText || passionText;
    if (hasTimeframe(dream)) {
      onComplete({
        username: username,
        dream: dream,
        dreamTitle: dreamTitle || dream,
        needs: whyText,
        field: 'other',
        model: selectedModel,
        mode: mode,
        timeframe: '',
      });
    } else {
      goStep('timeframe_pick');
    }
  };

  var handleTimeframeSelect = function(tf) {
    setTimeframe(tf);
    var dream = dreamText || passionText;
    onComplete({
      username: username,
      dream: dream,
      dreamTitle: dreamTitle || dream,
      needs: whyText,
      field: 'other',
      model: selectedModel,
      mode: selectedMode,
      timeframe: tf,
    });
  };

  // ── メッセージ構築 ──────────────────────────────────────────
  // 各バブルを rowBot / rowUser で囲む → LINEスタイルの幅になる

  var msgs = [];
  var AFTER_USERNAME = ['dream_choice','dream_input','passion_input','dream_reacting','why','why_reacting','vision','suggesting','model_pick','model_feedback','mode_pick','timeframe_pick'];
  var AFTER_CHOICE   = ['dream_input','passion_input','dream_reacting','why','why_reacting','vision','suggesting','model_pick','model_feedback','mode_pick','timeframe_pick'];
  var AFTER_DREAM    = ['dream_reacting','why','why_reacting','vision','suggesting','model_pick','model_feedback','mode_pick','timeframe_pick'];
  var AFTER_WHY      = ['why_reacting','vision','suggesting','model_pick','model_feedback','mode_pick','timeframe_pick'];
  var AFTER_VISION   = ['suggesting','model_pick','model_feedback','mode_pick','timeframe_pick'];
  var AFTER_MODELS   = ['model_feedback','mode_pick','timeframe_pick'];

  // ウェルカム
  msgs.push(
    <View key="welcome" style={s.rowBot}>
      <View style={s.botBubble}>
        <Text style={s.botText}>{'灯へようこそ🕯️\nあなたの道を、一緒に照らします。\n\nまず、ユーザーネームを決めましょう！'}</Text>
      </View>
    </View>
  );
  if (usernameError) {
    msgs.push(
      <View key="uerr" style={s.rowBot}>
        <View style={s.errorBubble}><Text style={s.errorText}>{usernameError}</Text></View>
      </View>
    );
  }
  if (!username) {
    msgs.push(
      <View key="uhint" style={s.rowBot}>
        <View style={s.hintBubble}>
          <Text style={s.hintText}>{'例：はな  たいよう  yuki2025  花子\n日本語・英数字OK、2〜20文字'}</Text>
        </View>
      </View>
    );
  }

  // ユーザーネーム確定
  if (username) {
    msgs.push(
      <View key="uval" style={s.rowUser}>
        <View style={s.userBubble}><Text style={s.userText}>{'@' + username}</Text></View>
      </View>
    );
    msgs.push(
      <View key="uack" style={s.rowBot}>
        <View style={s.botBubble}>
          <Text style={s.botText}>{'@' + username + '！🎉\n\n今、叶えたい夢や目標はある？'}</Text>
        </View>
      </View>
    );
  }

  // 夢ある？ボタン
  if (step === 'dream_choice') {
    msgs.push(
      <View key="choice" style={s.choiceRow}>
        <TouchableOpacity style={[s.choiceBtn, { borderColor: C.orange }]} onPress={function() { handleDreamChoice(true); }}>
          <Text style={s.choiceEmoji}>✨</Text>
          <Text style={s.choiceTitle}>ある！</Text>
          <Text style={s.choiceDesc}>叶えたい夢がある</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.choiceBtn, { borderColor: C.blue }]} onPress={function() { handleDreamChoice(false); }}>
          <Text style={s.choiceEmoji}>🔍</Text>
          <Text style={s.choiceTitle}>まだわからない</Text>
          <Text style={s.choiceDesc}>一緒に探したい</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // YES パス
  if (hasDream === true && AFTER_CHOICE.includes(step)) {
    msgs.push(
      <View key="cyes" style={s.rowUser}>
        <View style={s.userBubble}><Text style={s.userText}>ある！✨</Text></View>
      </View>
    );
    msgs.push(
      <View key="qdream" style={s.rowBot}>
        <View style={s.botBubble}>
          <Text style={s.botText}>{'いいね！\nどんな夢？どんな大きさでも全然OK。'}</Text>
        </View>
      </View>
    );
    if (dreamText && AFTER_DREAM.includes(step)) {
      msgs.push(
        <View key="adream" style={s.rowUser}>
          <View style={s.userBubble}><Text style={s.userText}>{dreamText}</Text></View>
        </View>
      );
    }
  }

  // NO パス
  if (hasDream === false && AFTER_CHOICE.includes(step)) {
    msgs.push(
      <View key="cno" style={s.rowUser}>
        <View style={s.userBubble}><Text style={s.userText}>まだわからない🔍</Text></View>
      </View>
    );
    msgs.push(
      <View key="qpassion" style={s.rowBot}>
        <View style={s.botBubble}>
          <Text style={s.botText}>{'大丈夫！一緒に見つけよう🔍\n\n小さい頃に夢中だったこと、または今ハマってることを教えて。'}</Text>
        </View>
      </View>
    );
    if (passionText && AFTER_DREAM.includes(step)) {
      msgs.push(
        <View key="apassion" style={s.rowUser}>
          <View style={s.userBubble}><Text style={s.userText}>{passionText}</Text></View>
        </View>
      );
    }
  }

  // Claudeの相槌（dream/passion の後）
  if (AFTER_DREAM.includes(step)) {
    if (step === 'dream_reacting') {
      msgs.push(
        <View key="dreacting" style={s.rowBot}>
          <View style={s.botBubble}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={C.orange} />
              <Text style={[s.botText, { color: C.textMuted }]}>...</Text>
            </View>
          </View>
        </View>
      );
    } else if (dreamReply) {
      msgs.push(
        <View key="dreply" style={s.rowBot}>
          <View style={s.botBubble}>
            <Text style={s.botText}>{dreamReply}</Text>
          </View>
        </View>
      );
    }
  }

  // WHY の回答
  if (whyText && AFTER_WHY.includes(step)) {
    msgs.push(
      <View key="awhy" style={s.rowUser}>
        <View style={s.userBubble}><Text style={s.userText}>{whyText}</Text></View>
      </View>
    );
  }

  // Claudeの相槌（why の後）
  if (AFTER_WHY.includes(step)) {
    if (step === 'why_reacting') {
      msgs.push(
        <View key="wyreacting" style={s.rowBot}>
          <View style={s.botBubble}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={C.orange} />
              <Text style={[s.botText, { color: C.textMuted }]}>...</Text>
            </View>
          </View>
        </View>
      );
    } else if (whyReply) {
      msgs.push(
        <View key="wyreply" style={s.rowBot}>
          <View style={s.botBubble}>
            <Text style={s.botText}>{whyReply}</Text>
          </View>
        </View>
      );
    }
  }

  // VISION の回答
  if (visionText && AFTER_VISION.includes(step)) {
    msgs.push(
      <View key="avision" style={s.rowUser}>
        <View style={s.userBubble}><Text style={s.userText}>{visionText}</Text></View>
      </View>
    );
  }

  // ロールモデル提案中
  if (step === 'suggesting') {
    msgs.push(
      <View key="suggesting" style={s.rowBot}>
        <View style={s.botBubble}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator size="small" color={C.orange} />
            <Text style={[s.botText, { color: C.textMuted }]}>
              {modelFeedbackText ? '別の人を探してるよ...' : 'あなたに似た考え方の人を探してる...'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ロールモデル選択
  if (['model_pick', 'model_feedback', 'mode_pick'].includes(step) && suggestedModels) {
    msgs.push(
      <View key="qpick" style={s.rowBot}>
        <View style={s.botBubble}>
          <Text style={s.botText}>
            {modelFeedbackText
              ? '別の人も考えてみたよ。\nこの中でピンとくる人はいる？'
              : 'あなたの考え方に近い人たちだよ。\n一番ピンとくる人を選んで！'}
          </Text>
        </View>
      </View>
    );
    msgs.push(
      <View key="models" style={s.modelList}>
        {suggestedModels.map(function(m, i) {
          var picked = selectedModel && selectedModel.name === m.name;
          return (
            <TouchableOpacity
              key={i}
              style={[s.modelCard, picked && s.modelCardOn]}
              onPress={function() { if (step === 'model_pick') handleModelSelect(m); }}
              disabled={step !== 'model_pick'}
              activeOpacity={0.75}
            >
              <Text style={s.modelEmoji}>{m.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.modelName}>{m.name}</Text>
                <Text style={s.modelTagline}>{m.tagline}</Text>
              </View>
              {picked && <Ionicons name="checkmark-circle" size={22} color={C.orange} />}
            </TouchableOpacity>
          );
        })}
        {step === 'model_pick' && (
          <TouchableOpacity
            style={s.notMatchBtn}
            onPress={function() { goStep('model_feedback'); }}
            activeOpacity={0.75}
          >
            <Text style={s.notMatchTxt}>{'この3人とは違う気がする...'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // フィードバック
  if (step === 'model_feedback') {
    msgs.push(
      <View key="qfeedback" style={s.rowBot}>
        <View style={s.botBubble}>
          <Text style={s.botText}>{'なんでこの3人とは違うと思った？\n（どんな感覚でも教えて）'}</Text>
        </View>
      </View>
    );
  }

  // モード選択
  if (step === 'mode_pick') {
    msgs.push(
      <View key="modeack" style={s.rowBot}>
        <View style={s.botBubble}>
          <Text style={s.botText}>{(selectedModel ? selectedModel.name : '') + '、いい選択🔥\n\n最後に、今の自分はどっちに近い？'}</Text>
        </View>
      </View>
    );
    msgs.push(
      <View key="modes" style={s.choiceRow}>
        <TouchableOpacity style={[s.choiceBtn, { borderColor: C.orange }]} onPress={function() { handleModeSelect('busy'); }}>
          <Text style={s.choiceEmoji}>⚡</Text>
          <Text style={s.choiceTitle}>忙しい</Text>
          <Text style={s.choiceDesc}>短時間で確実に</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.choiceBtn, { borderColor: C.blue }]} onPress={function() { handleModeSelect('free'); }}>
          <Text style={s.choiceEmoji}>🌊</Text>
          <Text style={s.choiceTitle}>余裕あり</Text>
          <Text style={s.choiceDesc}>じっくり深く</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 期間選択
  if (step === 'timeframe_pick') {
    msgs.push(
      <View key="tfack" style={s.rowBot}>
        <View style={s.botBubble}>
          <Text style={s.botText}>{'最後に一つ！\nどのくらいの期間で叶えたい？🗓️'}</Text>
        </View>
      </View>
    );
    msgs.push(
      <View key="tfgrid" style={s.tfGrid}>
        {TIMEFRAME_OPTIONS.map(function(opt) {
          return (
            <TouchableOpacity
              key={opt.value}
              style={s.tfChip}
              onPress={function() { handleTimeframeSelect(opt.value); }}
            >
              <Text style={s.tfEmoji}>{opt.icon}</Text>
              <Text style={s.tfLabel}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── 入力エリアの表示制御 ──────────────────────────────────

  var showUsername   = !username;
  var showDream      = step === 'dream_input';
  var showPassion    = step === 'passion_input';
  var showWhy        = step === 'why';
  var showVision     = step === 'vision';
  var showFeedback   = step === 'model_feedback';

  return (
    <View style={s.root}>
      <LinearGradient colors={[C.navy, C.navyMid]} style={s.header}>
        <Text style={s.htitle}>灯</Text>
        <Text style={s.hsub}>あなたの道を照らす</Text>
        <View style={s.pTrack}>
          <Animated.View style={[s.pFill, { width: progressWidth }]} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {msgs}
          <View style={{ height: 16 }} />
        </ScrollView>

        {showUsername && (
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={usernameInput}
              onChangeText={function(t) {
                setUsernameInput(t);
                if (/\s/.test(t)) {
                  setUsernameError('スペースは使えません');
                } else {
                  setUsernameError('');
                }
              }}
              placeholder="ユーザーネームを入力..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleUsernameSubmit}
            />
            <TouchableOpacity style={[s.sendBtn, !usernameInput.trim() && s.sendOff]} onPress={handleUsernameSubmit} disabled={!usernameInput.trim()}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {showDream && (
          <View style={s.inputRow}>
            <TextInput style={s.input} value={dreamInput} onChangeText={setDreamInput} placeholder="夢を話してみて..." placeholderTextColor={C.textMuted} multiline />
            <TouchableOpacity style={[s.sendBtn, !dreamInput.trim() && s.sendOff]} onPress={handleDreamSubmit} disabled={!dreamInput.trim()}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {showPassion && (
          <View style={s.inputRow}>
            <TextInput style={s.input} value={passionInput} onChangeText={setPassionInput} placeholder="好きなこと・ハマってること..." placeholderTextColor={C.textMuted} multiline />
            <TouchableOpacity style={[s.sendBtn, !passionInput.trim() && s.sendOff]} onPress={handlePassionSubmit} disabled={!passionInput.trim()}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {showWhy && (
          <View style={s.inputRow}>
            <TextInput style={s.input} value={whyInput} onChangeText={setWhyInput} placeholder="素直に話してみて..." placeholderTextColor={C.textMuted} multiline />
            <TouchableOpacity style={[s.sendBtn, !whyInput.trim() && s.sendOff]} onPress={handleWhySubmit} disabled={!whyInput.trim()}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {showVision && (
          <View style={s.inputRow}>
            <TextInput style={s.input} value={visionInput} onChangeText={setVisionInput} placeholder="なりたい自分を話してみて..." placeholderTextColor={C.textMuted} multiline />
            <TouchableOpacity style={[s.sendBtn, !visionInput.trim() && s.sendOff]} onPress={handleVisionSubmit} disabled={!visionInput.trim()}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {showFeedback && (
          <View style={s.inputRow}>
            <TextInput style={s.input} value={modelFeedbackInput} onChangeText={setModelFeedbackInput} placeholder="なんか違う気がして... など感覚でOK" placeholderTextColor={C.textMuted} multiline />
            <TouchableOpacity style={[s.sendBtn, !modelFeedbackInput.trim() && s.sendOff]} onPress={handleModelFeedbackSubmit} disabled={!modelFeedbackInput.trim()}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

var s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 18, alignItems: 'center' },
  htitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  hsub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2, marginBottom: 14 },
  pTrack: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  pFill: { height: 3, backgroundColor: C.orange, borderRadius: 2 },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end', padding: 16, gap: 12 },

  // ── LINEスタイルバブルラッパー ──
  // 各行がフル幅を取り、バブルは内側でコンテンツ幅に収まる
  rowBot:  { flexDirection: 'row', justifyContent: 'flex-start' },
  rowUser: { flexDirection: 'row', justifyContent: 'flex-end' },

  // バブル本体（alignSelf不要 → ラッパーが担当）
  botBubble:  { backgroundColor: C.white, borderRadius: 18, borderBottomLeftRadius: 4, padding: 14, maxWidth: '86%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  botText:    { color: C.text, fontSize: 14, lineHeight: 22 },
  userBubble: { backgroundColor: C.orange, borderRadius: 18, borderBottomRightRadius: 4, padding: 14, maxWidth: '80%' },
  userText:   { color: '#fff', fontSize: 14, lineHeight: 21 },
  hintBubble: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, maxWidth: '86%', borderWidth: 1, borderColor: '#BFDBFE' },
  hintText:   { color: '#1D4ED8', fontSize: 12, lineHeight: 19 },
  errorBubble:{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, maxWidth: '86%', borderWidth: 1, borderColor: '#FECACA' },
  errorText:  { color: '#DC2626', fontSize: 12, lineHeight: 19 },

  choiceRow: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  choiceBtn: { flex: 1, backgroundColor: C.white, borderRadius: 16, padding: 16, borderWidth: 2, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  choiceEmoji: { fontSize: 28, marginBottom: 8 },
  choiceTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4, textAlign: 'center' },
  choiceDesc:  { fontSize: 11, color: C.textSub, textAlign: 'center' },

  tfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 4 },
  tfChip: { backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tfEmoji: { fontSize: 18 },
  tfLabel: { fontSize: 14, fontWeight: '700', color: C.text },

  modelList:   { gap: 10, marginVertical: 4 },
  modelCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1.5, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  modelCardOn: { borderColor: C.orange, backgroundColor: '#FFF7ED' },
  modelEmoji:  { fontSize: 28 },
  modelName:   { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  modelTagline:{ fontSize: 12, color: C.textSub, lineHeight: 17 },
  notMatchBtn: { marginTop: 4, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center', backgroundColor: C.white },
  notMatchTxt: { color: C.textMuted, fontSize: 13 },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 12, paddingRight: 16, paddingVertical: 10, paddingBottom: 24, gap: 10, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
  input:    { flex: 1, backgroundColor: C.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: C.text, fontSize: 16, borderWidth: 1, borderColor: C.border, maxHeight: 120, minHeight: 44 },
  sendBtn:  { width: 44, height: 44, borderRadius: 22, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendOff:  { opacity: 0.35 },
});
