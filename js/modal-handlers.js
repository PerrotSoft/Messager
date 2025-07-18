// modal-handlers.js

import { db, storage } from './firebase-init.js'; // Добавляем storage для возможности загрузки аватаров/файлов
import {
  plusMenuModal, createGroupModal, newGroupNameInput, groupAvatarInput,
  createChannelModal, newChannelNameInput, channelAvatarInput,
  searchModal, searchInput, searchResultsList,
  settingsModal, settingUsernameInput, avatarUploadInput, currentAvatarPreview,
  currentChatAvatar
} from './dom-elements.js';
import { getCurrentUserId, getCurrentUsername, updateUsernameDisplay, updateCurrentAvatarPreview } from './auth-service.js';
import { selectChat, currentChatMode, currentChatId, loadChatList } from './chat-list-manager.js';
import { resizeImageToBase64, getColorForChat } from './utils.js';

// Плюс-меню (модальное окно с кнопками "Создать группу/канал", "Найти")
export function openPlusMenuModal() {
    plusMenuModal.style.display = 'block';
}

export function closePlusMenuModal() {
    plusMenuModal.style.display = 'none';
}

// Модальное окно "Создать группу"
export function openCreateGroupModal() {
    createGroupModal.style.display = 'block';
    closePlusMenuModal(); // Закрыть предыдущее модальное окно
}

export function closeCreateGroupModal() {
    createGroupModal.style.display = 'none';
    newGroupNameInput.value = '';
    groupAvatarInput.value = ''; // Очистить выбранный файл
}

export async function createGroup() {
    const groupName = newGroupNameInput.value.trim();
    if (!groupName) {
        alert("Пожалуйста, введите название группы.");
        return;
    }

    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
        alert("Ошибка: Пользователь не авторизован.");
        return;
    }

    try {
        let avatarUrl = null;
        const file = groupAvatarInput.files[0];
        if (file) {
            const resizedAvatarBase64 = await resizeImageToBase64(file, 100, 100);
            avatarUrl = resizedAvatarBase64;
        }

        const newGroupRef = db.ref('groups').push();
        const groupId = newGroupRef.key;

        await newGroupRef.set({
            name: groupName,
            creatorId: currentUserId,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            avatarUrl: avatarUrl // Сохраняем Base64 или null
        });

        // Добавляем текущего пользователя в качестве члена группы
        await db.ref(`group_members/${groupId}/${currentUserId}`).set(true);

        alert(`Группа "${groupName}" успешно создана!`);
        closeCreateGroupModal();
        loadChatList(); // Обновить список чатов
        selectChat('group', groupId, groupName, avatarUrl); // Открыть новую группу
    } catch (error) {
        console.error("Ошибка при создании группы:", error);
        alert("Не удалось создать группу: " + error.message);
    }
}

// Модальное окно "Создать канал"
export function openCreateChannelModal() {
    createChannelModal.style.display = 'block';
    closePlusMenuModal(); // Закрыть предыдущее модальное окно
}

export function closeCreateChannelModal() {
    createChannelModal.style.display = 'none';
    newChannelNameInput.value = '';
    channelAvatarInput.value = ''; // Очистить выбранный файл
}

export async function createChannel() {
    const channelName = newChannelNameInput.value.trim();
    if (!channelName) {
        alert("Пожалуйста, введите название канала.");
        return;
    }

    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
        alert("Ошибка: Пользователь не авторизован.");
        return;
    }

    try {
        let avatarUrl = null;
        const file = channelAvatarInput.files[0];
        if (file) {
            const resizedAvatarBase64 = await resizeImageToBase64(file, 100, 100);
            avatarUrl = resizedAvatarBase64;
        }

        const newChannelRef = db.ref('channels').push();
        const channelId = newChannelRef.key;

        await newChannelRef.set({
            name: channelName,
            creatorId: currentUserId,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            avatarUrl: avatarUrl // Сохраняем Base64 или null
        });

        // Добавляем текущего пользователя как подписчика канала
        await db.ref(`channel_subscribers/${channelId}/${currentUserId}`).set(true);

        alert(`Канал "${channelName}" успешно создан!`);
        closeCreateChannelModal();
        loadChatList(); // Обновить список чатов
        selectChat('channel', channelId, channelName, avatarUrl); // Открыть новый канал
    } catch (error) {
        console.error("Ошибка при создании канала:", error);
        alert("Не удалось создать канал: " + error.message);
    }
}

// Модальное окно "Поиск"
export function openSearchModal() {
    searchModal.style.display = 'block';
    searchResultsList.innerHTML = ''; // Очистить предыдущие результаты
    searchInput.value = '';
    closePlusMenuModal(); // Закрыть предыдущее модальное окно
}

export function closeSearchModal() {
    searchModal.style.display = 'none';
}

export async function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    searchResultsList.innerHTML = ''; // Очистить предыдущие результаты

    if (query.length < 2) {
        searchResultsList.innerHTML = '<li class="info-item">Введите минимум 2 символа для поиска.</li>';
        return;
    }

    const currentUserId = getCurrentUserId();

    // Поиск пользователей
    const usersSnapshot = await db.ref('users')
        .orderByChild('username_lower')
        .startAt(query)
        .endAt(query + '\uf8ff')
        .once('value');

    usersSnapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val();
        const userId = childSnapshot.key;
        if (userId === currentUserId) return; // Не показывать текущего пользователя в поиске

        const listItem = document.createElement('li');
        listItem.classList.add('search-result-item');
        listItem.innerHTML = `
            <div class="avatar" style="background-color: ${getColorForChat(userId)};">${user.avatarBase64 ? `<img src="${user.avatarBase64}" alt="${user.username.charAt(0).toUpperCase()}">` : user.username.charAt(0).toUpperCase()}</div>
            <span>${user.username} (Пользователь)</span>
            <button onclick="selectChatFromSearch('private_chat', '${[currentUserId, userId].sort().join('_')}', '${user.username}', '${user.avatarBase64 || ''}')">Открыть чат</button>
        `;
        searchResultsList.appendChild(listItem);
    });

    // Поиск групп
    const groupsSnapshot = await db.ref('groups')
        .orderByChild('name')
        .startAt(query)
        .endAt(query + '\uf8ff')
        .once('value');

    groupsSnapshot.forEach((childSnapshot) => {
        const group = childSnapshot.val();
        const groupId = childSnapshot.key;

        const listItem = document.createElement('li');
        listItem.classList.add('search-result-item');
        listItem.innerHTML = `
            <div class="avatar" style="background-color: ${getColorForChat(groupId)};">${group.avatarUrl ? `<img src="${group.avatarUrl}" alt="${group.name.charAt(0).toUpperCase()}">` : group.name.charAt(0).toUpperCase()}</div>
            <span>${group.name} (Группа)</span>
            <button onclick="selectChatFromSearch('group', '${groupId}', '${group.name}', '${group.avatarUrl || ''}')">Присоединиться</button>
        `;
        searchResultsList.appendChild(listItem);
    });

    // Поиск каналов
    const channelsSnapshot = await db.ref('channels')
        .orderByChild('name')
        .startAt(query)
        .endAt(query + '\uf8ff')
        .once('value');

    channelsSnapshot.forEach((childSnapshot) => {
        const channel = childSnapshot.val();
        const channelId = childSnapshot.key;

        const listItem = document.createElement('li');
        listItem.classList.add('search-result-item');
        listItem.innerHTML = `
            <div class="avatar" style="background-color: ${getColorForChat(channelId)};">${channel.avatarUrl ? `<img src="${channel.avatarUrl}" alt="${channel.name.charAt(0).toUpperCase()}">` : channel.name.charAt(0).toUpperCase()}</div>
            <span>${channel.name} (Канал)</span>
            <button onclick="selectChatFromSearch('channel', '${channelId}', '${channel.name}', '${channel.avatarUrl || ''}')">Подписаться</button>
        `;
        searchResultsList.appendChild(listItem);
    });

    if (searchResultsList.children.length === 0) {
        searchResultsList.innerHTML = '<li class="info-item">Ничего не найдено.</li>';
    }
}

export async function selectChatFromSearch(type, id, name, avatarUrl) {
    if (type === 'group') {
        const currentUserId = getCurrentUserId();
        await db.ref(`group_members/${id}/${currentUserId}`).set(true); // Добавить пользователя в группу
    } else if (type === 'channel') {
        const currentUserId = getCurrentUserId();
        await db.ref(`channel_subscribers/${id}/${currentUserId}`).set(true); // Добавить пользователя в канал
    }
    closeSearchModal();
    loadChatList(); // Обновить список чатов
    selectChat(type, id, name, avatarUrl); // Открыть выбранный чат
}

// Модальное окно "Настройки"
export function openSettings() {
    settingsModal.style.display = 'block';
    settingUsernameInput.value = getCurrentUsername(); // Загрузить текущее имя пользователя
    updateCurrentAvatarPreview(getCurrentUserAvatarUrl()); // Загрузить текущий аватар
}

export function closeSettingsModal() {
    settingsModal.style.display = 'none';
}

export async function saveSettings() {
    const newUsername = settingUsernameInput.value.trim();
    const currentUserId = getCurrentUserId();
    const currentUsername = getCurrentUsername();

    if (!currentUserId) {
        alert("Ошибка: Пользователь не авторизован.");
        return;
    }

    if (!newUsername) {
        alert("Имя пользователя не может быть пустым.");
        return;
    }

    if (newUsername === currentUsername) {
        alert("Имя пользователя не изменилось.");
        return;
    }

    const usernameLower = newUsername.toLowerCase();

    // Проверка уникальности имени пользователя
    const usernameSnapshot = await db.ref('usernames').orderByValue().equalTo(usernameLower).once('value');
    if (usernameSnapshot.exists()) {
        displayError('Это имя пользователя уже занято. Пожалуйста, выберите другое.');
        return;
    }

    try {
        // Обновляем имя пользователя в 'users' и 'usernames'
        await db.ref('users/' + currentUserId).update({
            username: newUsername,
            username_lower: usernameLower
        });
        await db.ref('usernames/' + currentUserId).set(usernameLower); // Обновить запись о старом имени пользователя

        // Обновить отображение в UI
        updateUsernameDisplay();
        alert("Имя пользователя успешно обновлено!");
    } catch (error) {
        console.error("Ошибка при сохранении имени пользователя:", error);
        alert("Не удалось сохранить имя пользователя: " + error.message);
    }
}

export async function uploadUserAvatar() {
    const file = avatarUploadInput.files[0];

    if (!file) {
        alert("Пожалуйста, выберите файл изображения.");
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert("Пожалуйста, выберите файл изображения (JPEG, PNG, GIF).");
        return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("Файл слишком большой. Максимальный размер - 2MB.");
        return;
    }

    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
        alert("Ошибка: Пользователь не авторизован.");
        return;
    }

    try {
        const resizedAvatarBase64 = await resizeImageToBase64(file, 100, 100);
        await db.ref('users/' + currentUserId + '/avatarBase64').set(resizedAvatarBase64);

        alert("Аватар успешно загружен!");

        updateUsernameDisplay();
        updateCurrentAvatarPreview(resizedAvatarBase64);

        // Обновление аватара в "Мой чат" в списке чатов
        const selfChatAvatarInList = document.querySelector(`.chat-list-item[data-type="user"][data-id="${currentUserId}"] .avatar`);
        if (selfChatAvatarInList) {
            selfChatAvatarInList.innerHTML = `<img src="${resizedAvatarBase64}" alt="Аватар">`;
        }

        // Обновление аватара в заголовке текущего чата, если это "Мой чат"
        if (currentChatMode === 'user' && currentChatId === currentUserId) {
            currentChatAvatar.innerHTML = `<img src="${resizedAvatarBase64}" alt="Аватар">`;
        }


    } catch (error) {
        console.error("Ошибка при обработке или загрузке аватара:", error);
        alert("Не удалось загрузить аватар: " + error.message);
    }
}

// Вспомогательная функция для отображения ошибок (если она не определена в другом месте и используется)
function displayError(message) {
    // В этом модуле нет элемента для отображения ошибок как в auth.html,
    // так что можно просто использовать alert или console.error
    alert(message);
}