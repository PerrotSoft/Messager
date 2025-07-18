// auth-service.js

import { auth, db } from './firebase-init.js';
import {
  usernameDisplay,
  settingUsernameInput,
  currentAvatarPreview
} from './dom-elements.js';
import { getColorForChat,resizeImageToBase64 } from './utils.js';
import { loadChatList, selectChat } from './chat-list-manager.js';

export let currentUser = null;
export let currentUserId = null;
export let currentUsername = null;
export let currentUserAvatarUrl = null;

export function updateUsernameDisplay() {
  const avatarHtml = currentUserAvatarUrl
    ? `<img src="${currentUserAvatarUrl}" alt="Аватар" class="user-avatar-small">`
    : `<span class="user-avatar-small" style="background-color: ${getColorForChat(currentUserId)};">${currentUsername.charAt(0).toUpperCase()}</span>`;
  usernameDisplay.innerHTML = `${avatarHtml} ${currentUsername}`;
}

export function updateCurrentAvatarPreview(url) {
  if (url) {
    currentAvatarPreview.innerHTML = `<img src="${url}" alt="Аватар">`;
  } else {
    currentAvatarPreview.innerHTML = currentUsername.charAt(0).toUpperCase();
    currentAvatarPreview.style.backgroundColor = getColorForChat(currentUserId);
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentUserId() {
  return currentUserId;
}

export function getCurrentUsername() {
  return currentUsername;
}

export function getCurrentUserAvatarUrl() {
  return currentUserAvatarUrl;
}

export function setCurrentUserAvatarUrl(url) {
  currentUserAvatarUrl = url;
}

export async function initializeAuth(selectChatCallback) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      currentUserId = user.uid;

      const userSnapshot = await db.ref('users/' + currentUserId).once('value');
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        currentUsername = userData.username;
        currentUserAvatarUrl = userData.avatarBase64 || null;
        updateUsernameDisplay();
        settingUsernameInput.value = currentUsername;
        updateCurrentAvatarPreview(currentUserAvatarUrl);
      } else {
        console.error("Имя пользователя не найдено в БД для UID:", currentUserId);
        logout();
        return;
      }

      await loadChatList();

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('user')) {
        const userId = urlParams.get('user');
        const targetUserSnapshot = await db.ref('users/' + userId).once('value');
        if (targetUserSnapshot.exists()) {
          const targetUserData = targetUserSnapshot.val();
          const privateChatId = [currentUserId, userId].sort().join('_');
          selectChatCallback('private_chat', privateChatId, targetUserData.username, targetUserData.avatarBase64 || null);
        } else {
          console.warn('Пользователь с ID ' + userId + ' не найден.');
          selectChatCallback('group', 'general', 'Общая группа');
        }
      } else if (urlParams.has('group')) {
        const groupId = urlParams.get('group');
        const groupSnapshot = await db.ref('groups/' + groupId).once('value');
        if (groupSnapshot.exists()) {
          const groupData = groupSnapshot.val();
          selectChatCallback('group', groupId, groupData.name, groupData.avatarUrl || null);
        } else {
          console.warn('Группа с ID ' + groupId + ' не найдена.');
          selectChatCallback('group', 'general', 'Общая группа');
        }
      } else if (urlParams.has('channel')) {
        const channelId = urlParams.get('channel');
        const channelSnapshot = await db.ref('channels/' + channelId).once('value');
        if (channelSnapshot.exists()) {
          const channelData = channelSnapshot.val();
          selectChatCallback('channel', channelId, channelData.name, channelData.avatarUrl || null);
        } else {
          console.warn('Канал с ID ' + channelId + ' не найден.');
          selectChatCallback('group', 'general', 'Общая группа');
        }
      } else {
        selectChatCallback('group', 'general', 'Общая группа');
      }

    } else {
      window.location.href = 'auth.html';
    }
  });
}

export function logout() {
  auth.signOut().then(() => {
    console.log("Выход выполнен успешно.");
    clearUserData();
    window.location.href = 'auth.html';
  }).catch((error) => {
    console.error("Ошибка при выходе:", error);
    alert("Ошибка при выходе: " + error.message);
  });
}

export function setUserData(user, userData) {
  currentUser = user;
  currentUserId = user.uid;
  currentUsername = userData.username;
  currentUserAvatarUrl = userData.avatarBase64 || null;
}

export function clearUserData() {
  currentUser = null;
  currentUserId = null;
  currentUsername = null;
  currentUserAvatarUrl = null;
}