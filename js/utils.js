// utils.js
import { db, storage } from './firebase-init.js';
import {
  chatMessagesElement,
  mediaPreviewContainer // <-- ДОБАВЛЕНО: Импортируем mediaPreviewContainer
} from './dom-elements.js';
import { getCurrentUserId, getCurrentUsername } from './auth-service.js'; // Используется для отправителя сообщения

let pendingMediaFiles = []; // Array to hold files before sending

export function handleFileSelection(files, type) {
  for (const file of files) {
    if (type === 'image' && !file.type.startsWith('image/')) {
      alert("Пожалуйста, выберите файл изображения.");
      continue;
    }
    if (type === 'document' && !file.type) { // Basic check, refine as needed
      alert("Пожалуйста, выберите файл документа.");
      continue;
    }

    pendingMediaFiles.push({ file, type });
    addMediaPreview(file, type);
  }
}

export function getPendingMediaFiles() {
  return pendingMediaFiles;
}

export function clearPendingMediaFiles() {
  pendingMediaFiles = [];
}

function addMediaPreview(file, type) {
  const previewItem = document.createElement('div');
  previewItem.classList.add('media-preview-item');
  previewItem.dataset.name = file.name;

  if (type === 'image') {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    previewItem.appendChild(img);
  } else if (type === 'document') {
    const icon = document.createElement('span');
    icon.textContent = '📄'; // Document icon
    icon.classList.add('document-icon');
    previewItem.appendChild(icon);

    const fileNameSpan = document.createElement('span');
    fileNameSpan.textContent = file.name;
    fileNameSpan.classList.add('file-name');
    previewItem.appendChild(fileNameSpan);
  }

  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'x';
  removeBtn.classList.add('remove-media-btn');
  removeBtn.onclick = () => {
    pendingMediaFiles = pendingMediaFiles.filter(item => item.file.name !== file.name);
    previewItem.remove();
    if (pendingMediaFiles.length === 0) {
      hideMediaPreviewContainer();
    }
  };
  previewItem.appendChild(removeBtn);

  mediaPreviewContainer.appendChild(previewItem); // <-- Здесь была ошибка, mediaPreviewContainer был undefined
  mediaPreviewContainer.style.display = 'flex';
}

export function hideMediaPreviewContainer() {
  mediaPreviewContainer.innerHTML = '';
  mediaPreviewContainer.style.display = 'none'; // <-- Здесь была ошибка, mediaPreviewContainer был undefined
}

export function createDownloadMenu(messageId, imageUrls, documentUrls) {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageElement) return;

  const existingMenu = messageElement.querySelector('.download-menu');
  if (existingMenu) {
    existingMenu.remove();
    return;
  }

  const downloadMenu = document.createElement('div');
  downloadMenu.classList.add('download-menu');

  if (imageUrls && imageUrls.length > 0) {
    imageUrls.forEach((url, index) => {
      const button = document.createElement('button');
      button.textContent = `Скачать изображение ${index + 1}`;
      button.onclick = () => downloadMedia(url, `image_${messageId}_${index}`);
      downloadMenu.appendChild(button);
    });
  }

  if (documentUrls && documentUrls.length > 0) {
    documentUrls.forEach((doc) => {
      const button = document.createElement('button');
      button.textContent = `Скачать: ${doc.name}`;
      button.onclick = () => downloadMedia(doc.url, doc.name);
      downloadMenu.appendChild(button);
    });
  }

  messageElement.appendChild(downloadMenu);
}

// Helper to actually download the media
async function downloadMedia(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Ошибка при скачивании файла:", error);
    alert("Не удалось скачать файл: " + error.message);
  }
}

export function downloadDocument(url, filename) {
  downloadMedia(url, filename);
}

// Function to generate a consistent color for a chat/user based on their ID
export function getColorForChat(chatId) {
  let hash = 0;
  for (let i = 0; i < chatId.length; i++) {
    hash = chatId.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}

export function resizeImageToBase64(file, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.8)); // Adjust quality as needed
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
