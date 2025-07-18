// chat-options.js
import {
  chatOptionsMenu,
  chatOptionsButton
} from './dom-elements.js';
import {
  getCurrentUserId
} from './auth-service.js';
import {
  selectChat
} from './chat-list-manager.js';

export function toggleChatOptionsMenu() {
  const isVisible = chatOptionsMenu.style.display === 'block';
  chatOptionsMenu.style.display = isVisible ? 'none' : 'block';
}

export function updateChatOptionsMenu(currentChatMode, currentChatId) {
  chatOptionsMenu.innerHTML = '';

  if (currentChatMode === 'user') {
    chatOptionsMenu.style.display = 'none';
    chatOptionsButton.style.display = 'none'; // No options, so hide the button
    return;
  }

  if (currentChatMode === 'private_chat') {
    const hideButton = document.createElement('button');
    hideButton.textContent = 'Скрыть чат';
    hideButton.classList.add('danger');
    hideButton.onclick = () => {
      if (confirm('Вы уверены, что хотите скрыть этот чат? Он исчезнет из вашего списка.')) {
        hidePrivateChat(currentChatId);
      }
      toggleChatOptionsMenu();
    };
    chatOptionsMenu.appendChild(hideButton);
  } else if (currentChatMode === 'group' || currentChatMode === 'channel') {
    const leaveButton = document.createElement('button');
    leaveButton.textContent = `Выйти из ${currentChatMode === 'group' ? 'группы' : 'канала'}`;
    leaveButton.classList.add('danger');
    leaveButton.onclick = () => {
      if (confirm(`Вы уверены, что хотите выйти из этого ${currentChatMode === 'group' ? 'группы' : 'канала'}?`)) {
        leaveGroupOrChannel(currentChatId, currentChatMode);
      }
      toggleChatOptionsMenu();
    };
    chatOptionsMenu.appendChild(leaveButton);
  }

  chatOptionsButton.style.display = chatOptionsMenu.children.length > 0 ? 'flex' : 'none';
}

function hidePrivateChat(chatIdToHide) {
  const chatItem = document.querySelector(`.chat-list-item[data-type="private_chat"][data-id="${chatIdToHide}"]`);
  if (chatItem) {
    chatItem.remove();
    alert('Чат скрыт из списка.');
    selectChat('group', 'general', 'Общая группа'); // Redirect to general group after hiding
  }
}

async function leaveGroupOrChannel(id, type) {
  try {
    if (type === 'group') {
      // Remove user from group members
      await db.ref(`group_members/${id}/${getCurrentUserId()}`).remove();
      // Optionally, remove the group from the user's list if you track it there
      // await db.ref(`users/${getCurrentUserId()}/groups/${id}`).remove();

      const chatItem = document.querySelector(`.chat-list-item[data-type="group"][data-id="${id}"]`);
      if (chatItem) {
        chatItem.remove();
        alert(`Вы вышли из группы "${document.getElementById('currentChatName').textContent}".`);
      }
    } else if (type === 'channel') {
      // Remove user from channel subscribers
      await db.ref(`channel_subscribers/${id}/${getCurrentUserId()}`).remove();
      // Optionally, remove the channel from the user's list if you track it there
      // await db.ref(`users/${getCurrentUserId()}/channels/${id}`).remove();

      const chatItem = document.querySelector(`.chat-list-item[data-type="channel"][data-id="${id}"]`);
      if (chatItem) {
        chatItem.remove();
        alert(`Вы отписались от канала "${document.getElementById('currentChatName').textContent}".`);
      }
    }
    selectChat('group', 'general', 'Общая группа'); // Redirect to general group after leaving
  } catch (error) {
    console.error(`Ошибка при выходе из ${type}:`, error);
    alert(`Не удалось выйти из ${type}: ` + error.message);
  }
}