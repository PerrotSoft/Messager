// chat-list-manager.js
import { db } from './firebase-init.js';
import {
  chatListElement
} from './dom-elements.js';
import {
  getColorForChat,
  resizeImageToBase64
} from './utils.js';
import {
  getCurrentUserId,
  getCurrentUsername,
  getCurrentUserAvatarUrl
} from './auth-service.js';
import {
  displayMessage,
  clearChatMessages
} from './chat-message-manager.js'; // For selectChat to clear/load messages
import {
  updateChatOptionsMenu
} from './chat-options.js';


export let currentChatId = null;
export let currentChatMode = null;
let currentMessageListener = null;

export function getCurrentChatId() {
  return currentChatId;
}

export function getCurrentChatMode() {
  return currentChatMode;
}

export async function selectChat(type, id, name, avatarUrl) {
  // Скрытие меню опций чата
  document.getElementById('chatOptionsMenu').style.display = 'none';

  currentChatMode = type;
  currentChatId = id;

  document.getElementById('currentChatName').textContent = name;

  const chatTypeText = {
    user: 'Личный чат (Вы)',
    private_chat: 'Личный чат',
    group: 'Группа',
    channel: 'Канал',
    bot: 'Бот'
  };
  document.getElementById('currentChatType').textContent = chatTypeText[type] || 'Чат';

  const currentChatAvatar = document.getElementById('currentChatAvatar');

  // Обработка аватарки
  if (avatarUrl && avatarUrl.startsWith("data:image/")) {
    currentChatAvatar.innerHTML = `<img src="${avatarUrl}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    currentChatAvatar.style.backgroundColor = 'transparent';
  } else {
    // Показываем первую букву имени, если аватарки нет
    const letter = name?.charAt(0)?.toUpperCase() || '?';
    currentChatAvatar.innerHTML = letter;
    currentChatAvatar.style.backgroundColor = getColorForChat(id);
  }

  // Настройки интерфейса для каналов
  const isChannel = type === 'channel';
  document.getElementById('messageInput').disabled = isChannel;
  document.getElementById('imageInput').disabled = isChannel;
  document.getElementById('documentInput').disabled = isChannel;
  document.getElementById('messageInput').placeholder = isChannel ? 'В каналах нельзя писать сообщения' : 'Написать сообщение...';

  document.getElementById('channelComponentsBtn').style.display = isChannel ? 'flex' : 'none';

  // Выделение активного чата
  document.querySelectorAll('.chat-list-item').forEach(item => item.classList.remove('active'));
  const selectedItem = document.querySelector(`.chat-list-item[data-type="${type}"][data-id="${id}"]`);
  if (selectedItem) selectedItem.classList.add('active');

  // Очистка предыдущих слушателей сообщений
  if (currentMessageListener) {
    currentMessageListener.off('child_added');
    currentMessageListener.off('child_removed');
    currentMessageListener = null;
  }

  clearChatMessages(); // Очистка сообщений

  // Получение нужной ссылки на сообщения
  let messagesRef;
  if (type === 'group') {
    messagesRef = db.ref(`chat_messages/group/${id}`);
  } else if (type === 'channel') {
    messagesRef = db.ref(`chat_messages/channel/${id}`);
  } else if (type === 'private_chat') {
    messagesRef = db.ref(`chat_messages/private_chat/${id}`);
  } else if (type === 'user' && id === getCurrentUserId()) {
    const selfId = getCurrentUserId();
    messagesRef = db.ref(`chat_messages/private_chat/${[selfId, selfId].sort().join('_')}`);
  } else {
    console.error("Неизвестный тип чата:", type);
    return;
  }

  currentMessageListener = messagesRef; // Обновляем ссылку на текущего слушателя

  // --- ИСПРАВЛЕНИЕ ДУБЛИРОВАНИЯ СООБЩЕНИЙ ---
  let lastMessageKey = null;

  // 1. Загрузка последних 50 сообщений ОДИН раз
  const initialMessagesSnapshot = await messagesRef.limitToLast(50).once('value', (snapshot) => {
    snapshot.forEach((childSnapshot) => {
      const message = { id: childSnapshot.key, ...childSnapshot.val() };
      const isMe = message.senderId === getCurrentUserId();
      displayMessage(message, isMe, true); // true для "isHistorical"
      lastMessageKey = childSnapshot.key; // Сохраняем ключ последнего сообщения
    });
  }, (error) => {
    console.error("Ошибка при получении начальных сообщений:", error);
  });

  // 2. Установка слушателя только для новых сообщений (после последнего загруженного)
  // Используем `startAt(lastMessageKey)` чтобы получить сообщения, которые были добавлены
  // после того, как мы получили наш initial snapshot.
  // Если lastMessageKey === null (нет начальных сообщений), то startAt(null) будет слушать все,
  // но clearChatMessages() и displayMessage(..., true) уже обработали бы дубликаты.
  // Для избежания дубликатов с `startAt`, мы можем использовать `orderByKey().startAt(lastMessageKey || '')`
  // и отфильтровать первое сообщение, если оно совпадает с lastMessageKey, чтобы оно не было добавлено дважды.
  // Более надежный способ: просто слушать с `on('child_added')` без `startAt`, но в `displayMessage`
  // добавить проверку, если сообщение с таким ID уже существует в DOM.
  // Или, что лучше, использовать `orderByChild('timestamp')` для `on('child_added')` с `startAt(lastMessageTimestamp)`
  // и добавить смещение, чтобы пропустить последнее сообщение из начальной загрузки.

  // Более простое и эффективное решение: использовать displayMessage(..., true) для исторических
  // сообщений, и displayMessage(..., false) для новых.
  // И не использовать `once('value')` для начальной загрузки, а полагаться только на `on('child_added')`
  // с некоторой логикой для отметки уже загруженных.
  // Но, поскольку у нас уже есть `clearChatMessages()` и `displayMessage()`,
  // проще всего убрать `once('value')` и положиться только на `on('child_added')`
  // с учетом того, что он вернет и старые сообщения при первом вызове.

  // --- НОВАЯ ЛОГИКА ИСПРАВЛЕНИЯ ---
  // Вместо двух отдельных слушателей, используем один on('child_added')
  // и полагаемся на логику в displayMessage, которая может проверять,
  // существует ли уже сообщение в DOM.

  // Удаляем старый `currentMessageListener.off('child_added');`
  // и устанавливаем новый.

  currentMessageListener = messagesRef; // Обновляем ссылку на текущего слушателя

  // Важно: on('child_added') вызовет событие для каждого существующего дочернего элемента
  // при первом подключении. displayMessage должен быть достаточно умным, чтобы не дублировать.
  // Мы можем передать флаг `isInitialLoad` в `displayMessage`.
  // ИЛИ: Если `clearChatMessages()` всегда вызывается, то дублирования не должно быть.
  // Дублирование происходит, если `on('child_added')` и `once('value')`
  // оба добавляют сообщения в ОДИНАКОВОЕ место, не зная друг о друге.

  // Давайте перепишем этот блок.
  // 1. Очищаем чат.
  // 2. Загружаем последние N сообщений (однократно).
  // 3. Устанавливаем слушатель для будущих сообщений.

  // Вариант 1: Использовать только on('child_added') и очистку.
  // Это проще всего, но Firebase может медленно возвращать всю историю.
  // messagesRef.limitToLast(50).on('child_added', (snapshot) => {
  //     const message = { id: snapshot.key, ...snapshot.val() };
  //     const isMe = message.senderId === getCurrentUserId();
  //     displayMessage(message, isMe); // Должно корректно работать, если chatMessages пуст
  // }, (error) => {
  //     console.error("Ошибка при получении сообщений:", error);
  // });

  // Вариант 2: Загрузить исторические, а потом слушать новые.
  // Это предпочтительнее для UX, т.к. история загружается быстрее.
  // Проблема была в том, как именно это делалось.

  // Сбрасываем слушатель, очищаем.
  if (currentMessageListener) {
    currentMessageListener.off('child_added');
    currentMessageListener.off('child_removed');
  }
  clearChatMessages();

  // Загружаем последние 50 сообщений один раз, чтобы отобразить историю.
  // Ключ последнего сообщения будет использоваться для startAt в child_added.
  let lastLoadedMessageKey = null;
  const historySnapshot = await messagesRef.limitToLast(50).once('value');
  const messagesToDisplay = [];
  historySnapshot.forEach((childSnapshot) => {
    messagesToDisplay.push({ id: childSnapshot.key, ...childSnapshot.val() });
    lastLoadedMessageKey = childSnapshot.key;
  });

  // Отсортировать по возрастанию timestamp, если они не гарантируются в порядке получения
  messagesToDisplay.sort((a, b) => a.timestamp - b.timestamp);
  messagesToDisplay.forEach(message => {
    const isMe = message.senderId === getCurrentUserId();
    displayMessage(message, isMe); // Добавляем исторические сообщения
  });

  // Теперь устанавливаем слушатель для новых сообщений,
  // начиная с последнего загруженного (чтобы не пропустить ничего)
  // Firebase `on('child_added')` с `startAt()` вернет элемент, соответствующий `startAt`
  // если он существует. Поэтому нам нужно отфильтровать его.
  if (lastLoadedMessageKey) {
    currentMessageListener = messagesRef.orderByKey().startAt(lastLoadedMessageKey);
    currentMessageListener.on('child_added', (snapshot) => {
      const message = { id: snapshot.key, ...snapshot.val() };
      // Проверяем, если это сообщение уже было загружено как часть истории
      // (т.е. его ключ совпадает с lastLoadedMessageKey и это не новое сообщение)
      if (message.id === lastLoadedMessageKey) {
        return; // Пропускаем это сообщение, оно уже отображено
      }
      const isMe = message.senderId === getCurrentUserId();
      displayMessage(message, isMe);
    }, (error) => {
      console.error("Ошибка при получении новых сообщений:", error);
    });
  } else {
    // Если истории нет, просто слушаем все новые сообщения
    currentMessageListener = messagesRef;
    currentMessageListener.on('child_added', (snapshot) => {
      const message = { id: snapshot.key, ...snapshot.val() };
      const isMe = message.senderId === getCurrentUserId();
      displayMessage(message, isMe);
    }, (error) => {
      console.error("Ошибка при получении сообщений (пустая история):", error);
    });
  }


  // Удаление сообщений
  currentMessageListener.on('child_removed', (snapshot) => {
    const removedMessageId = snapshot.key;
    const messageElement = document.querySelector(`#chatMessages [data-message-id="${removedMessageId}"]`);
    if (messageElement) messageElement.remove();
  });

  updateChatOptionsMenu(type, id); // Обновление меню опций чата
}

export async function loadChatList() {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    console.warn("Пользователь не авторизован. Список чатов не будет загружен.");
    return;
  }

  chatListElement.innerHTML = ''; // Clear current list

  // Add "My Chat" (Self-Chat)
  const myChatListItem = document.createElement('li');
  myChatListItem.classList.add('chat-list-item');
  myChatListItem.dataset.type = 'user';
  myChatListItem.dataset.id = currentUserId;
  myChatListItem.onclick = () => selectChat('user', currentUserId, getCurrentUsername(), getCurrentUserAvatarUrl());

  const myAvatarHtml = getCurrentUserAvatarUrl()
    ? `<img src="${getCurrentUserAvatarUrl()}" alt="Мой аватар">`
    : `<span style="background-color: ${getColorForChat(currentUserId)};">${getCurrentUsername().charAt(0).toUpperCase()}</span>`;
  const myAvatarBgColor = getCurrentUserAvatarUrl() ? '' : `background-color: ${getColorForChat(currentUserId)};`;

  myChatListItem.innerHTML = `
        <div class="avatar" style="${myAvatarBgColor}">${myAvatarHtml}</div>
        <div class="chat-info">
            <div class="chat-name">Мой чат</div>
            <div class="last-message">Личные заметки</div>
        </div>
    `;
  chatListElement.appendChild(myChatListItem);

  // General Group (always available)
  const generalGroupListItem = document.createElement('li');
  generalGroupListItem.classList.add('chat-list-item');
  generalGroupListItem.dataset.type = 'group';
  generalGroupListItem.dataset.id = 'general';
  generalGroupListItem.onclick = () => selectChat('group', 'general', 'Общая группа');
  generalGroupListItem.innerHTML = `
        <div class="avatar" style="background-color: ${getColorForChat('general')};">ОГ</div>
        <div class="chat-info">
            <div class="chat-name">Общая группа</div>
            <div class="last-message">Группа по умолчанию</div>
        </div>
    `;
  chatListElement.appendChild(generalGroupListItem);

  // Listen for groups
  db.ref('groups').on('value', (snapshot) => {
    document.querySelectorAll('.chat-list-item[data-type="group"]:not([data-id="general"])').forEach(item => item.remove());

    snapshot.forEach((childSnapshot) => {
      const group = childSnapshot.val();
      const groupId = childSnapshot.key;

      const listItem = document.createElement('li');
      listItem.classList.add('chat-list-item');
      listItem.dataset.type = 'group';
      listItem.dataset.id = groupId;
      listItem.onclick = () => selectChat('group', listItem.dataset.id, group.name, group.avatarUrl || null);

      const avatarHtml = group.avatarUrl ? `<img src="${group.avatarUrl}" alt="${group.name.charAt(0).toUpperCase()}">` : group.name.charAt(0).toUpperCase();
      const avatarBgColor = group.avatarUrl ? '' : `background-color: ${getColorForChat(groupId)};`;

      listItem.innerHTML = `
                <div class="avatar" style="${avatarBgColor}">${avatarHtml}</div>
                <div class="chat-info">
                    <div class="chat-name">${group.name}</div>
                    <div class="last-message">Группа</div>
                </div>
            `;
      chatListElement.appendChild(listItem);
    });
  });

  // Listen for channels
  db.ref('channels').on('value', (snapshot) => {
    document.querySelectorAll('.chat-list-item[data-type="channel"]').forEach(item => item.remove());

    snapshot.forEach((childSnapshot) => {
      const channel = childSnapshot.val();
      const channelId = childSnapshot.key;

      const listItem = document.createElement('li');
      listItem.classList.add('chat-list-item');
      listItem.dataset.type = 'channel';
      listItem.dataset.id = channelId;
      listItem.onclick = () => selectChat('channel', listItem.dataset.id, channel.name, channel.avatarUrl || null);

      const avatarHtml = channel.avatarUrl ? `<img src="${channel.avatarUrl}" alt="${channel.name.charAt(0).toUpperCase()}">` : channel.name.charAt(0).toUpperCase();
      const avatarBgColor = channel.avatarUrl ? '' : `background-color: ${getColorForChat(channelId)};`;

      listItem.innerHTML = `
                <div class="avatar" style="${avatarBgColor}">${avatarHtml}</div>
                <div class="chat-info">
                    <div class="chat-name">${channel.name}</div>
                    <div class="last-message">Канал</div>
                </div>
            `;
      chatListElement.appendChild(listItem);
    });
  });

  db.ref('users').on('value', (snapshot) => {
    document.querySelectorAll('.chat-list-item[data-type="private_chat"]').forEach(item => item.remove());

    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val();
      const userId = childSnapshot.key;

      if (userId === currentUserId) return;

      const privateChatId = [currentUserId, userId].sort().join('_');

      const listItem = document.createElement('li');
      listItem.classList.add('chat-list-item');
      listItem.dataset.type = 'private_chat';
      listItem.dataset.id = privateChatId;
      listItem.onclick = () => selectChat('private_chat', listItem.dataset.id, user.username, user.avatarUrl || null);

      const avatarHtml = user.avatarUrl ? `<img src="${user.avatarUrl}" alt="${user.username.charAt(0).toUpperCase()}">` : user.username.charAt(0).toUpperCase();
      const avatarBgColor = user.avatarUrl ? '' : `background-color: ${getColorForChat(userId)};`;

      listItem.innerHTML = `
                <div class="avatar" style="${avatarBgColor}">${avatarHtml}</div>
                <div class="chat-info">
                    <div class="chat-name">${user.username}</div>
                    <div class="last-message">Пользователь</div>
                </div>
            `;
      chatListElement.appendChild(listItem);
    });
  });
}