// main.js
import {
  auth,
  db,
  storage
} from './firebase-init.js';
import {
  imageInput,
  documentInput,
  messageInput,
  chatOptionsButton,
  chatOptionsMenu,
  channelComponentsBtn,
  currentChatAvatar // Добавлено для доступа к аватару текущего чата
} from './dom-elements.js';
import {
  handleFileSelection,
  createDownloadMenu,
  downloadDocument,
  getColorForChat,
  resizeImageToBase64
} from './utils.js';
import {
  initializeAuth,
  logout,
  setUserData,
  clearUserData,
  updateUsernameDisplay,
  updateCurrentAvatarPreview,
  getCurrentUserId
} from './auth-service.js';
import {
  loadChatList,
  selectChat,
  currentChatMode,
  currentChatId,
} from './chat-list-manager.js';
import {
  sendMessage,
  deleteMessage
} from './chat-message-manager.js';
import {
  openPlusMenuModal,
  closePlusMenuModal,
  openCreateGroupModal,
  closeCreateGroupModal,
  createGroup,
  openCreateChannelModal,
  closeCreateChannelModal,
  createChannel,
  openSearchModal,
  closeSearchModal,
  performSearch,
  selectChatFromSearch,
  openSettings,
  closeSettingsModal,
  saveSettings,
  uploadUserAvatar // Убедитесь, что эта функция экспортируется из modal-handlers.js
} from './modal-handlers.js'; // Предполагаем, что uploadUserAvatar находится здесь
import {
  toggleChatOptionsMenu
} from './chat-options.js';


// Expose functions to the global scope for inline HTML event handlers
window.createDownloadMenu = createDownloadMenu;
window.downloadDocument = downloadDocument;
window.handleFileSelection = handleFileSelection;
window.sendMessage = sendMessage;
window.deleteMessage = deleteMessage;
window.toggleChatOptionsMenu = toggleChatOptionsMenu;
window.openPlusMenuModal = openPlusMenuModal;
window.closePlusMenuModal = closePlusMenuModal;
window.openCreateGroupModal = openCreateGroupModal;
window.closeCreateGroupModal = closeCreateGroupModal;
window.createGroup = createGroup;
window.openCreateChannelModal = openCreateChannelModal;
window.closeCreateChannelModal = closeCreateChannelModal;
window.createChannel = createChannel;
window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
window.performSearch = performSearch;
window.selectChatFromSearch = selectChatFromSearch;
window.openSettings = openSettings;
window.closeSettingsModal = closeSettingsModal;
window.saveSettings = saveSettings;
window.uploadUserAvatar = uploadUserAvatar; // Теперь это будет работать, если экспортировано
window.logout = logout; // Expose logout as well for index.html

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth(selectChat);

    // Event Listeners for file inputs
    imageInput.addEventListener('change', (event) => handleFileSelection(event.target.files, 'image'));
    documentInput.addEventListener('change', (event) => handleFileSelection(event.target.files, 'document'));

    // Send message on Enter key press
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent new line
            sendMessage();
        }
    });
});
// ...existing code...
window.toggleChannelsPanel = function() {
    const channelsList = document.querySelector('.channels-list');
    if (channelsList) {
        channelsList.classList.toggle('open');
    }
}
// ...existing code...