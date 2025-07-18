// dom-elements.js
const usernameDisplay = document.getElementById('usernameDisplay');
const chatListElement = document.getElementById('chatList');
const currentChatAvatar = document.getElementById('currentChatAvatar');
const currentChatName = document.getElementById('currentChatName');
const currentChatType = document.getElementById('currentChatType');
const chatMessagesElement = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const imageInput = document.getElementById('imageInput');
const documentInput = document.getElementById('documentInput');
const mediaPreviewContainer = document.getElementById('mediaPreviewContainer');
const chatOptionsButton = document.getElementById('chatOptionsButton');
const chatOptionsMenu = document.getElementById('chatOptionsMenu');
const channelComponentsBtn = document.getElementById('channelComponentsBtn');

// Модальные окна
const plusMenuModal = document.getElementById('plusMenuModal');
const createGroupModal = document.getElementById('createGroupModal');
const newGroupNameInput = document.getElementById('newGroupNameInput');
const groupAvatarInput = document.getElementById('groupAvatarInput');
const createChannelModal = document.getElementById('createChannelModal');
const newChannelNameInput = document.getElementById('newChannelNameInput');
const channelAvatarInput = document.getElementById('channelAvatarInput');
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResultsList = document.getElementById('searchResults');
const settingsModal = document.getElementById('settingsModal');
const settingUsernameInput = document.getElementById('settingUsername');
const avatarUploadInput = document.getElementById('avatarUploadInput');
const currentAvatarPreview = document.getElementById('currentAvatarPreview');

export {
  usernameDisplay,
  chatListElement,
  currentChatAvatar,
  currentChatName,
  currentChatType,
  chatMessagesElement,
  messageInput,
  imageInput,
  documentInput,
  mediaPreviewContainer,
  chatOptionsButton,
  chatOptionsMenu,
  channelComponentsBtn,
  plusMenuModal,
  createGroupModal,
  newGroupNameInput,
  groupAvatarInput,
  createChannelModal,
  newChannelNameInput,
  channelAvatarInput,
  searchModal,
  searchInput,
  searchResultsList,
  settingsModal,
  settingUsernameInput,
  avatarUploadInput,
  currentAvatarPreview
};