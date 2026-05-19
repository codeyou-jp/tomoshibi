import { Platform } from 'react-native';

// expo-notifications はネイティブのみ対応。Webでは何もしない。
var notif = null;
if (Platform.OS !== 'web') {
  try { notif = require('expo-notifications'); } catch (e) {}
}

var DAILY_NOTIF_ID = 'tomoshibi_daily_reminder';

var MESSAGES = [
  '今日も一歩、夢に近づこう🔥',
  '継続は力なり。今日もやること終わらせよう✨',
  '昨日より少しだけ前に進もう。応援してるよ🌟',
  '夢を持ち続けること自体が才能。今日も頑張ろう',
  '小さな積み重ねが、大きな結果を生む🔥',
];

function pickMessage() {
  var i = new Date().getDate() % MESSAGES.length;
  return MESSAGES[i];
}

// 通知権限をリクエストして、デイリーリマインダーをスケジュール
// onboarding完了直後に呼ぶ
export async function setupDailyReminder() {
  if (!notif || Platform.OS === 'web') return;

  try {
    // 権限リクエスト
    var { status: existing } = await notif.getPermissionsAsync();
    var finalStatus = existing;
    if (existing !== 'granted') {
      var { status } = await notif.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return; // 拒否されたら何もしない

    // 通知ハンドラー設定（アプリ前面時もバナー表示）
    notif.setNotificationHandler({
      handleNotification: async function() {
        return {
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      },
    });

    // 既存のデイリー通知をキャンセルして重複回避
    var scheduled = await notif.getAllScheduledNotificationsAsync();
    for (var n of scheduled) {
      if (n.identifier === DAILY_NOTIF_ID) {
        await notif.cancelScheduledNotificationAsync(DAILY_NOTIF_ID);
        break;
      }
    }

    // 毎朝9:00にデイリーリマインダーをスケジュール
    await notif.scheduleNotificationAsync({
      identifier: DAILY_NOTIF_ID,
      content: {
        title: '灯 🔥 今日のやること',
        body: pickMessage(),
      },
      trigger: {
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });
  } catch (e) {
    // 通知セットアップ失敗はサイレントに無視
  }
}
