// chat-message-manager.js
import { db } from './firebase-init.js';
import {
  chatMessagesElement,
  messageInput
} from './dom-elements.js';
import {
  getCurrentUserId,
  getCurrentUsername
} from './auth-service.js';
import {
  getCurrentChatId,
  getCurrentChatMode
} from './chat-list-manager.js';
import {
  getPendingMediaFiles,
  clearPendingMediaFiles,
  hideMediaPreviewContainer,
  createDownloadMenu,
  downloadDocument,
  resizeImageToBase64
} from './utils.js';

let selectedMessages = new Set(); // Keep selected messages state here for now

function clearChatMessages() {
  chatMessagesElement.innerHTML = '';
}

// chat-message-manager.js
// ... (импорты и код до displayMessage) ...

function displayMessage(message, isMe, prepend = false) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.classList.add(isMe ? 'me' : 'other');
  messageElement.dataset.messageId = message.id;

  const messageBubble = document.createElement('div');
  messageBubble.classList.add('message-bubble');

  let contentHtml = '';
  const hasText = message.text && message.text.trim() !== '';
  const hasImages = message.imageDatas && message.imageDatas.length > 0;
  const hasDocuments = message.documents && message.documents.length > 0;

  if (!isMe && getCurrentChatMode() !== 'private_chat' && message.senderId !== getCurrentUserId()) {
    contentHtml += `<div class="message-author">${message.senderName || 'Неизвестный'}</div>`;
  }

  if (hasText) {
    contentHtml += `<div class="message-text">${message.text}</div>`;
  }

  if (hasText && (hasImages || hasDocuments)) {
    contentHtml += `<div class="message-media-separator"></div>`;
  }

  if (hasImages) {
    contentHtml += `<div class="message-images">`;
    message.imageDatas.forEach(imageData => {
      // ИСПРАВЛЕНО: Теперь передаем message.id и Base64-строку в createDownloadMenu
      // createDownloadMenu должна будет обработать этот Base64 для скачивания.
      // Важно: если createDownloadMenu ожидает массив, то нужно передать [imageData]
      contentHtml += `<img src="${imageData}" alt="Изображение" ondblclick="window.createDownloadMenu('${message.id}', ['${imageData}'], [])">`;
    });
    // Блок для старых сообщений с imageUrls (если такие еще есть)
    // Если вы уверены, что больше не будете использовать Firebase Storage, этот блок можно удалить.
    if (message.imageUrls && message.imageUrls.length > 0) {
      message.imageUrls.forEach(imageUrl => {
        contentHtml += `<img src="${imageUrl}" alt="Изображение" ondblclick="window.createDownloadMenu('${message.id}', [], ['${imageUrl}'])">`;
      });
    }
    contentHtml += `</div>`;
  }

  if (hasDocuments) {
    contentHtml += `<div class="message-documents">`;
    message.documents.forEach(doc => {
      // Для документов в Base64: создаем ссылку для скачивания напрямую.
      // createDownloadMenu не нужна для прямой ссылки.
      contentHtml += `<a href="${doc.url}" download="${doc.name}" class="document-link">
                               <span class="file-icon">📄</span> ${doc.name}
                           </a>`;
    });
    contentHtml += `</div>`;
  }

  contentHtml += `<span class="message-time">${new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;

  if (isMe) {
    contentHtml += `<span class="delete-btn" onclick="window.deleteMessage('${message.id}')">✕</span>`;
  }

  messageBubble.innerHTML = contentHtml;
  messageElement.appendChild(messageBubble);

  messageElement.addEventListener('click', (event) => {
    if (!isMe) return;
    event.stopPropagation();
    toggleMessageSelection(message.id);
  });

  if (prepend) {
    chatMessagesElement.prepend(messageElement);
  } else {
    chatMessagesElement.appendChild(messageElement);
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
  }
}

// ... (остальные функции sendMessage, deleteMessage, toggleMessageSelection, export) ...

async function sendMessage() {
    const messageText = messageInput.value.trim();
    const pendingMediaFiles = getPendingMediaFiles();

    if (!messageText && pendingMediaFiles.length === 0) {
        alert("Введите сообщение или выберите файлы.");
        return;
    }

    if (!getCurrentUserId() || !getCurrentUsername()) {
        alert("Ошибка: Пользователь не авторизован или имя пользователя не загружено.");
        return;
    }

    let messageData = {
        senderId: getCurrentUserId(),
        senderName: getCurrentUsername(),
        time: firebase.database.ServerValue.TIMESTAMP
    };

    if (messageText) {
        messageData.text = messageText;
    }

    messageData.imageDatas = []; // Для Base64 изображений (включая GIF)
    messageData.documents = [];   // Для Base64 документов (имя + данные)

    const fileProcessingPromises = [];

    for (const item of pendingMediaFiles) {
        const file = item.file; // Получаем сам объект File

        if (file.type.startsWith('image/')) {
            if (file.type === 'image/gif') {
                // ДЛЯ GIF-ФАЙЛОВ: Читаем как Data URL напрямую, без изменения размера и конвертации
                fileProcessingPromises.push(new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file); // Читаем файл как Base64
                    reader.onload = (event) => {
                        messageData.imageDatas.push(event.target.result); // Добавляем Base64 GIF
                        resolve();
                    };
                    reader.onerror = (error) => {
                        console.error("Ошибка при чтении GIF в Base64:", error);
                        reject(error);
                    };
                }).catch(error => { // Ловим ошибки чтения файла
                    alert(`Не удалось обработать GIF ${file.name}: ${error.message}`);
                    throw error; // Перебрасываем ошибку
                }));
            } else {
                // Для других типов изображений (JPEG, PNG и т.д.): используем resizeImageToBase64
                fileProcessingPromises.push(
                    resizeImageToBase64(file, 800, 600)
                    .then(resizedBase64 => {
                        messageData.imageDatas.push(resizedBase64);
                    })
                    .catch(error => {
                        console.error("Ошибка при преобразовании изображения в Base64:", error);
                        alert(`Не удалось обработать изображение ${file.name}: ${error.message}`);
                        throw error;
                    })
                );
            }
        } else {
            // Для всех остальных файлов (документов): читаем файл как Data URL (Base64)
            fileProcessingPromises.push(new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    messageData.documents.push({
                        name: file.name,
                        url: event.target.result // Base64 данные файла
                    });
                    resolve();
                };
                reader.onerror = (error) => {
                    console.error("Ошибка при чтении документа в Base64:", error);
                    reject(error);
                };
            }).catch(error => {
                alert(`Не удалось обработать документ ${file.name}: ${error.message}`);
                throw error;
            }));
        }
    }

    try {
        await Promise.all(fileProcessingPromises);

        if (messageData.imageDatas.length === 0 && messageData.documents.length === 0 && !messageData.text) {
             alert("Сообщение не может быть отправлено, так как ни один файл не был обработан успешно и нет текстового сообщения.");
             return;
        }

        let messagesRef;
        const currentChatMode = getCurrentChatMode();
        const currentChatId = getCurrentChatId();

        if (currentChatMode === 'group') {
            messagesRef = db.ref(`chat_messages/group/${currentChatId}`);
        } else if (currentChatMode === 'channel') {
            messagesRef = db.ref(`chat_messages/channel/${currentChatId}`);
        } else if (currentChatMode === 'private_chat') {
            messagesRef = db.ref(`chat_messages/private_chat/${currentChatId}`);
        } else if (currentChatMode === 'user' && currentChatId === getCurrentUserId()) {
            messagesRef = db.ref(`chat_messages/private_chat/${[getCurrentUserId(), getCurrentUserId()].sort().join('_')}`);
        } else {
            alert("Невозможно отправить сообщение в этом чате.");
            return;
        }

        await messagesRef.push(messageData);

        messageInput.value = '';
        clearPendingMediaFiles();
        hideMediaPreviewContainer();
        selectedMessages.clear();
    } catch (error) {
        console.error("Ошибка при отправке сообщения или обработке медиа:", error);
        alert("Ошибка при отправке сообщения: " + error.message);
    }
}

// ... (остальные функции displayMessage, deleteMessage, toggleMessageSelection, export) ...
function deleteMessage(messageId) {
  const currentChatMode = getCurrentChatMode();
  const currentChatId = getCurrentChatId();
  let messagePath;

  if (currentChatMode === 'group') {
    messagePath = `chat_messages/group/${currentChatId}/${messageId}`;
  } else if (currentChatMode === 'channel') {
    messagePath = `chat_messages/channel/${currentChatId}/${messageId}`;
  } else if (currentChatMode === 'private_chat') {
    messagePath = `chat_messages/private_chat/${currentChatId}/${messageId}`;
  } else {
    alert("Невозможно удалить сообщение в этом типе чата.");
    return;
  }

  db.ref(messagePath).once('value', (snapshot) => {
    const message = snapshot.val();
    if (message && message.senderId === getCurrentUserId()) {
      if (confirm("Вы уверены, что хотите удалить это сообщение?")) {
        db.ref(messagePath).remove()
          .then(() => {
            console.log("Сообщение удалено.");
          })
          .catch(error => {
            console.error("Ошибка при удалении сообщения:", error);
            alert("Ошибка при удалении сообщения: " + error.message);
          });
      }
    } else {
      alert("Вы можете удалять только свои сообщения.");
    }
  });
}

function toggleMessageSelection(messageId) {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageElement) return;

  if (selectedMessages.has(messageId)) {
    selectedMessages.delete(messageId);
    messageElement.classList.remove('selected');
  } else {
    selectedMessages.add(messageId);
    messageElement.classList.add('selected');
  }
}

export { clearChatMessages, displayMessage, sendMessage, deleteMessage };