import AsyncStorage from '@react-native-async-storage/async-storage';

// ネイティブ（iOS/Android）: AsyncStorage
// Web: AsyncStorageが内部でlocalStorageにフォールバック
// → 全プラットフォームでこのファイルだけ使えばOK

export async function loadStorage(key) {
  try {
    var val = await AsyncStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch (e) { return null; }
}

export async function saveStorage(key, val) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}

export async function removeStorage(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {}
}
