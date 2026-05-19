import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Animated, TextInput, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FIELDS, ROLE_MODELS } from '../constants/data';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadStorage, saveStorage } from '../utils/storage';

var PRIMARY = '#F97316';
var NAVY = '#000000';
var NAVY_MID = '#000000';
var BG = '#FFFFFF';
var WHITE = '#FFFFFF';
var BORDER = '#F0F0F0';
var MUTED = '#A3A3A3';
var TEXT = '#000000';
var TEXT_SUB = '#737373';
var GREEN = '#22C55E';
var BLUE = '#3B82F6';

var AVATAR_EMOJIS = [
  '🌟', '🔥', '💎', '🌙', '⚡', '🌊', '🎯', '🌸',
  '🦋', '🚀', '🎨', '🎵', '🐉', '🌈', '🍀', '👑',
  '🦊', '🐺', '🦁', '🐯', '🦄', '🐋', '🦅', '🌺',
];

var MILESTONES = [
  { days: 3,   label: '3日連続',  emoji: '🌱', color: GREEN },
  { days: 7,   label: '1週間',    emoji: '⚡', color: BLUE },
  { days: 14,  label: '2週間',    emoji: '🔥', color: PRIMARY },
  { days: 30,  label: '1ヶ月',    emoji: '🌟', color: '#F59E0B' },
  { days: 60,  label: '2ヶ月',    emoji: '💎', color: '#8B5CF6' },
  { days: 100, label: '100日',    emoji: '👑', color: '#EC4899' },
];

// ── Time Capsule helpers ──────────────────────────────────────────────────────
var CAPSULE_KEY = 'tomoshibi_capsules';

var REVEAL_OPTIONS = [
  { label: '1ヶ月後',  days: 30 },
  { label: '3ヶ月後',  days: 90 },
  { label: '6ヶ月後',  days: 180 },
  { label: '1年後',    days: 365 },
];
function daysUntil(timestamp) {
  var diff = timestamp - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
function formatDate(timestamp) {
  var d = new Date(timestamp);
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

function isValidUsername(val) {
  return val.length >= 2 && val.length <= 20 && !/\s/.test(val);
}

// ── CapsuleCard ───────────────────────────────────────────────────────────────
function CapsuleCard(props) {
  var capsule = props.capsule;
  var onOpen = props.onOpen;

  var remaining = daysUntil(capsule.revealAt);
  var isReady = remaining === 0 && !capsule.opened;
  var isOpened = capsule.opened;

  var scaleAnim = React.useRef(new Animated.Value(1)).current;

  function handlePress() {
    if (isReady) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }),
      ]).start(function() { onOpen && onOpen(capsule.id); });
    }
  }

  if (isOpened) {
    // White opened card
    return React.createElement(View, { style: cs.opened },
      React.createElement(View, { style: cs.openedHeader },
        React.createElement(Text, { style: cs.openedIcon }, '💌'),
        React.createElement(View, { style: { flex: 1 } },
          React.createElement(Text, { style: cs.openedTitle }, '過去の自分から'),
          React.createElement(Text, { style: cs.openedDate }, formatDate(capsule.writtenAt) + ' に書いた')
        )
      ),
      React.createElement(View, { style: cs.openedMsgWrap },
        React.createElement(Text, { style: cs.openedMsg }, capsule.message)
      )
    );
  }

  if (isReady) {
    // Orange-bordered ready card
    return React.createElement(Animated.View, { style: [cs.ready, { transform: [{ scale: scaleAnim }] }] },
      React.createElement(TouchableOpacity, { onPress: handlePress, activeOpacity: 0.9, style: { flex: 1 } },
        React.createElement(View, { style: cs.readyInner },
          React.createElement(Text, { style: cs.readyIcon }, '✉️'),
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: cs.readyTitle }, '開封できます！'),
            React.createElement(Text, { style: cs.readySub }, formatDate(capsule.writtenAt) + ' に封印')
          ),
          React.createElement(View, { style: cs.readyChip },
            React.createElement(Text, { style: cs.readyChipTxt }, '開封する')
          )
        )
      )
    );
  }

  // Sealed dark card
  return React.createElement(View, { style: cs.sealed },
    React.createElement(View, { style: cs.sealedTop },
      React.createElement(Text, { style: cs.sealedIcon }, '🔒'),
      React.createElement(View, { style: { flex: 1 } },
        React.createElement(Text, { style: cs.sealedTitle }, 'タイムカプセル'),
        React.createElement(Text, { style: cs.sealedDate }, formatDate(capsule.revealAt) + ' に開封')
      )
    ),
    React.createElement(View, { style: cs.sealedCountRow },
      React.createElement(Text, { style: cs.sealedCountNum }, remaining),
      React.createElement(Text, { style: cs.sealedCountUnit }, '日後に解錠')
    )
  );
}

// ── CapsuleWriteModal ─────────────────────────────────────────────────────────
function CapsuleWriteModal(props) {
  var visible = props.visible;
  var onClose = props.onClose;
  var onSave = props.onSave;

  var slideAnim = React.useRef(new Animated.Value(700)).current;
  var sm2 = React.useState('');
  var message = sm2[0];
  var setMessage = sm2[1];
  var sr = React.useState(0);
  var revealIdx = sr[0];
  var setRevealIdx = sr[1];

  React.useEffect(function() {
    if (visible) {
      setMessage('');
      setRevealIdx(0);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 700, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  function handleSave() {
    if (!message.trim()) return;
    var revealDays = REVEAL_OPTIONS[revealIdx].days;
    var now = Date.now();
    var capsule = {
      id: now + '_' + Math.random().toString(36).slice(2),
      message: message.trim(),
      writtenAt: now,
      revealAt: now + revealDays * 24 * 60 * 60 * 1000,
      opened: false,
    };
    onSave && onSave(capsule);
    onClose && onClose();
  }

  if (!visible) return null;

  return React.createElement(View, { style: cm.overlay },
    React.createElement(TouchableOpacity, { style: cm.backdrop, onPress: onClose, activeOpacity: 1 }),
    React.createElement(Animated.View, { style: [cm.sheet, { transform: [{ translateY: slideAnim }] }] },
      // Handle
      React.createElement(View, { style: cm.handle }),

      // Header
      React.createElement(View, { style: cm.header },
        React.createElement(Text, { style: cm.title }, '✉️  タイムカプセル'),
        React.createElement(TouchableOpacity, { onPress: onClose },
          React.createElement(Ionicons, { name: 'close', size: 22, color: '#888' })
        )
      ),
      React.createElement(Text, { style: cm.sub }, '未来の自分へのメッセージを書こう'),

      // Text input
      React.createElement(TextInput, {
        style: cm.input,
        value: message,
        onChangeText: setMessage,
        placeholder: '今の気持ち、目標、未来への言葉...',
        placeholderTextColor: '#555',
        multiline: true,
        numberOfLines: 5,
        maxLength: 500,
        autoFocus: true,
      }),
      React.createElement(Text, { style: cm.charCount }, message.length + '/500'),

      // Reveal date chips
      React.createElement(Text, { style: cm.chipLabel }, '開封するのはいつ？'),
      React.createElement(View, { style: cm.chipRow },
        REVEAL_OPTIONS.map(function(opt, i) {
          var selected = revealIdx === i;
          return React.createElement(TouchableOpacity, {
            key: i,
            style: [cm.chip, selected && cm.chipOn],
            onPress: function() { setRevealIdx(i); },
            activeOpacity: 0.8,
          },
            React.createElement(Text, { style: [cm.chipTxt, selected && cm.chipTxtOn] }, opt.label)
          );
        })
      ),

      // Seal button
      React.createElement(TouchableOpacity, {
        style: [cm.sealBtn, !message.trim() && cm.sealBtnDisabled],
        onPress: handleSave,
        activeOpacity: 0.85,
      },
        React.createElement(Text, { style: cm.sealBtnTxt }, '🔒  封印する'),
        React.createElement(Text, { style: cm.sealBtnSub }, REVEAL_OPTIONS[revealIdx].label + 'に開封')
      )
    )
  );
}

// ── TimeCapsuleSection ────────────────────────────────────────────────────────
function TimeCapsuleSection(props) {
  var capsules = props.capsules;
  var onWrite = props.onWrite;
  var onOpen = props.onOpen;

  var sealed = capsules.filter(function(c) { return !c.opened; });
  var opened = capsules.filter(function(c) { return c.opened; });

  return React.createElement(View, { style: styles.section },
    React.createElement(View, { style: cs.sectionHeader },
      React.createElement(Text, { style: styles.sectionTitle }, 'タイムカプセル'),
      React.createElement(TouchableOpacity, {
        style: cs.writeBtn,
        onPress: onWrite,
        activeOpacity: 0.8,
      },
        React.createElement(Ionicons, { name: 'add', size: 16, color: WHITE }),
        React.createElement(Text, { style: cs.writeBtnTxt }, '書く')
      )
    ),

    capsules.length === 0
      ? React.createElement(View, { style: cs.empty },
          React.createElement(Text, { style: cs.emptyIcon }, '✉️'),
          React.createElement(Text, { style: cs.emptyTitle }, '未来の自分に手紙を書こう'),
          React.createElement(Text, { style: cs.emptySub }, '封印して、決めた日に開封する')
        )
      : React.createElement(View, { style: { gap: 10 } },
          sealed.map(function(c) {
            return React.createElement(CapsuleCard, { key: c.id, capsule: c, onOpen: onOpen });
          }),
          opened.length > 0 && React.createElement(View, { style: cs.openedSection },
            React.createElement(Text, { style: cs.openedSectionTitle }, '開封済み'),
            opened.map(function(c) {
              return React.createElement(CapsuleCard, { key: c.id, capsule: c });
            })
          )
        )
  );
}

// ── Edit Modal ──────────────────────────────────────────────────────────────
function EditModal(props) {
  var visible = props.visible;
  var userData = props.userData;
  var onSave = props.onSave;
  var onClose = props.onClose;

  var se = React.useState(function() { return Object.assign({}, userData); });
  var editData = se[0];
  var setEditData = se[1];

  var serr = React.useState('');
  var usernameError = serr[0];
  var setUsernameError = serr[1];

  // When modal opens, reset edit data from latest userData
  React.useEffect(function() {
    if (visible) {
      setEditData(Object.assign({}, userData));
      setUsernameError('');
    }
  }, [visible]);

  var currentModels = ROLE_MODELS[editData.field] || ROLE_MODELS['other'];

  function handleFieldChange(fieldId) {
    var newModels = ROLE_MODELS[fieldId] || ROLE_MODELS['other'];
    setEditData(function(prev) {
      return Object.assign({}, prev, { field: fieldId, model: newModels[0], fieldLabel: '' });
    });
  }

  function handleSave() {
    var uname = (editData.username || '').trim();
    if (!isValidUsername(uname)) {
      setUsernameError('スペースなし、2〜20文字で入力してください');
      return;
    }
    setUsernameError('');
    onSave(editData);
  }

  return React.createElement(Modal, {
    visible: visible,
    animationType: 'slide',
    presentationStyle: 'pageSheet',
    onRequestClose: onClose
  },
    React.createElement(View, { style: em.root },
      // Modal header
      React.createElement(View, { style: em.modalHeader },
        React.createElement(TouchableOpacity, { style: em.cancelBtn, onPress: onClose },
          React.createElement(Text, { style: em.cancelText }, 'キャンセル')
        ),
        React.createElement(Text, { style: em.modalTitle }, 'プロフィール編集'),
        React.createElement(TouchableOpacity, { style: em.saveBtn, onPress: handleSave },
          React.createElement(Text, { style: em.saveText }, '保存')
        )
      ),

      React.createElement(KeyboardAvoidingView, {
        style: { flex: 1 },
        behavior: Platform.OS === 'ios' ? 'padding' : undefined
      },
        React.createElement(ScrollView, { style: em.scroll, contentContainerStyle: em.scrollContent, keyboardShouldPersistTaps: 'handled' },

          // ── Avatar ──
          React.createElement(View, { style: em.section },
            React.createElement(Text, { style: em.sectionTitle }, 'アバター'),
            React.createElement(Text, { style: em.sectionSub }, 'プロフィールアイコンを選んでね'),
            React.createElement(View, { style: em.avatarGrid },
              AVATAR_EMOJIS.map(function(emoji) {
                var selected = (editData.avatar || '') === emoji;
                return React.createElement(TouchableOpacity, {
                  key: emoji,
                  style: [em.avatarChip, selected && em.avatarChipOn],
                  onPress: function() { setEditData(function(p) { return Object.assign({}, p, { avatar: emoji }); }); }
                },
                  React.createElement(Text, { style: em.avatarChipEmoji }, emoji)
                );
              })
            )
          ),

          // ── Username ──
          React.createElement(View, { style: em.section },
            React.createElement(Text, { style: em.sectionTitle }, 'ユーザーネーム'),
            React.createElement(Text, { style: em.sectionSub }, '日本語・英数字OK、2〜20文字'),
            React.createElement(TextInput, {
              style: [em.textInput, usernameError && em.textInputError],
              value: editData.username || '',
              onChangeText: function(t) {
                setEditData(function(p) { return Object.assign({}, p, { username: t }); });
                if (/\s/.test(t)) {
                  setUsernameError('スペースは使えません');
                } else {
                  setUsernameError('');
                }
              },
              autoCapitalize: 'none',
              autoCorrect: false,
              placeholder: '@username',
              placeholderTextColor: MUTED
            }),
            usernameError !== '' && React.createElement(Text, { style: em.errorText }, usernameError)
          ),

          // ── Dream ──
          React.createElement(View, { style: em.section },
            React.createElement(Text, { style: em.sectionTitle }, '夢'),
            React.createElement(Text, { style: em.sectionSub }, 'あなたが叶えたいこと'),
            React.createElement(TextInput, {
              style: [em.textInput, em.textInputMulti],
              value: editData.dream || '',
              onChangeText: function(t) { setEditData(function(p) { return Object.assign({}, p, { dream: t }); }); },
              placeholder: '夢を入力してください',
              placeholderTextColor: MUTED,
              multiline: true,
              numberOfLines: 3
            })
          ),

          // ── Field ──
          React.createElement(View, { style: em.section },
            React.createElement(Text, { style: em.sectionTitle }, '🎯 ジャンル'),
            React.createElement(View, { style: em.chipGrid },
              FIELDS.map(function(f) {
                var selected = editData.field === f.id;
                return React.createElement(TouchableOpacity, {
                  key: f.id,
                  style: [em.chip, selected && em.chipOn],
                  onPress: function() { handleFieldChange(f.id); }
                },
                  React.createElement(Text, { style: [em.chipTxt, selected && em.chipTxtOn] }, f.label)
                );
              })
            ),
            editData.field === 'other' && React.createElement(TextInput, {
              style: [em.textInput, { marginTop: 10 }],
              value: editData.fieldLabel || '',
              onChangeText: function(t) { setEditData(function(p) { return Object.assign({}, p, { fieldLabel: t }); }); },
              placeholder: 'どんな分野ですか？',
              placeholderTextColor: MUTED
            })
          ),

          // ── Role Model ──
          React.createElement(View, { style: em.section },
            React.createElement(Text, { style: em.sectionTitle }, '✨ ロールモデル'),
            React.createElement(Text, { style: em.sectionSub }, '生き方が近いと思う人'),
            React.createElement(View, { style: em.modelList },
              currentModels.map(function(m, i) {
                var selected = editData.model && editData.model.name === m.name;
                return React.createElement(TouchableOpacity, {
                  key: i,
                  style: [em.modelCard, selected && em.modelCardOn],
                  onPress: function() { setEditData(function(p) { return Object.assign({}, p, { model: m }); }); }
                },
                  React.createElement(Text, { style: em.modelEmoji }, m.emoji),
                  React.createElement(View, { style: { flex: 1 } },
                    React.createElement(Text, { style: em.modelName }, m.name),
                    React.createElement(Text, { style: em.modelTag }, m.tagline)
                  ),
                  selected && React.createElement(Ionicons, { name: 'checkmark-circle', size: 22, color: PRIMARY })
                );
              })
            )
          ),

          // ── Mode ──
          React.createElement(View, { style: [em.section, { paddingBottom: 40 }] },
            React.createElement(Text, { style: em.sectionTitle }, 'モード'),
            React.createElement(View, { style: em.modeRow },
              React.createElement(TouchableOpacity, {
                style: [em.modeCard, editData.mode === 'busy' && em.modeCardOn],
                onPress: function() { setEditData(function(p) { return Object.assign({}, p, { mode: 'busy' }); }); }
              },
                React.createElement(Text, { style: em.modeEmoji }, '⚡'),
                React.createElement(Text, { style: em.modeTitle }, '忙しい'),
                React.createElement(Text, { style: em.modeSub }, '短時間でも確実に'),
                editData.mode === 'busy' && React.createElement(View, { style: em.modeCheck },
                  React.createElement(Ionicons, { name: 'checkmark-circle', size: 18, color: PRIMARY })
                )
              ),
              React.createElement(TouchableOpacity, {
                style: [em.modeCard, editData.mode === 'free' && em.modeCardOn],
                onPress: function() { setEditData(function(p) { return Object.assign({}, p, { mode: 'free' }); }); }
              },
                React.createElement(Text, { style: em.modeEmoji }, '🌊'),
                React.createElement(Text, { style: em.modeTitle }, '余裕モード'),
                React.createElement(Text, { style: em.modeSub }, 'じっくり深く'),
                editData.mode === 'free' && React.createElement(View, { style: em.modeCheck },
                  React.createElement(Ionicons, { name: 'checkmark-circle', size: 18, color: PRIMARY })
                )
              )
            )
          )
        )
      )
    )
  );
}

var em = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { fontSize: 15, color: MUTED },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7 },
  saveText: { fontSize: 15, fontWeight: '700', color: WHITE },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: MUTED, marginBottom: 10 },
  textInput: {
    backgroundColor: WHITE, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 13, fontSize: 15, color: TEXT,
    borderWidth: 1.5, borderColor: BORDER,
  },
  textInputError: { borderColor: '#EF4444' },
  textInputMulti: { minHeight: 88, textAlignVertical: 'top' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 6 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarChip: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: WHITE, borderWidth: 2, borderColor: BORDER,
  },
  avatarChipOn: { borderColor: PRIMARY, backgroundColor: '#FFF7ED' },
  avatarChipEmoji: { fontSize: 26 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: WHITE, borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 9, borderWidth: 1.5, borderColor: BORDER,
  },
  chipOn: { backgroundColor: '#FFF7ED', borderColor: PRIMARY },
  chipTxt: { color: TEXT_SUB, fontSize: 13, fontWeight: '600' },
  chipTxtOn: { color: PRIMARY },
  modelList: { gap: 10 },
  modelCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE,
    borderRadius: 16, padding: 14, gap: 12,
    borderWidth: 1.5, borderColor: BORDER,
  },
  modelCardOn: { borderColor: PRIMARY, backgroundColor: '#FFF7ED' },
  modelEmoji: { fontSize: 28 },
  modelName: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  modelTag: { fontSize: 12, color: TEXT_SUB, lineHeight: 17 },
  modeRow: { flexDirection: 'row', gap: 12 },
  modeCard: {
    flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: BORDER,
    position: 'relative',
  },
  modeCardOn: { borderColor: PRIMARY, backgroundColor: '#FFF7ED' },
  modeEmoji: { fontSize: 28, marginBottom: 8 },
  modeTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 4, textAlign: 'center' },
  modeSub: { fontSize: 11, color: TEXT_SUB, textAlign: 'center' },
  modeCheck: { position: 'absolute', top: 10, right: 10 },
});

// ── Share Card Generator ─────────────────────────────────────────────────────
// Flame level: 0=none, 1=small(7d), 2=medium(14d), 3=large(30d+)
function flameLevel(streak) {
  if (streak >= 30) return 3;
  if (streak >= 14) return 2;
  if (streak >= 7)  return 1;
  return 0;
}

function drawFlames(ctx, streak, x, y, size) {
  var level = flameLevel(streak);
  if (level === 0) return;
  ctx.font = size + 'px -apple-system, sans-serif';
  ctx.textBaseline = 'alphabetic';
  if (level === 1) {
    ctx.fillText('🔥', x, y);
  } else if (level === 2) {
    ctx.fillText('🔥', x, y);
    ctx.fillText('🔥', x + size * 0.95, y);
  } else {
    ctx.fillText('🔥', x, y);
    ctx.fillText('🔥', x + size * 0.95, y);
    ctx.fillText('🔥', x + size * 1.9, y);
  }
}

function generateShareCard(style, dream, streak, username) {
  var canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  var ctx = canvas.getContext('2d');
  var isLight = style === 'light';
  var level = flameLevel(streak);

  // Background
  ctx.fillStyle = isLight ? '#FFFFFF' : '#000000';
  ctx.fillRect(0, 0, 1080, 1080);

  if (isLight) {
    // Orange accent bar left
    ctx.fillStyle = '#F97316';
    ctx.fillRect(0, 0, 8, 1080);
    // Brand
    ctx.fillStyle = '#F97316';
    ctx.font = '700 28px -apple-system, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('TOMOSHIBI 灯', 60, 120);
    // Streak number
    ctx.fillStyle = '#000000';
    ctx.font = '900 220px -apple-system, sans-serif';
    ctx.fillText(streak + '', 52, 380);
    // Label
    ctx.fillStyle = '#737373';
    ctx.font = '600 48px -apple-system, sans-serif';
    ctx.fillText('日連続達成', 60, 450);
    // Flames (right side, scale by level)
    if (level > 0) {
      var flameSize = level === 3 ? 110 : level === 2 ? 90 : 72;
      drawFlames(ctx, streak, 1080 - (flameSize * level) - 60, 420, flameSize);
    }
    // Separator
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(60, 510, 960, 1);
    // Dream text
    ctx.fillStyle = '#000000';
    ctx.font = '700 52px -apple-system, sans-serif';
    var dreamText = dream.length > 20 ? dream.slice(0, 20) + '...' : dream;
    ctx.fillText(dreamText, 60, 620);
    // URL
    ctx.fillStyle = '#A3A3A3';
    ctx.font = '400 32px -apple-system, sans-serif';
    ctx.fillText('tomoshibi.codeyou.link', 60, 980);
  } else {
    // Brand
    ctx.fillStyle = '#F97316';
    ctx.font = '700 28px -apple-system, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('TOMOSHIBI 灯', 60, 120);
    // Streak number
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 220px -apple-system, sans-serif';
    ctx.fillText(streak + '', 52, 380);
    // Label
    ctx.fillStyle = '#A3A3A3';
    ctx.font = '600 48px -apple-system, sans-serif';
    ctx.fillText('日連続達成', 60, 450);
    // Flames (right side)
    if (level > 0) {
      var flameSizeD = level === 3 ? 110 : level === 2 ? 90 : 72;
      drawFlames(ctx, streak, 1080 - (flameSizeD * level) - 60, 420, flameSizeD);
    }
    // Orange bar
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.roundRect(60, 510, 200, 8, 4);
    ctx.fill();
    // Dream text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 52px -apple-system, sans-serif';
    var dreamTextD = dream.length > 20 ? dream.slice(0, 20) + '...' : dream;
    ctx.fillText(dreamTextD, 60, 640);
    // URL
    ctx.fillStyle = '#737373';
    ctx.font = '400 32px -apple-system, sans-serif';
    ctx.fillText('🔥 ' + streak + '日継続中  ·  tomoshibi.codeyou.link', 60, 980);
  }

  return canvas;
}

function doShare(style, dream, streak, username) {
  var canvas = generateShareCard(style, dream, streak, username);
  canvas.toBlob(function(blob) {
    var file = new File([blob], 'tomoshibi-' + streak + 'days.png', { type: 'image/png' });
    if (navigator && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: '灯 ' + streak + '日連続達成！',
        text: dream + ' に向けて ' + streak + '日連続で動いています！ #tomoshibi #灯',
      }).catch(function() {});
    } else {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'tomoshibi-' + streak + 'days.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }
  }, 'image/png');
}

// ── Share Modal ───────────────────────────────────────────────────────────────
function ShareModal(props) {
  var visible = props.visible;
  var onClose = props.onClose;
  var dream = props.dream;
  var streak = props.streak;
  var username = props.username;
  var slideAnim = React.useRef(new Animated.Value(600)).current;

  React.useEffect(function() {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return React.createElement(View, { style: sm.overlay },
    React.createElement(TouchableOpacity, { style: sm.backdrop, onPress: onClose, activeOpacity: 1 }),
    React.createElement(Animated.View, { style: [sm.sheet, { transform: [{ translateY: slideAnim }] }] },
      // Handle
      React.createElement(View, { style: sm.handle }),
      React.createElement(Text, { style: sm.sheetTitle }, 'シェアカードを選ぶ'),
      React.createElement(Text, { style: sm.sheetSub }, '画像を保存してInstagram・Xに投稿しよう'),

      // Card previews
      React.createElement(View, { style: sm.cardRow },
        // Light card
        React.createElement(TouchableOpacity, {
          style: sm.cardWrap,
          activeOpacity: 0.85,
          onPress: function() { doShare('light', dream, streak, username); onClose(); }
        },
          React.createElement(View, { style: [sm.previewCard, sm.previewLight] },
            React.createElement(View, { style: sm.previewAccent }),
            React.createElement(View, { style: sm.previewBody },
              React.createElement(Text, { style: [sm.previewBrand, { color: '#F97316' }] }, 'TOMOSHIBI 灯'),
              React.createElement(Text, { style: [sm.previewNum, { color: '#000' }] }, streak),
              React.createElement(Text, { style: [sm.previewLabel, { color: '#737373' }] }, '日連続達成'),
              React.createElement(View, { style: sm.previewSep }),
              React.createElement(Text, { style: [sm.previewDream, { color: '#000' }] } , dream.length > 12 ? dream.slice(0, 12) + '…' : dream)
            )
          ),
          React.createElement(Text, { style: sm.cardLabel }, 'ホワイト')
        ),

        // Dark card
        React.createElement(TouchableOpacity, {
          style: sm.cardWrap,
          activeOpacity: 0.85,
          onPress: function() { doShare('dark', dream, streak, username); onClose(); }
        },
          React.createElement(View, { style: [sm.previewCard, sm.previewDark] },
            React.createElement(View, { style: sm.previewBodyDark },
              React.createElement(Text, { style: [sm.previewBrand, { color: '#F97316' }] }, 'TOMOSHIBI 灯'),
              React.createElement(Text, { style: [sm.previewNum, { color: '#fff' }] }, streak),
              React.createElement(Text, { style: [sm.previewLabel, { color: '#737373' }] }, '日連続達成'),
              React.createElement(View, { style: sm.previewOrangeBar }),
              React.createElement(Text, { style: [sm.previewDream, { color: '#fff' }] }, dream.length > 12 ? dream.slice(0, 12) + '…' : dream)
            )
          ),
          React.createElement(Text, { style: sm.cardLabel }, 'ブラック')
        )
      ),

      React.createElement(TouchableOpacity, { style: sm.cancelBtn, onPress: onClose },
        React.createElement(Text, { style: sm.cancelTxt }, 'キャンセル')
      )
    )
  );
}

var sm = StyleSheet.create({
  overlay:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, justifyContent: 'flex-end' },
  backdrop:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:        { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  handle:       { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:   { fontSize: 18, fontWeight: '800', color: '#000', letterSpacing: -0.3, marginBottom: 4 },
  sheetSub:     { fontSize: 13, color: '#A3A3A3', marginBottom: 24 },
  cardRow:      { flexDirection: 'row', gap: 14, marginBottom: 20 },
  cardWrap:     { flex: 1, alignItems: 'center', gap: 10 },
  previewCard:  { width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' },
  previewLight: { backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#F0F0F0' },
  previewDark:  { backgroundColor: '#000000' },
  previewAccent:{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#F97316' },
  previewBody:  { flex: 1, padding: 14, paddingLeft: 18 },
  previewBodyDark: { flex: 1, padding: 14 },
  previewBrand: { fontSize: 8, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  previewNum:   { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  previewLabel: { fontSize: 10, fontWeight: '600', marginBottom: 10 },
  previewSep:   { height: 0.5, backgroundColor: '#F0F0F0', marginBottom: 8 },
  previewOrangeBar: { width: 28, height: 3, backgroundColor: '#F97316', borderRadius: 2, marginBottom: 8 },
  previewDream: { fontSize: 11, fontWeight: '700', lineHeight: 16 },
  cardLabel:    { fontSize: 13, fontWeight: '600', color: '#000' },
  cancelBtn:    { paddingVertical: 16, alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 14 },
  cancelTxt:    { fontSize: 15, fontWeight: '600', color: '#737373' },
});

// ── Main ProfileScreen ───────────────────────────────────────────────────────
export default function ProfileScreen(props) {
  var userData = props.userData;
  var streak = props.streak || 0;
  var onUpdate = props.onUpdate;
  var stats = props.stats || {};

  var insets = useSafeAreaInsets();

  var se = React.useState(false);
  var editOpen = se[0];
  var setEditOpen = se[1];

  var ss = React.useState(false);
  var shareOpen = ss[0];
  var setShareOpen = ss[1];

  var sc = React.useState(false);
  var capsuleWriteOpen = sc[0];
  var setCapsuleWriteOpen = sc[1];

  var scaps = React.useState([]);
  var capsules = scaps[0];
  var setCapsules = scaps[1];

  // 起動時にカプセルをロード
  React.useEffect(function() {
    loadStorage(CAPSULE_KEY).then(function(saved) {
      if (saved && saved.length > 0) setCapsules(saved);
    });
  }, []);

  var username = (userData && userData.username) || 'anonymous';
  var dream = (userData && userData.dream) || '夢を設定中...';
  var field = (userData && userData.field) || null;
  var fieldLabel = (userData && userData.fieldLabel) || '';
  var model = (userData && userData.model) || null;
  var mode = (userData && userData.mode) || null;

  var FIELD_MAP = {};
  FIELDS.forEach(function(f) { FIELD_MAP[f.id] = f.label; });
  var displayField = field === 'other' ? ('✨ ' + fieldLabel) : (FIELD_MAP[field] || '');

  var avatarAnim = React.useRef(new Animated.Value(0)).current;
  var statsAnim = React.useRef(new Animated.Value(1)).current;
  React.useEffect(function() {
    Animated.spring(avatarAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }).start();
  }, []);

  var totalTasksDone = stats.totalTasksDone || 0;
  var daysActive = (stats.daysActive && stats.daysActive.length) || 0;
  var joinDate = stats.joinDate ? new Date(stats.joinDate) : new Date();
  var joinLabel = joinDate.getFullYear() + '年' + (joinDate.getMonth() + 1) + '月から';

  function handleSave(newData) {
    if (onUpdate) onUpdate(newData);
    setEditOpen(false);
  }

  function handleAddCapsule(capsule) {
    var next = capsules.concat([capsule]);
    setCapsules(next);
    saveStorage(CAPSULE_KEY, next);
  }

  function handleOpenCapsule(id) {
    var next = capsules.map(function(c) {
      if (c.id === id) return Object.assign({}, c, { opened: true });
      return c;
    });
    setCapsules(next);
    saveStorage(CAPSULE_KEY, next);
  }

  return React.createElement(View, { style: styles.container },
    React.createElement(EditModal, {
      visible: editOpen,
      userData: userData,
      onSave: handleSave,
      onClose: function() { setEditOpen(false); }
    }),
    React.createElement(ShareModal, {
      visible: shareOpen,
      onClose: function() { setShareOpen(false); },
      dream: dream,
      streak: streak,
      username: username,
    }),
    React.createElement(CapsuleWriteModal, {
      visible: capsuleWriteOpen,
      onClose: function() { setCapsuleWriteOpen(false); },
      onSave: handleAddCapsule,
    }),

    React.createElement(ScrollView, { style: { flex: 1 }, showsVerticalScrollIndicator: false },
      // Header
      React.createElement(View, { style: [styles.header, { paddingTop: insets.top + 12 }] },
        // Edit button
        React.createElement(TouchableOpacity, {
          style: [styles.editBtn, { top: insets.top + 12 }],
          onPress: function() { setEditOpen(true); }
        },
          React.createElement(Ionicons, { name: 'create-outline', size: 16, color: TEXT }),
          React.createElement(Text, { style: styles.editBtnText }, '編集')
        ),

        React.createElement(Animated.View, { style: [styles.avatarWrap, { transform: [{ scale: avatarAnim }] }] },
          userData && userData.avatar
            ? React.createElement(View, { style: styles.avatarEmoji },
                React.createElement(Text, { style: styles.avatarEmojiText }, userData.avatar)
              )
            : React.createElement(View, { style: styles.avatar },
                React.createElement(Text, { style: styles.avatarText }, username.charAt(0).toUpperCase())
              ),
          streak >= 3 && React.createElement(View, { style: styles.streakBadgeOnAvatar },
            React.createElement(Text, { style: styles.streakBadgeText }, '🔥')
          )
        ),
        React.createElement(Text, { style: styles.username }, '@' + username),
        React.createElement(View, { style: styles.dreamBadge },
          React.createElement(Text, { style: styles.dreamBadgeText }, dream)
        ),
        React.createElement(View, { style: styles.tagsRow },
          displayField !== '' && React.createElement(View, { style: styles.tagChip },
            React.createElement(Text, { style: styles.tagChipText }, displayField)
          ),
          model && React.createElement(View, { style: styles.tagChip },
            React.createElement(Text, { style: styles.tagChipText }, model.name)
          ),
          mode && React.createElement(View, { style: styles.tagChip },
            React.createElement(Text, { style: styles.tagChipText }, mode === 'busy' ? '忙しいモード' : '余裕モード')
          )
        )
      ),

      // Streak card
      React.createElement(Animated.View, { style: [styles.section, { opacity: statsAnim }] },
        React.createElement(View, { style: styles.streakCard },
          React.createElement(View, { style: styles.streakInner },
            React.createElement(View, { style: styles.streakLeft },
              React.createElement(Text, { style: styles.streakNum }, streak),
              React.createElement(Text, { style: styles.streakUnit }, '日連続')
            ),
            React.createElement(View, { style: styles.streakRight },
              React.createElement(Text, { style: styles.streakMsg },
                streak === 0 ? '今日から始めよう！'
                : streak < 7 ? '調子いいね！続けよう🔥'
                : streak < 30 ? '習慣になってきた！最高🚀'
                : '伝説級のストリーク👑'
              ),
              React.createElement(Text, { style: styles.streakSub }, '🎯 75%達成で更新')
            )
          )
        )
      ),

      // Share button
      React.createElement(View, { style: styles.section },
        React.createElement(TouchableOpacity, {
          style: styles.shareBtn,
          activeOpacity: 0.85,
          onPress: function() { setShareOpen(true); }
        },
          React.createElement(Ionicons, { name: 'share-outline', size: 18, color: '#fff' }),
          React.createElement(Text, { style: styles.shareBtnTxt }, '達成をシェアする')
        )
      ),

      // Stats
      React.createElement(Animated.View, { style: [styles.section, { opacity: statsAnim }] },
        React.createElement(Text, { style: styles.sectionTitle }, '実績'),
        React.createElement(View, { style: styles.statList },
          [
            { label: 'タスク完了', value: totalTasksDone + '', color: GREEN },
            { label: 'アクティブ日数', value: daysActive + '', color: BLUE },
            { label: 'ストリーク', value: streak + '日', color: PRIMARY },
            { label: '参加', value: joinLabel, color: MUTED },
          ].map(function(stat, i) {
            return React.createElement(View, { key: i },
              React.createElement(View, { style: styles.statRow },
                React.createElement(Text, { style: styles.statRowLabel }, stat.label),
                React.createElement(Text, { style: [styles.statRowValue, { color: stat.color }] }, stat.value)
              ),
              i < 3 && React.createElement(View, { style: styles.rowSep })
            );
          })
        )
      ),

      // Badges
      React.createElement(Animated.View, { style: [styles.section, { opacity: statsAnim }] },
        React.createElement(Text, { style: styles.sectionTitle }, 'バッジ'),
        React.createElement(View, { style: styles.badgeGrid },
          MILESTONES.map(function(m) {
            var unlocked = streak >= m.days;
            return React.createElement(View, { key: m.days, style: [styles.badge, !unlocked && styles.badgeLocked] },
              React.createElement(Text, { style: [styles.badgeEmoji, !unlocked && { opacity: 0.3 }] }, m.emoji),
              React.createElement(Text, { style: [styles.badgeLabel, !unlocked && styles.badgeLabelLocked] }, m.label)
            );
          })
        ),
        (function() {
          var next = null;
          for (var i = 0; i < MILESTONES.length; i++) {
            if (streak < MILESTONES[i].days) { next = MILESTONES[i]; break; }
          }
          if (!next) return null;
          return React.createElement(View, { style: styles.nextBox },
            React.createElement(Text, { style: styles.nextText }, '次のバッジまで あと'),
            React.createElement(Text, { style: styles.nextDays }, (next.days - streak) + '日'),
            React.createElement(View, { style: styles.nextTrack },
              React.createElement(View, {
                style: [styles.nextFill, { width: Math.round((streak / next.days) * 100) + '%' }]
              })
            )
          );
        })()
      ),

      // Dream progress
      React.createElement(Animated.View, { style: [styles.section, { opacity: statsAnim }] },
        React.createElement(Text, { style: styles.sectionTitle }, '夢への道のり'),
        React.createElement(View, { style: styles.dreamCard },
          React.createElement(Text, { style: styles.dreamCardText }, dream),
          React.createElement(View, { style: styles.dreamCardRow },
            React.createElement(View, { style: styles.dreamCardItem },
              React.createElement(Ionicons, { name: 'flame', size: 16, color: PRIMARY }),
              React.createElement(Text, { style: styles.dreamCardItemText }, streak + '日継続中')
            ),
            React.createElement(View, { style: styles.dreamCardItem },
              React.createElement(Ionicons, { name: 'checkmark-circle', size: 16, color: GREEN }),
              React.createElement(Text, { style: styles.dreamCardItemText }, totalTasksDone + 'タスク完了')
            )
          )
        )
      ),

      // Time Capsule
      React.createElement(Animated.View, { style: [{ opacity: statsAnim, paddingBottom: 40 }] },
        React.createElement(TimeCapsuleSection, {
          capsules: capsules,
          onWrite: function() { setCapsuleWriteOpen(true); },
          onOpen: handleOpenCapsule,
        })
      )
    )
  );
}

var styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingBottom: 28, paddingHorizontal: 20, alignItems: 'center', backgroundColor: WHITE, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  editBtn: {
    position: 'absolute', right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  editBtnText: { color: TEXT, fontSize: 13, fontWeight: '600' },
  avatarWrap: { marginBottom: 12, position: 'relative' },
  avatar: {
    width: 86, height: 86, borderRadius: 43,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#000000',
  },
  avatarEmoji: {
    width: 86, height: 86, borderRadius: 43,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F8F8F8',
  },
  avatarEmojiText: { fontSize: 44 },
  avatarText: { fontSize: 38, fontWeight: '800', color: WHITE },
  streakBadgeOnAvatar: {
    position: 'absolute', bottom: 0, right: -2,
    backgroundColor: WHITE, borderRadius: 12, width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  streakBadgeText: { fontSize: 13 },
  username: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 8 },
  dreamBadge: {
    backgroundColor: '#F8F8F8', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 12, maxWidth: '90%',
  },
  dreamBadgeText: { color: TEXT, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tagChip: {
    backgroundColor: '#F0F0F0', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  tagChipText: { color: TEXT_SUB, fontSize: 12, fontWeight: '500' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 12 },
  streakCard: { borderRadius: 16, overflow: 'hidden' },
  streakInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 20, backgroundColor: '#F8F8F8', borderRadius: 16,
  },
  streakLeft: { alignItems: 'center' },
  streakNum: { fontSize: 48, fontWeight: '900', color: PRIMARY, lineHeight: 54 },
  streakUnit: { fontSize: 14, fontWeight: '600', color: TEXT_SUB },
  streakRight: { flex: 1, paddingLeft: 20 },
  streakMsg: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 4, lineHeight: 22 },
  streakSub: { fontSize: 12, color: MUTED },
  statList: { backgroundColor: '#F8F8F8', borderRadius: 16, overflow: 'hidden' },
  statRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  statRowLabel: { fontSize: 14, color: TEXT, fontWeight: '500' },
  statRowValue: { fontSize: 16, fontWeight: '800' },
  rowSep:   { height: 0.5, backgroundColor: '#E8E8E8', marginHorizontal: 16 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  badge: {
    backgroundColor: '#F8F8F8', borderRadius: 14, padding: 12,
    alignItems: 'center', width: '30%',
  },
  badgeLocked: { backgroundColor: '#FAFAFA', opacity: 0.5 },
  badgeEmoji: { fontSize: 22, marginBottom: 5 },
  badgeLabel: { fontSize: 11, fontWeight: '700', color: TEXT, textAlign: 'center' },
  badgeLabelLocked: { color: MUTED },
  nextBox: { backgroundColor: '#F8F8F8', borderRadius: 14, padding: 14 },
  nextText: { fontSize: 12, color: TEXT_SUB, marginBottom: 4 },
  nextDays: { fontSize: 20, fontWeight: '800', color: PRIMARY, marginBottom: 8 },
  nextTrack: { height: 4, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' },
  nextFill: { height: 4, backgroundColor: PRIMARY, borderRadius: 2 },
  dreamCard: {
    backgroundColor: '#F8F8F8', borderRadius: 16, padding: 18,
  },
  dreamCardText: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 12, lineHeight: 22 },
  dreamCardRow: { flexDirection: 'row', gap: 16 },
  dreamCardItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dreamCardItemText: { fontSize: 13, color: TEXT_SUB, fontWeight: '600' },
  shareBtn:    { backgroundColor: '#000000', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shareBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ── Capsule Card Styles ───────────────────────────────────────────────────────
var cs = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 16, marginTop: 20 },
  writeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#000', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  writeBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Empty state
  empty: { marginHorizontal: 16, backgroundColor: '#F8F8F8', borderRadius: 16, padding: 28, alignItems: 'center' },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 4, textAlign: 'center' },
  emptySub: { fontSize: 12, color: MUTED, textAlign: 'center' },

  // Sealed (dark)
  sealed: { marginHorizontal: 16, backgroundColor: '#111111', borderRadius: 16, padding: 18 },
  sealedTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sealedIcon: { fontSize: 24 },
  sealedTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  sealedDate: { fontSize: 12, color: '#888888' },
  sealedCountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  sealedCountNum: { fontSize: 42, fontWeight: '900', color: PRIMARY, lineHeight: 46 },
  sealedCountUnit: { fontSize: 14, fontWeight: '600', color: '#888888' },

  // Ready to open (orange border)
  ready: { marginHorizontal: 16, borderRadius: 16, borderWidth: 2, borderColor: PRIMARY, backgroundColor: '#FFF7ED', overflow: 'hidden' },
  readyInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  readyIcon: { fontSize: 28 },
  readyTitle: { fontSize: 14, fontWeight: '700', color: PRIMARY, marginBottom: 2 },
  readySub: { fontSize: 12, color: TEXT_SUB },
  readyChip: { backgroundColor: PRIMARY, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  readyChipTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Opened (white card)
  opened: { marginHorizontal: 16, backgroundColor: '#F8F8F8', borderRadius: 16, padding: 18 },
  openedHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  openedIcon: { fontSize: 24 },
  openedTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  openedDate: { fontSize: 12, color: MUTED },
  openedMsgWrap: { backgroundColor: WHITE, borderRadius: 12, padding: 14 },
  openedMsg: { fontSize: 14, color: TEXT, lineHeight: 22 },

  // Opened section divider
  openedSection: { marginTop: 16, gap: 10 },
  openedSectionTitle: { fontSize: 12, fontWeight: '600', color: MUTED, paddingHorizontal: 16, marginBottom: 4 },
});

// ── Capsule Write Modal Styles ────────────────────────────────────────────────
var cm = StyleSheet.create({
  overlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#111111', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: 44, paddingTop: 12,
  },
  handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title:  { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  sub:    { fontSize: 13, color: '#888888', marginBottom: 18 },
  input: {
    backgroundColor: '#1E1E1E', borderRadius: 14, padding: 16,
    fontSize: 15, color: '#FFFFFF', minHeight: 120,
    textAlignVertical: 'top', borderWidth: 1, borderColor: '#2A2A2A',
    marginBottom: 6,
  },
  charCount: { fontSize: 11, color: '#555', textAlign: 'right', marginBottom: 18 },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#AAAAAA', marginBottom: 10 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 24 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: '#333333', backgroundColor: '#1A1A1A' },
  chipOn: { borderColor: PRIMARY, backgroundColor: 'rgba(249,115,22,0.15)' },
  chipTxt: { color: '#888888', fontSize: 13, fontWeight: '600' },
  chipTxtOn: { color: PRIMARY },
  sealBtn: {
    backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', gap: 2,
  },
  sealBtnDisabled: { opacity: 0.4 },
  sealBtnTxt: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  sealBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
});
