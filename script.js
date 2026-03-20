import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {
  getAuth,
  isSignInWithEmailLink,
  onAuthStateChanged,
  signOut,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import BINAS_CONFIG_DEFAULT from './config.js';

// Merge default config with local admin overrides
const LOCAL_CONFIG_KEY = 'binas:admin-config-override';
let BINAS_CONFIG = { ...BINAS_CONFIG_DEFAULT };
try {
  const localOverride = localStorage.getItem(LOCAL_CONFIG_KEY);
  if (localOverride) {
    BINAS_CONFIG = { ...BINAS_CONFIG, ...JSON.parse(localOverride) };
  }
} catch (e) {
  console.warn('Could not load local config override:', e);
}
import {
  getFirestore,
  addDoc,
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// --- Elements ---
const navList = document.getElementById('nav-list');
const favoritesList = document.getElementById('favorites-list');
const favoritesView = document.getElementById('favorites-view');
const navDialogList = document.getElementById('nav-dialog-list');
const navSearch = document.getElementById('nav-search');
const navDialogSearch = document.getElementById('nav-dialog-search');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const layout = document.querySelector('.layout');
const sidebarToggleFloating = document.getElementById('sidebar-toggle-floating');
const chatToggleFloating = document.getElementById('chat-toggle-floating');
const navDialogOpenBtn = document.getElementById('nav-dialog-open');
const navDialogCloseBtn = document.getElementById('nav-dialog-close');
const navDialog = document.getElementById('nav-dialog');
const viewerFrame = document.getElementById('pdf-viewer-frame');

// Sidebar Icons & Bottom Menu
const btnMenuToc = document.getElementById('btn-menu-toc');
const btnMenuFavorites = document.getElementById('btn-menu-favorites');
const btnMenuChat = document.getElementById('btn-menu-chat');
const chatContainer = document.getElementById('chat-container');
const chatPlaceholder = document.getElementById('chat-placeholder');
const btnBuyPlusChat = document.getElementById('btn-buy-plus-chat');
const btnMenuPurchase = document.getElementById('btn-menu-purchase');
const btnMenuAccount = document.getElementById('btn-menu-account');
const btnMenuSettings = document.getElementById('btn-menu-settings');
const plusIndicator = document.getElementById('plus-indicator');
const iconSidebar = document.querySelector('.icon-sidebar');

// Overlays
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose = document.getElementById('settings-close');

const accountOverlay = document.getElementById('account-overlay');
const accountClose = document.getElementById('account-close');
const overlayAuthName = document.getElementById('overlay-auth-name');
const overlayAuthEmail = document.getElementById('overlay-auth-email');
const overlayLogout = document.getElementById('overlay-logout');
const overlayLoginInput = document.getElementById('overlay-login-input');
const overlayLoginBtn = document.getElementById('overlay-login-btn');
const overlayLoginMsg = document.getElementById('overlay-login-msg');
const btnLoginGoogle = document.getElementById('btn-login-google');
const overlayLoginSection = document.getElementById('overlay-login-section');

const purchaseOverlay = document.getElementById('purchase-overlay');
const purchaseClose = document.getElementById('purchase-close');
const purchaseEmailInput = document.getElementById('purchase-email');
const btnStartCheckout = document.getElementById('btn-start-checkout');
const purchaseMsg = document.getElementById('purchase-msg');
const purchaseCtaMain = document.querySelector('.purchase-cta-main');
const purchaseCtaSub = document.querySelector('.purchase-cta-sub');
const purchasePriceDisplay = document.querySelector('.purchase-price-display');
const purchaseTrustBadge = document.querySelector('.purchase-trust-badge');

// Context Menu
const contextMenu = document.getElementById('context-menu');
const ctxFavoriteBtn = document.getElementById('ctx-favorite-btn');

// --- Toast Notification System ---
function showToast(message, variant = 'info') {
  // Remove existing toast if present
  const existingToast = document.getElementById('binas-toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'binas-toast';
  toast.className = `binas-toast binas-toast--${variant}`;
  toast.innerHTML = `
    <div class="binas-toast__content">
      <span class="binas-toast__icon">${variant === 'success' ? '✓' : variant === 'error' ? '⚠' : 'ℹ'}</span>
      <span class="binas-toast__message">${message}</span>
    </div>
    <button class="binas-toast__close" aria-label="Sluiten">×</button>
  `;

  // Add to body
  document.body.appendChild(toast);

  // Close button functionality
  toast.querySelector('.binas-toast__close').addEventListener('click', () => {
    toast.classList.add('binas-toast--hiding');
    setTimeout(() => toast.remove(), 300);
  });

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('binas-toast--visible');
  });

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('binas-toast--hiding');
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// --- State Keys ---
const sidebarCollapsedKey = 'binas:sidebar-collapsed';
const chatCollapsedKey = 'binas:chat-collapsed';
const premiumVisibleKey = 'binas:premium-visible';
const plusActiveKey = 'binas-plus-active';
const plusLocalKey = 'binas:plus-local-status'; // For anonymous/local Plus purchases
const favoritesKey = 'binas:favorites-local';

// --- State Variables ---
let navigationData = [];
let favorites = []; // Array of objects { page, title, label, theme }
let currentSearchQuery = '';
let initialSearchQuery = '';
let firebaseApp;
let auth;
let firestore;
let isPremiumUser = false;
let advancedModeEnabled = false;
let currentUser = null;
let currentPage = 1;
let isProcessingAuth = false; // Prevent race conditions
let purchaseCtaDefaults = null;

const firebaseAuthDomain = BINAS_CONFIG?.authDomain || 'account.binas.app';
const firebaseConfig = {
  apiKey: "AIzaSyBgXo3zllXtFJZDn4elpY8DemEQG_ltMk0",
  authDomain: firebaseAuthDomain,
  projectId: "binas-91a32",
  storageBucket: "binas-91a32.firebasestorage.app",
  messagingSenderId: "971498903694",
  appId: "1:971498903694:web:5ab8b630b183f5204ed1df",
  measurementId: "G-1LLBGZNRNC",
};
const stripePriceId = BINAS_CONFIG?.stripePriceId || 'price_1SmVggLzjWXxGtsShYIXmRVx';

const viewerBaseUrl = 'https://mozilla.github.io/pdf.js/web/viewer.html';
const sectionCollapseState = {};

// --- Initialization ---

function getViewerUrl() {
  const filename = isPremiumUser ? 'Binas.pdf' : 'non-premium-binas.pdf';
  const pdfUrl = new URL(filename, window.location.href).toString();
  return `${viewerBaseUrl}?file=${encodeURIComponent(pdfUrl)}`;
}

function initFirebase() {
  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    try {
      getAnalytics(firebaseApp);
    } catch (error) {
      console.warn('Analytics niet beschikbaar:', error);
    }
  }
  if (!auth) {
    auth = getAuth(firebaseApp);
    auth.languageCode = 'nl';
  }
  if (!firestore) {
    firestore = getFirestore(firebaseApp);
  }
}


// Show confirmation dialog
function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'binas-confirm-overlay';
    dialogOverlay.innerHTML = `
      <div class="binas-confirm-dialog">
        <h3 class="binas-confirm-title">${escapeHtml(title)}</h3>
        <p class="binas-confirm-text">${escapeHtml(message)}</p>
        <div class="binas-confirm-buttons">
          <button class="binas-confirm-btn binas-confirm-btn--cancel">Annuleren</button>
          <button class="binas-confirm-btn binas-confirm-btn--confirm" style="background: #ef4444; border-color: #ef4444;">Verwijderen</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialogOverlay);
    
    requestAnimationFrame(() => {
      dialogOverlay.classList.add('binas-confirm-overlay--visible');
    });
    
    const cleanup = () => {
      dialogOverlay.classList.remove('binas-confirm-overlay--visible');
      setTimeout(() => dialogOverlay.remove(), 300);
    };
    
    dialogOverlay.querySelector('.binas-confirm-btn--confirm').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    
    dialogOverlay.querySelector('.binas-confirm-btn--cancel').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
  });
}

// Escape HTML helper
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// --- Navigation Rendering ---

function openPage(page) {
  currentPage = page;
  const viewToken = Date.now();
  const nextSrc = `${getViewerUrl()}#page=${page}&view=${viewToken}`;
  viewerFrame.src = nextSrc;
}

function buildNavigationItem(item, onSelect) {
  const li = document.createElement('li');
  li.className = 'nav-item';

  const button = document.createElement('button');
  button.className = 'nav-link';
  button.type = 'button';

  if (item.isSubtable) {
    button.classList.add('is-subtable');
  }

  button.innerHTML = `
    <span class="nav-label">${item.label ?? ''}</span>
    <div class="nav-text">
      <span class="nav-title">${item.title}</span>
    </div>
  `;

  button.addEventListener('click', () => {
    openPage(item.page);
    onSelect?.();
  });

  // Context Menu for Favorites
  button.addEventListener('contextmenu', (e) => {
    handleContextMenu(e, item);
  });

  li.appendChild(button);

  if (Array.isArray(item.children) && item.children.length) {
    const sublist = document.createElement('ul');
    sublist.className = 'nav-sublist';
    item.children.forEach((child) =>
      sublist.appendChild(buildNavigationItem(child, onSelect)) // Pass child directly, theme and fullLabel are already enriched
    );
    li.appendChild(sublist);
  }

  return li;
}

function renderNavigation(data, targetList, onSelect) {
  if (!targetList) return;
  targetList.innerHTML = '';
  data.forEach((section) => {
    const sectionLi = document.createElement('li');
    sectionLi.className = 'nav-section';
    sectionLi.dataset.theme = section.theme;

    const sectionKey = section.section ?? section.theme;
    const isCollapsed = sectionCollapseState[sectionKey] ?? false;

    const heading = document.createElement('button');
    heading.className = 'nav-section-heading';
    heading.type = 'button';
    heading.setAttribute('aria-expanded', String(!isCollapsed));
    heading.innerHTML = `
      <span class="nav-section-title">${section.section}</span>
      <span class="nav-section-arrow" aria-hidden="true">›</span>
    `;
    heading.addEventListener('click', () => {
      const nextState = !(sectionCollapseState[sectionKey] ?? false);
      sectionCollapseState[sectionKey] = nextState;
      applySectionCollapse(sectionLi, list, heading, nextState);
    });
    sectionLi.appendChild(heading);

    const list = document.createElement('ul');
    list.className = 'nav-section-list';
    section.items.forEach((item) =>
      list.appendChild(buildNavigationItem({ ...item, theme: section.theme }, onSelect))
    );
    sectionLi.appendChild(list);

    applySectionCollapse(sectionLi, list, heading, isCollapsed);

    targetList.appendChild(sectionLi);
  });
}

function applySectionCollapse(sectionElement, listElement, headingElement, collapsed) {
  sectionElement.classList.toggle('is-collapsed', collapsed);
  if (listElement) listElement.hidden = collapsed;
  headingElement?.setAttribute('aria-expanded', String(!collapsed));
}

// --- Search ---

function normalizeSearch(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]/gi, '');
}

function filterNavigation(query) {
  const rawQuery = query.trim().toLowerCase();
  const normalizedQuery = normalizeSearch(query);
  const tokenizedQuery = query.split(/\s+/).map(normalizeSearch).filter(Boolean);

  const buildSearchText = (item, ancestors) => {
    const labelParts = [...ancestors.map((a) => a.label ?? ''), item.label ?? ''];
    const titleParts = [...ancestors.map((a) => a.title ?? ''), item.title ?? ''];
    const labelJoined = labelParts.filter(Boolean).join(' ');
    const titleJoined = titleParts.filter(Boolean).join(' ');
    return {
      combinedRaw: `${labelJoined} ${titleJoined}`.trim().toLowerCase(),
      combinedNormalized: normalizeSearch(labelJoined + titleJoined)
    };
  };

  const filterItems = (items, ancestors = []) =>
    items.map((item) => {
      const { combinedNormalized, combinedRaw } = buildSearchText(item, ancestors);
      const tokenMatch = tokenizedQuery.length === 0 || tokenizedQuery.every((t) => combinedNormalized.includes(t));
      const matchesSelf = (!normalizedQuery && !rawQuery) || combinedRaw.includes(rawQuery) || combinedNormalized.includes(normalizedQuery) || tokenMatch;
      const filteredChildren = item.children ? filterItems(item.children, [...ancestors, item]) : [];

      if (!matchesSelf && filteredChildren.length === 0) return null;
      return { ...item, children: filteredChildren };
    }).filter(Boolean);

  const filtered = navigationData.map((section) => {
    const items = filterItems(section.items);
    return { ...section, items };
  }).filter((section) => section.items.length > 0);

  renderNavigation(filtered, navList);
  renderNavigation(filtered, navDialogList, hideNavDialog);
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// --- Favorites (Local Storage + Context Menu) ---

function handleContextMenu(e, item) {
  e.preventDefault();
  // Store item data in menu element for retrieval
  contextMenu.dataset.itemData = JSON.stringify(item);

  // Update button text
  const targetLabel = item.fullLabel || item.label;
  const isFav = favorites.some(f => f.title === item.title && f.label === targetLabel);

  if (isFav) {
      ctxFavoriteBtn.textContent = 'Verwijder uit favorieten';
  } else {
      ctxFavoriteBtn.textContent = 'Markeer als favoriet';
  }

  // Position menu
  const x = e.pageX;
  const y = e.pageY;
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.hidden = false;
}

function initContextMenu() {
  window.addEventListener('click', () => {
    contextMenu.hidden = true;
  });

  ctxFavoriteBtn.addEventListener('click', () => {
    try {
      const item = JSON.parse(contextMenu.dataset.itemData);
      toggleFavorite(item);
      renderFavoritesList();
    } catch (e) {
      console.error(e);
    }
  });
}

function toggleFavorite(item) {
  // Require login to manage favorites
  if (!currentUser || currentUser.isAnonymous) {
    toggleOverlay(accountOverlay, true);
    overlayLoginMsg.textContent = "Log in om favorieten te beheren.";
    overlayLoginMsg.dataset.variant = "error";
    return;
  }

  // Use fullLabel if available (for subtables like 6B)
  const targetLabel = item.fullLabel || item.label;
  const existingIndex = favorites.findIndex(f => f.title === item.title && f.label === targetLabel);

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
  } else {
    // Check limit for non-premium
    if (!isPremiumUser && favorites.length >= 4) {
        toggleOverlay(purchaseOverlay, true);
        purchaseMsg.textContent = "Voor meer dan 4 favorieten heb je Binas Plus nodig.";
        purchaseMsg.dataset.variant = "error";
        return;
    }

    favorites.push({
      id: generateUUID(),
      type: 'item',
      title: item.title,
      label: targetLabel,
      page: item.page,
      theme: item.theme
    });
  }

  saveFavorites();
}

// Helper: Generate UUID
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper: Migrate favorites to new structure
function migrateFavorites(favs) {
  if (!Array.isArray(favs)) return [];
  return favs.map(item => {
    // If it already has a type, assume it's migrated
    if (item.type) return item;

    // Otherwise convert to item
    return {
      id: generateUUID(),
      type: 'item',
      ...item
    };
  });
}

async function saveFavorites() {
  // If logged in, save to cloud only (not local storage)
  if (currentUser) {
    try {
        await setDoc(doc(firestore, 'users', currentUser.uid), {
            favorites: favorites
        }, { merge: true });
    } catch(e) { console.error('Error syncing favorites', e); }
  } else {
    // Not logged in - save to local storage
    localStorage.setItem(favoritesKey, JSON.stringify(favorites));
  }
}

function loadFavorites() {
  // Only load from local storage if NOT logged in
  // When logged in, favorites are loaded from cloud in onAuthStateChanged
  if (!currentUser) {
    try {
      const stored = localStorage.getItem(favoritesKey);
      favorites = stored ? JSON.parse(stored) : [];
      favorites = migrateFavorites(favorites);
    } catch (e) {
      favorites = [];
    }
  }
}

// Load favorites from cloud for logged-in user
async function loadCloudFavorites(user) {
  try {
    const docSnap = await getDoc(doc(firestore, 'users', user.uid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      favorites = migrateFavorites(data.favorites || []);
    } else {
      // User doc doesn't exist yet, create empty
      favorites = [];
      await setDoc(doc(firestore, 'users', user.uid), { favorites: [] }, { merge: true });
    }
  } catch (e) {
    console.error('Error loading cloud favorites:', e);
    favorites = [];
  }
  renderFavoritesList();
}

// Clear favorites display when logged out
function clearFavoritesDisplay() {
  favorites = [];
  renderFavoritesList();
}

function renderFavoritesNode(item, container, parentList, index) {
  console.log('Rendering favorite node:', item.id, item.type, item.title || item.name);
  
  const li = document.createElement('li');
  li.className = 'nav-item';
  li.dataset.id = item.id;
  li.draggable = true;

  // Drag Events
  li.addEventListener('dragstart', (e) => {
    console.log('Item dragstart event fired for:', item.id);
    handleDragStart(e, item.id);
  });
  li.addEventListener('dragover', handleDragOver);
  li.addEventListener('drop', (e) => handleDrop(e, item.id));
  li.addEventListener('dragend', handleDragEnd);
  li.addEventListener('dragenter', handleDragEnter);
  li.addEventListener('dragleave', handleDragLeave);

  if (item.type === 'folder') {
    const folderContainer = document.createElement('div');
    folderContainer.className = `folder-container ${item.collapsed ? 'collapsed' : ''}`;

    // Header
    const header = document.createElement('div');
    header.className = 'folder-header';
    header.addEventListener('click', (e) => {
      // Don't toggle if clicking actions
      if (e.target.closest('.action-btn')) return;
      toggleFolder(item.id);
    });

    // Arrow
    const arrow = document.createElement('div');
    arrow.className = 'folder-arrow';
    arrow.textContent = '›';
    header.appendChild(arrow);

    // Color Indicator (Click to change color)
    const colorInd = document.createElement('div');
    colorInd.className = 'folder-color-indicator';
    if (item.color) colorInd.style.backgroundColor = item.color;
    colorInd.addEventListener('click', (e) => {
      e.stopPropagation();
      setFolderColor(item.id);
    });
    header.appendChild(colorInd);

    // Name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'folder-name';
    nameSpan.textContent = item.name;
    header.appendChild(nameSpan);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'item-actions';

    // Rename Button
    const renameBtn = document.createElement('button');
    renameBtn.className = 'action-btn';
    renameBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
    renameBtn.title = 'Hernoem map';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renameFolder(item.id);
    });
    actions.appendChild(renameBtn);

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Verwijder map';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFolder(item.id);
    });
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    folderContainer.appendChild(header);

    // Children Container
    const itemsUl = document.createElement('ul');
    itemsUl.className = 'folder-items';
    // Allow dropping into folder list
    itemsUl.dataset.folderId = item.id;
    
    // Folder drop zone handlers
    itemsUl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Only highlight if directly over the folder list area
      if (e.target === itemsUl || e.target.classList.contains('folder-empty-placeholder')) {
        itemsUl.classList.add('drag-over');
      }
    });
    
    itemsUl.addEventListener('dragleave', (e) => {
      // Only remove highlight if leaving the folder list entirely
      if (!itemsUl.contains(e.relatedTarget)) {
        itemsUl.classList.remove('drag-over');
      }
    });
    
    itemsUl.addEventListener('drop', (e) => {
      itemsUl.classList.remove('drag-over');
      // Only handle drop if dropped on the empty space or placeholder, not on an item
      if (e.target === itemsUl || e.target.classList.contains('folder-empty-placeholder')) {
        e.preventDefault();
        e.stopPropagation();
        handleDropOnFolderList(e, item.id);
      }
    });

    if (item.items && item.items.length > 0) {
      item.items.forEach((child, idx) => {
        renderFavoritesNode(child, itemsUl, item.items, idx);
      });
    } else {
        // Empty placeholder to allow easy dropping
        const empty = document.createElement('li');
        empty.className = 'folder-empty-placeholder';
        empty.style.padding = '8px';
        empty.style.fontSize = '12px';
        empty.style.color = 'var(--text-muted)';
        empty.textContent = 'Sleep items hierheen';
        empty.style.listStyle = 'none';
        itemsUl.appendChild(empty);
    }

    folderContainer.appendChild(itemsUl);
    li.appendChild(folderContainer);

  } else {
    // Standard Item
    li.dataset.theme = item.theme;

    const row = document.createElement('div');
    row.className = 'nav-item-content';

    // Drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '⋮⋮';
    dragHandle.title = 'Sleep om te verplaatsen';
    row.appendChild(dragHandle);

    const button = document.createElement('button');
    button.className = 'nav-link';
    button.type = 'button';
    button.style.flex = '1';

    let labelHtml = '';
    if (item.label) {
        const match = item.label.match(/^(\d+)([A-Za-z].*)$/);
        if (match) {
           labelHtml = `<span class="label-part-num">${match[1]}</span> <span class="label-part-suffix">${match[2]}</span>`;
        } else {
           labelHtml = `<span class="label-part-num">${item.label}</span>`;
        }
    } else {
        labelHtml = '<span class="nav-label">…</span>';
    }

    let noteHtml = '';
    if (item.note) {
        noteHtml = `<span class="note-indicator" title="${escapeHtml(item.note)}">📝</span>`;
    }

    button.innerHTML = `
       <span class="nav-label" style="justify-content: flex-end; gap: 2px;">${labelHtml}</span>
       <div class="nav-text"><span class="nav-title">${item.title}</span>${noteHtml}</div>
    `;
    button.addEventListener('click', () => openPage(item.page));
    row.appendChild(button);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'item-actions';

    // Note Button
    const noteBtn = document.createElement('button');
    noteBtn.className = 'action-btn';
    noteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
    noteBtn.title = 'Notitie bewerken';
    noteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editNote(item.id);
    });
    actions.appendChild(noteBtn);

    // Remove Button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'action-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Verwijder favoriet';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Determine parent array to splice from
        const idx = parentList.indexOf(item);
        if (idx > -1) {
            parentList.splice(idx, 1);
            saveFavorites();
            renderFavoritesList();
        }
    });
    actions.appendChild(removeBtn);

    row.appendChild(actions);
    li.appendChild(row);
  }

  container.appendChild(li);
}

// Flag to track if root drop zone listeners are attached
let rootDropZoneInitialized = false;

function renderFavoritesList() {
  if (!favoritesList) return;
  favoritesList.innerHTML = '';

  // Show different message based on login state
  if (!currentUser || currentUser.isAnonymous) {
    favoritesList.innerHTML = '<li style="padding:12px;text-align:center;color:var(--text-muted)">Log in om je favorieten te bekijken.<br><small>Je favorieten worden gesynchroniseerd met je account.</small></li>';
    return;
  }

  if (favorites.length === 0) {
    favoritesList.innerHTML = '<li style="padding:12px;text-align:center;color:var(--text-muted)">Nog geen favorieten.<br><small>Rechtermuisklik op een item om toe te voegen.</small></li>';
    return;
  }

  // Root level drop zone - only attach once
  if (!rootDropZoneInitialized) {
    favoritesList.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    favoritesList.addEventListener('drop', (e) => {
      // Only handle if dropped directly on the list, not on a child
      if (e.target === favoritesList || e.target.classList.contains('root-drop-zone')) {
        handleDropOnFolderList(e, null);
      }
    });
    rootDropZoneInitialized = true;
  }

  favorites.forEach((item, index) => {
    renderFavoritesNode(item, favoritesList, favorites, index);
  });

  // Add a drop zone at the end for moving items out of folders
  const dropZone = document.createElement('li');
  dropZone.className = 'root-drop-zone';
  dropZone.innerHTML = '<span>Sleep hier om uit map te halen</span>';
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dropZone.classList.add('drag-over');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });
  
  dropZone.addEventListener('drop', (e) => {
    console.log('=== DROP EVENT ON ROOT ZONE ===');
    console.log('e.target:', e.target);
    console.log('dataTransfer text/plain:', e.dataTransfer.getData('text/plain'));
    console.log('currentDraggedItemId:', currentDraggedItemId);
    
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    handleDropOnFolderList(e, null);
  });
  
  favoritesList.appendChild(dropZone);
}

// --- Plus Status & Advanced Mode ---

function setPremiumStatus(active, saveToLocal = true) {
  const globalPlusEnabled = BINAS_CONFIG.enableBinasPlus !== false;

  const changed = isPremiumUser !== active;
  isPremiumUser = active;
  
  // Only save to localStorage if explicitly requested (for anonymous purchases)
  if (saveToLocal && !currentUser) {
    localStorage.setItem(plusLocalKey, active ? 'true' : 'false');
  }
  
  // Update session status
  localStorage.setItem(plusActiveKey, active);

  // Reload viewer if status changed and viewer is already active
  if (changed && viewerFrame.src && viewerFrame.src.includes('viewer.html')) {
    openPage(currentPage);
  }

  if (plusIndicator) {
    if (!globalPlusEnabled) {
      plusIndicator.hidden = true;
    } else {
      plusIndicator.hidden = !active;
      plusIndicator.classList.toggle('is-static', active);
    }
  }
  if (btnMenuPurchase) {
    if (!globalPlusEnabled) {
      btnMenuPurchase.hidden = true;
    } else {
      btnMenuPurchase.hidden = active;
      // Start swipe animation when button becomes visible
      if (!active) {
        setTimeout(initPlusPromoAnimation, 100);
      }
    }
  }

  const accountCircle = document.querySelector('.account-circle');

  // Chat icon visible for everyone now, but styled differently
  if (btnMenuChat) {
      if (!globalPlusEnabled) {
          btnMenuChat.hidden = true;
          // If we are currently on the chat tab, switch to TOC
          if (btnMenuChat.classList.contains('active')) {
             // Use setTimeout to ensure UI updates cleanly
             setTimeout(() => btnMenuToc?.click(), 0);
          }
      } else {
          btnMenuChat.hidden = false;
          if (active) {
              btnMenuChat.classList.add('gold-icon');
          } else {
              btnMenuChat.classList.remove('gold-icon');
          }
      }
  }

  // Account circle gold
  if (accountCircle) {
      if (active && globalPlusEnabled) {
          accountCircle.classList.add('gold-border');
      } else {
          accountCircle.classList.remove('gold-border');
      }
  }

  if (purchaseOverlay?.classList.contains('visible')) {
    updatePurchaseOverlayState(true);
  }

  updateChatVisibility();
}

function updateGlobalConfigState() {
    const enabled = BINAS_CONFIG.enableBinasPlus !== false;
    const settingsLinks = document.getElementById('settings-links-container');

    if (!enabled) {
        // Binas Plus System is OFF -> Everyone is Premium (Functional), No Gold UI

        // 1. Force functionality
        setPremiumStatus(true, false);

        // 2. Hide Settings Links
        if (settingsLinks) settingsLinks.hidden = true;

    } else {
        // Binas Plus System is ON -> Normal behavior

        // 1. Show Settings Links
        if (settingsLinks) settingsLinks.hidden = false;

        // 2. Re-evaluate status
        if (auth.currentUser) {
             checkCloudPlusStatus(auth.currentUser).then(hasPlus => {
                 setPremiumStatus(hasPlus, false);
             });
        } else {
             const hasLocalPlus = localStorage.getItem(plusLocalKey) === 'true';
             setPremiumStatus(hasLocalPlus, false);
        }
    }
}

function cachePurchaseCtaDefaults() {
  if (!purchaseCtaDefaults && purchaseCtaMain && purchaseCtaSub) {
    purchaseCtaDefaults = {
      main: purchaseCtaMain.innerHTML,
      sub: purchaseCtaSub.innerHTML
    };
  }
}

function updatePurchaseOverlayState(resetMessage = false) {
  if (!btnStartCheckout) return;
  cachePurchaseCtaDefaults();

  if (isPremiumUser) {
    btnStartCheckout.disabled = true;
    btnStartCheckout.classList.add('is-disabled');
    btnStartCheckout.classList.remove('is-loading');
    if (purchaseCtaMain) purchaseCtaMain.textContent = 'Binas Plus is al actief';
    if (purchaseCtaSub) purchaseCtaSub.textContent = 'Bedankt voor je aankoop';
    if (purchasePriceDisplay) purchasePriceDisplay.hidden = true;
    if (purchaseTrustBadge) purchaseTrustBadge.hidden = true;
    if (resetMessage && purchaseMsg) {
      purchaseMsg.textContent = 'Bedankt voor je aankoop! Binas Plus is al actief.';
      purchaseMsg.dataset.variant = 'success';
    }
  } else {
    btnStartCheckout.disabled = false;
    btnStartCheckout.classList.remove('is-disabled');
    if (purchaseCtaDefaults && purchaseCtaMain) purchaseCtaMain.innerHTML = purchaseCtaDefaults.main;
    if (purchaseCtaDefaults && purchaseCtaSub) purchaseCtaSub.innerHTML = purchaseCtaDefaults.sub;
    if (purchasePriceDisplay) purchasePriceDisplay.hidden = false;
    if (purchaseTrustBadge) purchaseTrustBadge.hidden = false;
    if (resetMessage && purchaseMsg) {
      purchaseMsg.textContent = '';
      purchaseMsg.dataset.variant = '';
    }
  }
}

// Check if there's a local Plus purchase that can be linked
function hasLocalPlusStatus() {
  return localStorage.getItem(plusLocalKey) === 'true';
}

// Save Plus status to cloud for logged-in user
async function savePlusStatusToCloud(user) {
  try {
    await setDoc(doc(firestore, 'users', user.uid), {
      hasBinasPlus: true,
      plusLinkedAt: new Date().toISOString()
    }, { merge: true });
    // Clear local status after linking
    localStorage.removeItem(plusLocalKey);
    return true;
  } catch (e) {
    console.error('Error saving Plus status to cloud:', e);
    return false;
  }
}

// Check Plus status from cloud
async function checkCloudPlusStatus(user) {
  try {
    // First check the users collection for Plus status
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    if (userDoc.exists() && userDoc.data().hasBinasPlus) {
      return true;
    }
    
    // Also check Stripe subscriptions/payments
    const q = query(
      collection(firestore, 'customers', user.uid, 'payments')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      // Has payments - check if any were successful
      for (const paymentDoc of snap.docs) {
        const payment = paymentDoc.data();
        if (payment.status === 'succeeded') {
          return true;
        }
      }
    }
    
    // Check subscriptions too
    const subQ = query(
      collection(firestore, 'customers', user.uid, 'subscriptions'),
      where('status', 'in', ['active', 'trialing'])
    );
    const subSnap = await getDocs(subQ);
    if (!subSnap.empty) {
      return true;
    }
    
    return false;
  } catch (e) {
    console.error('Error checking cloud Plus status:', e);
    return false;
  }
}

// Show dialog asking if user wants to link local Plus to account
function showLinkPlusDialog() {
  return new Promise((resolve) => {
    // Create dialog element
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'binas-confirm-overlay';
    dialogOverlay.innerHTML = `
      <div class="binas-confirm-dialog">
        <h3 class="binas-confirm-title">Binas Plus Koppelen</h3>
        <p class="binas-confirm-text">Je hebt Binas Plus lokaal gekocht. Wil je deze koppelen aan je account?</p>
        <div class="binas-confirm-options">
          <div class="binas-confirm-option">✓ <strong>Ja:</strong> Plus wordt gekoppeld aan je account en werkt op alle apparaten</div>
          <div class="binas-confirm-option">✗ <strong>Nee:</strong> Plus blijft alleen lokaal beschikbaar</div>
        </div>
        <div class="binas-confirm-buttons">
          <button class="binas-confirm-btn binas-confirm-btn--cancel">Nee</button>
          <button class="binas-confirm-btn binas-confirm-btn--confirm">Ja, koppelen</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialogOverlay);
    
    // Animate in
    requestAnimationFrame(() => {
      dialogOverlay.classList.add('binas-confirm-overlay--visible');
    });
    
    const cleanup = () => {
      dialogOverlay.classList.remove('binas-confirm-overlay--visible');
      setTimeout(() => dialogOverlay.remove(), 300);
    };
    
    dialogOverlay.querySelector('.binas-confirm-btn--confirm').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    
    dialogOverlay.querySelector('.binas-confirm-btn--cancel').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
  });
}

function updateChatVisibility() {
  const canShowChat = advancedModeEnabled; // Always allow showing chat/placeholder if enabled
  if (chatToggleFloating) {
    chatToggleFloating.style.display = canShowChat ? 'flex' : 'none';
  }
  // If we were collapsing based on premium, we don't need to anymore
}

function setAdvancedMode(enabled) {
  advancedModeEnabled = enabled;
  layout.classList.toggle('advanced-mode-active', enabled);
  localStorage.setItem(premiumVisibleKey, String(enabled));
  updateChatVisibility();
}

function initPremium() {
  // Check URL Success first (from payment redirect)
  const params = new URLSearchParams(window.location.search);
  if (params.get('status') === 'success') {
    const wasAnonymous = params.get('anonymous') === 'true';
    
    if (wasAnonymous) {
      // Anonymous purchase - save Plus status locally
      localStorage.setItem(plusLocalKey, 'true');
      setPremiumStatus(true, true);
      showToast('Binas Plus is geactiveerd! Log in om je aankoop aan een account te koppelen.', 'success');
    } else {
      // Logged in purchase - Plus is already linked to account via Stripe webhook
      setPremiumStatus(true, false);
      showToast('Binas Plus is geactiveerd en gekoppeld aan je account!', 'success');
    }
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
  
  // Load initial status based on local storage (will be updated when auth state changes)
  const hasLocalPlus = localStorage.getItem(plusLocalKey) === 'true';
  const sessionPlus = localStorage.getItem(plusActiveKey) === 'true';
  
  // If not logged in, check for local Plus status
  if (hasLocalPlus || sessionPlus) {
    setPremiumStatus(true, false);
  }

  const storedAdvanced = localStorage.getItem(premiumVisibleKey) === 'true';
  setAdvancedMode(storedAdvanced);
}

// --- Overlays ---

function toggleOverlay(overlay, show) {
  if (show) {
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
    
    // Handle purchase overlay sections based on login state
    if (overlay === purchaseOverlay) {
      const loggedInSection = document.getElementById('purchase-logged-in-section');
      const loggedOutSection = document.getElementById('purchase-logged-out-section');
      const purchaseAvatar = document.getElementById('purchase-avatar');
      const purchaseAccountEmail = document.getElementById('purchase-account-email');
      
      if (currentUser && !currentUser.isAnonymous && currentUser.email) {
        // User is logged in - show account info section
        if (loggedInSection) loggedInSection.hidden = false;
        if (loggedOutSection) loggedOutSection.hidden = true;
        
        // Set email for checkout (hidden field)
        if (purchaseEmailInput) purchaseEmailInput.value = currentUser.email;
        
        // Set avatar (profile photo or initial)
        if (purchaseAvatar) {
          if (currentUser.photoURL) {
            purchaseAvatar.innerHTML = `<img src="${currentUser.photoURL}" alt="Profielfoto" class="purchase-avatar-img" referrerpolicy="no-referrer" />`;
          } else {
            const letter = (currentUser.email || 'A').charAt(0).toUpperCase();
            purchaseAvatar.innerHTML = `<span class="purchase-avatar-letter">${letter}</span>`;
          }
        }
        
        // Set email display
        if (purchaseAccountEmail) {
          purchaseAccountEmail.textContent = currentUser.email;
        }
      } else {
        // User is not logged in - hide account info, show empty section
        if (loggedInSection) loggedInSection.hidden = true;
        if (loggedOutSection) loggedOutSection.hidden = false;
        if (purchaseEmailInput) purchaseEmailInput.value = '';
      }

      updatePurchaseOverlayState(true);
    }
  } else {
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

function initOverlays() {
  // Settings
  btnMenuSettings?.addEventListener('click', () => toggleOverlay(settingsOverlay, true));
  settingsClose?.addEventListener('click', () => toggleOverlay(settingsOverlay, false));

  // Account
  btnMenuAccount?.addEventListener('click', () => toggleOverlay(accountOverlay, true));
  accountClose?.addEventListener('click', () => toggleOverlay(accountOverlay, false));

  // Purchase
  btnMenuPurchase?.addEventListener('click', () => toggleOverlay(purchaseOverlay, true));
  plusIndicator?.addEventListener('click', () => toggleOverlay(purchaseOverlay, true));
  purchaseClose?.addEventListener('click', () => toggleOverlay(purchaseOverlay, false));
  
  // Close overlays when clicking on background
  [settingsOverlay, accountOverlay, purchaseOverlay].forEach(overlay => {
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        // Only close if clicking directly on the overlay background, not its children
        if (e.target === overlay) {
          toggleOverlay(overlay, false);
        }
      });
    }
  });
}

// --- Auth & Checkout Logic ---

async function startCheckout() {
  if (isPremiumUser) {
    updatePurchaseOverlayState(true);
    return;
  }

  // Email is optional - only used if user is logged in
  const email = purchaseEmailInput?.value?.trim() || null;

  // Show loading state on button
  const checkoutBtn = document.getElementById('btn-start-checkout');
  if (checkoutBtn) {
    checkoutBtn.classList.add('is-loading');
  }
  
  purchaseMsg.textContent = '';
  purchaseMsg.dataset.variant = '';

  try {
    initFirebase();
    
    // Import signInAnonymously dynamically if needed
    const { signInAnonymously } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js");
    
    // Store the current user state to know if we were logged in before
    const wasLoggedIn = auth.currentUser && !auth.currentUser.isAnonymous;
    const originalUser = auth.currentUser;
    
    // If not logged in at all, sign in anonymously for the checkout
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    // Build checkout session data
    const sessionData = {
      mode: 'payment',
      price: stripePriceId,
      success_url: `${window.location.origin}/?status=success&anonymous=${!wasLoggedIn}`,
      cancel_url: `${window.location.origin}/?status=cancel`,
    };
    
    // Only include email if user is logged in (they'll enter it in Stripe otherwise)
    if (email) {
      sessionData.customer_email = email;
    }

    const sessionsRef = collection(firestore, 'customers', auth.currentUser.uid, 'checkout_sessions');
    const docRef = await addDoc(sessionsRef, sessionData);

    onSnapshot(docRef, (snap) => {
      const data = snap.data();
      if (data?.url) {
        window.location.href = data.url;
      }
      if (data?.error) {
        purchaseMsg.textContent = data.error.message;
        purchaseMsg.dataset.variant = 'error';
        
        // Remove loading state on error
        const checkoutBtn = document.getElementById('btn-start-checkout');
        if (checkoutBtn) {
          checkoutBtn.classList.remove('is-loading');
        }
      }
    });

  } catch (e) {
    purchaseMsg.textContent = 'Fout bij starten checkout: ' + e.message;
    purchaseMsg.dataset.variant = 'error';
    
    // Remove loading state on error
    const checkoutBtn = document.getElementById('btn-start-checkout');
    if (checkoutBtn) {
      checkoutBtn.classList.remove('is-loading');
    }
  }
}

function initAuth() {
  initFirebase();

  btnLoginGoogle?.addEventListener('click', async () => {
     const provider = new GoogleAuthProvider();
     try {
         await signInWithPopup(auth, provider);
         toggleOverlay(accountOverlay, false);
     } catch(e) {
         console.error(e);
         overlayLoginMsg.textContent = e.message;
         overlayLoginMsg.dataset.variant = 'error';
     }
  });

  overlayLoginBtn?.addEventListener('click', async () => {
    const email = overlayLoginInput.value.trim();
    if (!email) return;
    overlayLoginMsg.textContent = 'Link versturen...';
    try {
        await sendSignInLinkToEmail(auth, email, {
            url: window.location.href,
            handleCodeInApp: true
        });
        window.localStorage.setItem('binas:premium-email', email);
        overlayLoginMsg.textContent = 'Check je e-mail!';
        overlayLoginMsg.dataset.variant = 'success';
    } catch (e) {
        overlayLoginMsg.textContent = e.message;
        overlayLoginMsg.dataset.variant = 'error';
    }
  });

  overlayLogout?.addEventListener('click', () => {
     signOut(auth);
  });

  onAuthStateChanged(auth, async (user) => {
    if (isProcessingAuth) return;
    isProcessingAuth = true;
    
    const previousUser = currentUser;
    currentUser = user;
    const accountCircle = document.querySelector('.account-circle');

    if (user && !user.isAnonymous) {
        const displayName = user.displayName?.trim();
        if (overlayAuthName) {
          if (displayName) {
            overlayAuthName.textContent = displayName;
            overlayAuthName.hidden = false;
          } else {
            overlayAuthName.textContent = '';
            overlayAuthName.hidden = true;
          }
        }
        overlayAuthEmail.textContent = user.email || 'Anoniem';
        overlayLogout.hidden = false;
        
        // Hide login options when logged in
        if (overlayLoginSection) overlayLoginSection.hidden = true;
// Show Google profile photo if available, otherwise first letter of email
        if (accountCircle) {
            if (user.photoURL) {
                // User has a profile photo (e.g., Google login)
                accountCircle.innerHTML = `<img src="${user.photoURL}" alt="Profielfoto" class="account-photo" referrerpolicy="no-referrer" />`;
            } else {
                // Fallback to first letter of email
                const letter = (user.email || 'A').charAt(0).toUpperCase();
                accountCircle.innerHTML = `<span style="font-weight:700; font-size:14px; color:var(--text-main);">${letter}</span>`;
            }
            accountCircle.style.display = 'flex';
            accountCircle.style.alignItems = 'center';
            accountCircle.style.justifyContent = 'center';
        }

        // Load favorites from cloud ONLY (discard any local)
        await loadCloudFavorites(user);

        // Check cloud Plus status
        const hasCloudPlus = await checkCloudPlusStatus(user);
        
        // Check if there's a local Plus purchase to link
        if (!hasCloudPlus && hasLocalPlusStatus()) {
          const wantsToLink = await showLinkPlusDialog();
          if (wantsToLink) {
            const linked = await savePlusStatusToCloud(user);
            if (linked) {
              setPremiumStatus(true, false);
              showToast('Binas Plus is gekoppeld aan je account!', 'success');
            }
          } else {
            // User doesn't want to link - keep local status but don't show Plus while logged in
            setPremiumStatus(false, false);
          }
        } else if (hasCloudPlus) {
          setPremiumStatus(true, false);
        } else {
          setPremiumStatus(false, false);
        }
        
        // Show admin link if admin email
        updateAdminButtonVisibility(user.email);
    } else {
        if (overlayAuthName) {
          overlayAuthName.textContent = '';
          overlayAuthName.hidden = true;
        }
        overlayAuthEmail.textContent = 'Niet ingelogd';
        overlayLogout.hidden = true;
        
        // Show login options when not logged in
        if (overlayLoginSection) overlayLoginSection.hidden = false;

        // Show generic vector icon
        if (accountCircle) {
            accountCircle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px;">
               <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
               <circle cx="12" cy="7" r="4"></circle>
            </svg>`;
            accountCircle.style.display = 'flex';
            accountCircle.style.alignItems = 'center';
            accountCircle.style.justifyContent = 'center';
        }

        // Clear favorites when logged out
        clearFavoritesDisplay();
        
        // Check for local Plus status when logged out
        if (hasLocalPlusStatus()) {
          setPremiumStatus(true, false);
        } else {
          setPremiumStatus(false, false);
        }
        
        // Hide admin link
        updateAdminButtonVisibility(null);
}
    
    isProcessingAuth = false;
  });

  // Finish Magic Link Sign In
  if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('binas:premium-email');
      if (!email) {
        // Show email confirmation dialog
        showEmailConfirmDialog().then(confirmedEmail => {
          if (confirmedEmail) {
            completeEmailSignIn(confirmedEmail);
          }
        });
      } else {
        completeEmailSignIn(email);
      }
  }

  function completeEmailSignIn(email) {
    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
          window.history.replaceState({}, '', window.location.pathname);
          showToast('Succesvol ingelogd!', 'success');
      })
      .catch(e => showToast(e.message, 'error'));
  }

  function showEmailConfirmDialog() {
    return new Promise((resolve) => {
      const dialogOverlay = document.createElement('div');
      dialogOverlay.className = 'binas-confirm-overlay';
      dialogOverlay.innerHTML = `
        <div class="binas-confirm-dialog">
          <h3 class="binas-confirm-title">E-mailadres bevestigen</h3>
          <p class="binas-confirm-text">Vul je e-mailadres in om in te loggen:</p>
          <input type="email" class="binas-confirm-input" id="email-confirm-input" placeholder="jij@example.com" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; font-size:14px; margin-bottom:16px;">
          <div class="binas-confirm-buttons">
            <button class="binas-confirm-btn binas-confirm-btn--cancel">Annuleren</button>
            <button class="binas-confirm-btn binas-confirm-btn--confirm">Bevestigen</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialogOverlay);
      const input = dialogOverlay.querySelector('#email-confirm-input');
      
      requestAnimationFrame(() => {
        dialogOverlay.classList.add('binas-confirm-overlay--visible');
        input.focus();
      });
      
      const cleanup = () => {
        dialogOverlay.classList.remove('binas-confirm-overlay--visible');
        setTimeout(() => dialogOverlay.remove(), 300);
      };
      
      dialogOverlay.querySelector('.binas-confirm-btn--confirm').addEventListener('click', () => {
        const email = input.value.trim();
        cleanup();
        resolve(email || null);
      });
      
      dialogOverlay.querySelector('.binas-confirm-btn--cancel').addEventListener('click', () => {
        cleanup();
        resolve(null);
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const email = input.value.trim();
          cleanup();
          resolve(email || null);
        }
      });
    });
  }
}

// Update admin button visibility based on email
async function updateAdminButtonVisibility(email) {
  const adminBtn = document.getElementById('btn-admin-link');
  if (adminBtn) {
    if (!email) {
      adminBtn.hidden = true;
      return;
    }
    
    // Check if primary admin
    const primaryAdmin = BINAS_CONFIG?.primaryAdmin || 'vandersanderoy@hotmail.com';
    if (email === primaryAdmin) {
      adminBtn.hidden = false;
      return;
    }
    
    // Check Firestore for other admins
    try {
      const adminDoc = await getDoc(doc(firestore, 'admins', email));
      adminBtn.hidden = !adminDoc.exists();
    } catch (e) {
      console.error('Error checking admin status:', e);
      adminBtn.hidden = true;
    }
  }
}

// --- General Sidebar Logic ---

function toggleSidebar() {
    const collapsed = layout.classList.contains('sidebar-collapsed');
    layout.classList.toggle('sidebar-collapsed', !collapsed);
    localStorage.setItem(sidebarCollapsedKey, String(!collapsed));
}

function setChatCollapsed(collapsed) {
    layout.classList.toggle('chat-collapsed', collapsed);
    localStorage.setItem(chatCollapsedKey, String(collapsed));
}

// --- Main Init ---

document.addEventListener('DOMContentLoaded', () => {
  // Viewers & Navigation
  initFirebase();

  // Listen for Global Config
  try {
      updateGlobalConfigState(); // Apply default immediately
      onSnapshot(doc(firestore, 'config', 'global'), (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.enableBinasPlus !== undefined) {
                  BINAS_CONFIG.enableBinasPlus = data.enableBinasPlus;
              }
          }
          updateGlobalConfigState();
      }, (error) => {
          console.warn('Config listener error (using defaults):', error);
      });
  } catch(e) {
      console.error('Config setup error:', e);
      updateGlobalConfigState();
  }

  fetch('navigation-data.json').then(r => r.json()).then(data => {
    // Enrich with fullLabel
    const enrichItems = (items, parentLabel = '', parentTheme = '') => {
        items.forEach(item => {
            const effectiveTheme = item.theme || parentTheme;
            item.theme = effectiveTheme; // Propagate theme

            // Only set label if it's an actual item, not a section container
            if (item.label || item.title) {
                 if (parentLabel && item.isSubtable) {
                    item.fullLabel = parentLabel + item.label;
                } else {
                    item.fullLabel = item.label;
                }
            }

            // Recurse
            if (item.children) enrichItems(item.children, item.label || parentLabel, effectiveTheme);
            if (item.items) enrichItems(item.items, item.label || parentLabel, effectiveTheme);
        });
    };
    enrichItems(data);

    navigationData = data;
    renderNavigation(data, navList);
    renderNavigation(data, navDialogList, hideNavDialog);

    // Restore search
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) filterNavigation(q);
  });

  // Search
  const debouncedFilter = debounce(filterNavigation, 300);
  const syncSearch = (val) => {
      if (navSearch) navSearch.value = val;
      if (navDialogSearch) navDialogSearch.value = val;
      debouncedFilter(val);
  };
  navSearch?.addEventListener('input', e => syncSearch(e.target.value));
  navDialogSearch?.addEventListener('input', e => syncSearch(e.target.value));

  // Sidebar Toggles
  // Note: sidebar-toggle button removed from header, but floating one exists?
  // User removed sidebar-toggle from header in prompt.
  // Floating toggle logic:
  sidebarToggleFloating?.addEventListener('click', toggleSidebar);
  sidebarOverlay?.addEventListener('click', () => layout.classList.add('sidebar-collapsed'));
  chatToggleFloating?.addEventListener('click', () => setChatCollapsed(!layout.classList.contains('chat-collapsed')));

  // Icon Sidebar Tabs
  const handleIconClick = (btn, targetView, callback) => {
      if (btn.classList.contains('active')) {
          // Toggle collapse if already active
          const collapsed = layout.classList.contains('sidebar-collapsed');
          layout.classList.toggle('sidebar-collapsed', !collapsed);
          localStorage.setItem(sidebarCollapsedKey, String(!collapsed));
          return;
      }

      // Switch active button
      [btnMenuToc, btnMenuFavorites, btnMenuChat].forEach(b => b?.classList.remove('active'));
      btn.classList.add('active');

      // Switch view
      navList.hidden = true;
      if (favoritesView) favoritesView.hidden = true;
      if (chatContainer) chatContainer.hidden = true;
      if (chatPlaceholder) chatPlaceholder.hidden = true;

      targetView.hidden = false;

      // Ensure sidebar is open
      layout.classList.remove('sidebar-collapsed');
      localStorage.setItem(sidebarCollapsedKey, 'false');

      // Toggle Search Bar Visibility
      // Only show search if TOC is active
      const sidebarTop = document.querySelector('.sidebar-top');
      if (sidebarTop) {
          if (targetView === navList) {
              sidebarTop.style.display = 'flex';
          } else {
              sidebarTop.style.display = 'none';
          }
      }

      if (callback) callback();
  };

  btnMenuToc?.addEventListener('click', () => handleIconClick(btnMenuToc, navList));
  btnMenuFavorites?.addEventListener('click', () => handleIconClick(btnMenuFavorites, favoritesView, renderFavoritesList));
  btnMenuChat?.addEventListener('click', () => {
      const target = isPremiumUser ? chatContainer : chatPlaceholder;
      handleIconClick(btnMenuChat, target);
  });

  btnBuyPlusChat?.addEventListener('click', () => {
     toggleOverlay(purchaseOverlay, true);
  });

  // Dialog & Visibility Toggle
  navDialogOpenBtn?.addEventListener('click', () => {
      navDialog.classList.add('visible');
      navDialog.setAttribute('aria-hidden', 'false');
  });
  navDialogCloseBtn?.addEventListener('click', hideNavDialog);
  
  // Close nav dialog when clicking on background
  navDialog?.addEventListener('click', (e) => {
      if (e.target === navDialog) {
          hideNavDialog();
      }
  });

  // Features
  loadFavorites();
  initContextMenu();
  initOverlays();
  initAuth();
  initPremium(); // Check LocalStorage & URL

  // Hook up Add Folder Button
  document.getElementById('btn-add-folder')?.addEventListener('click', createNewFolder);

  openPage(1); // Default (called after initPremium to respect saved status)

  btnStartCheckout?.addEventListener('click', startCheckout);

  // Apply config settings
  applyConfig();
});

// --- Config Application ---
function applyConfig() {
  if (!BINAS_CONFIG) return;
  
  // Update version and copyright in settings overlay
  const versionElement = document.getElementById('settings-version-info');
  if (versionElement) {
    versionElement.innerHTML = `
      ${BINAS_CONFIG.version}<br>
      <small>${BINAS_CONFIG.copyright}</small>
    `;
  }

  // Handle credit visibility
  const footerNote = document.querySelector('.footer-note');
  if (footerNote) {
    footerNote.style.display = BINAS_CONFIG.showCredit ? 'block' : 'none';
  }
  
  // Update all price displays
  const priceElements = document.querySelectorAll('.config-price');
  priceElements.forEach(el => {
    el.textContent = `€${BINAS_CONFIG.priceDisplay}`;
  });
  
  // Update original price displays
  if (BINAS_CONFIG.originalPrice) {
    const originalPriceElements = document.querySelectorAll('.config-original-price');
    originalPriceElements.forEach(el => {
      el.textContent = `€${BINAS_CONFIG.originalPrice}`;
    });
  }
  
  // Update discount badge
  if (BINAS_CONFIG.discountPercentage) {
    const discountBadges = document.querySelectorAll('.config-discount-badge');
    discountBadges.forEach(el => {
      el.textContent = `${BINAS_CONFIG.discountPercentage}% KORTING`;
    });
  }
}

function hideNavDialog() {
    navDialog.classList.remove('visible');
    navDialog.setAttribute('aria-hidden', 'true');
  }

// Keyboard
document.addEventListener('keydown', (e) => {
   if (e.key === 'Escape') {
       hideNavDialog();
       // Also close any open overlays
       if (settingsOverlay?.classList.contains('visible')) toggleOverlay(settingsOverlay, false);
       if (accountOverlay?.classList.contains('visible')) toggleOverlay(accountOverlay, false);
       if (purchaseOverlay?.classList.contains('visible')) toggleOverlay(purchaseOverlay, false);
   }
});

// --- Plus Promo Animation ---
let plusPromoStarted = false;
let plusPromoInterval = null;

function initPlusPromoAnimation() {
  if (plusPromoStarted) return;
  
  const textElement = document.getElementById('plus-promo-text');
  const button = document.getElementById('btn-menu-purchase');
  if (!textElement || !button) return;
  
  plusPromoStarted = true;
  
  const features = [
    'Geen advertenties',
    'AI Assistent',
    'Tekst selecteren',
    '∞ Favorieten',
    '50% Korting'
  ];
  
  let featureIndex = 0;
  
  // Set initial text
  textElement.textContent = features[featureIndex];
  
  function cycleText() {
    // Stop if button becomes hidden (user got Plus)
    if (button.hidden) {
      if (plusPromoInterval) {
        clearInterval(plusPromoInterval);
        plusPromoInterval = null;
      }
      return;
    }
    
    // Fade out
    textElement.classList.add('fade-out');
    
    // After fade out, change text and fade in
    setTimeout(() => {
      featureIndex = (featureIndex + 1) % features.length;
      textElement.textContent = features[featureIndex];
      textElement.classList.remove('fade-out');
    }, 250);
  }
  
  // Start the animation cycle - show each text for 3 seconds
  plusPromoInterval = setInterval(cycleText, 3000);
}

// --- Helper: Find Item in Tree ---
function findItemAndParent(id, list, parentItem = null) {
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item.id === id) {
      return { item, parentList: list, index: i, parentItem };
    }
    if (item.type === 'folder' && item.items) {
      const result = findItemAndParent(id, item.items, item);
      if (result) return result;
    }
  }
  return null;
}

// --- Folder Logic ---

async function createNewFolder() {
  // Require login to create folders
  if (!currentUser || currentUser.isAnonymous) {
    toggleOverlay(accountOverlay, true);
    overlayLoginMsg.textContent = "Log in om mappen te beheren.";
    overlayLoginMsg.dataset.variant = "error";
    return;
  }

  const name = await showPromptDialog('Nieuwe Map', 'Geef de map een naam:', 'Mijn Map');
  if (!name) return;

  const newFolder = {
    id: generateUUID(),
    type: 'folder',
    name: name,
    color: '#3b82f6', // Default blue
    collapsed: false,
    items: []
  };

  favorites.push(newFolder);
  saveFavorites();
  renderFavoritesList();
  showToast(`Map "${name}" aangemaakt`, 'success');
}

function toggleFolder(id) {
  const result = findItemAndParent(id, favorites);
  if (result && result.item.type === 'folder') {
    result.item.collapsed = !result.item.collapsed;
    saveFavorites();
    renderFavoritesList();
  }
}

async function deleteFolder(id) {
  const result = findItemAndParent(id, favorites);
  if (!result) return;

  const confirmed = await showConfirmDialog('Map verwijderen', `Weet je zeker dat je map "${result.item.name}" en alle inhoud wilt verwijderen?`);
  if (!confirmed) return;

  result.parentList.splice(result.index, 1);
  saveFavorites();
  renderFavoritesList();
  showToast('Map verwijderd', 'info');
}

async function renameFolder(id) {
  const result = findItemAndParent(id, favorites);
  if (!result || result.item.type !== 'folder') return;

  const newName = await showPromptDialog('Map hernoemen', 'Geef de map een nieuwe naam:', result.item.name);

  if (newName && newName !== result.item.name) {
    result.item.name = newName;
    saveFavorites();
    renderFavoritesList();
    showToast('Map hernoemd', 'success');
  }
}

async function setFolderColor(id) {
  const result = findItemAndParent(id, favorites);
  if (!result || result.item.type !== 'folder') return;

  // Extended color palette with theme-matching colors
  const colors = [
    '#ef4444', // Red (Scheikunde)
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#10b981', // Green (Biologie)
    '#3b82f6', // Blue (Natuurkunde)
    '#8b5cf6', // Purple
    '#ec4899', // Pink (Algemeen)
    '#0163ac', // Natuurkunde blue
    '#c94195', // Algemeen pink
    '#a0341a', // Wiskunde
    '#2c9a44', // Biologie green
    '#6b7280'  // Gray
  ];
  const color = await showColorPickerDialog(colors, result.item.color);

  if (color) {
    result.item.color = color;
    saveFavorites();
    renderFavoritesList();
  }
}

// --- UI Dialogs ---

function showPromptDialog(title, message, defaultValue = '') {
  return new Promise((resolve) => {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'binas-confirm-overlay';
    dialogOverlay.innerHTML = `
      <div class="binas-confirm-dialog">
        <h3 class="binas-confirm-title">${escapeHtml(title)}</h3>
        <p class="binas-confirm-text">${escapeHtml(message)}</p>
        <input type="text" class="binas-confirm-input" value="${escapeHtml(defaultValue)}" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; font-size:14px; margin-bottom:16px;">
        <div class="binas-confirm-buttons">
          <button class="binas-confirm-btn binas-confirm-btn--cancel">Annuleren</button>
          <button class="binas-confirm-btn binas-confirm-btn--confirm">Opslaan</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialogOverlay);
    const input = dialogOverlay.querySelector('input');

    requestAnimationFrame(() => {
      dialogOverlay.classList.add('binas-confirm-overlay--visible');
      input.focus();
      input.select();
    });

    const cleanup = () => {
      dialogOverlay.classList.remove('binas-confirm-overlay--visible');
      setTimeout(() => dialogOverlay.remove(), 300);
    };

    dialogOverlay.querySelector('.binas-confirm-btn--confirm').addEventListener('click', () => {
      const val = input.value.trim();
      cleanup();
      resolve(val || null);
    });

    dialogOverlay.querySelector('.binas-confirm-btn--cancel').addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        cleanup();
        resolve(val || null);
      }
    });
  });
}

function showColorPickerDialog(colors, currentColor) {
  return new Promise((resolve) => {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'binas-confirm-overlay';

    let colorHtml = '<div class="color-picker-grid">';
    colors.forEach(c => {
      const selected = c === currentColor ? 'selected' : '';
      colorHtml += `<div class="color-option ${selected}" style="background-color: ${c}" data-color="${c}"></div>`;
    });
    colorHtml += '</div>';

    dialogOverlay.innerHTML = `
      <div class="binas-confirm-dialog">
        <h3 class="binas-confirm-title">Kies een kleur</h3>
        ${colorHtml}
        <div class="binas-confirm-buttons" style="margin-top: 16px;">
          <button class="binas-confirm-btn binas-confirm-btn--cancel">Annuleren</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialogOverlay);

    requestAnimationFrame(() => {
      dialogOverlay.classList.add('binas-confirm-overlay--visible');
    });

    const cleanup = () => {
      dialogOverlay.classList.remove('binas-confirm-overlay--visible');
      setTimeout(() => dialogOverlay.remove(), 300);
    };

    dialogOverlay.querySelectorAll('.color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const color = opt.dataset.color;
        cleanup();
        resolve(color);
      });
    });

    dialogOverlay.querySelector('.binas-confirm-btn--cancel').addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
  });
}

// Note: Add Folder Button is hooked up in DOMContentLoaded

// --- Note Logic ---

function showNoteDialog(title, currentNote = '') {
  return new Promise((resolve) => {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'binas-confirm-overlay';
    dialogOverlay.innerHTML = `
      <div class="binas-confirm-dialog" style="max-width: 440px;">
        <h3 class="binas-confirm-title">${escapeHtml(title)}</h3>
        <p class="binas-confirm-text" style="margin-bottom: 12px;">Voeg een persoonlijke notitie toe aan deze favoriet:</p>
        <textarea class="binas-note-textarea" placeholder="Bijv. 'Belangrijk voor H3 toets' of 'Formule voor zwaartekracht'">${escapeHtml(currentNote)}</textarea>
        <div class="binas-confirm-buttons">
          <button class="binas-confirm-btn binas-confirm-btn--cancel">Annuleren</button>
          <button class="binas-confirm-btn binas-confirm-btn--delete" style="background: #ef4444; border-color: #ef4444; color: white;">Verwijderen</button>
          <button class="binas-confirm-btn binas-confirm-btn--confirm">Opslaan</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialogOverlay);
    const textarea = dialogOverlay.querySelector('textarea');
    const deleteBtn = dialogOverlay.querySelector('.binas-confirm-btn--delete');

    // Hide delete button if no current note
    if (!currentNote) {
      deleteBtn.hidden = true;
    }

    requestAnimationFrame(() => {
      dialogOverlay.classList.add('binas-confirm-overlay--visible');
      textarea.focus();
      // Move cursor to end
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });

    const cleanup = () => {
      dialogOverlay.classList.remove('binas-confirm-overlay--visible');
      setTimeout(() => dialogOverlay.remove(), 300);
    };

    dialogOverlay.querySelector('.binas-confirm-btn--confirm').addEventListener('click', () => {
      const val = textarea.value.trim();
      cleanup();
      resolve(val);
    });

    dialogOverlay.querySelector('.binas-confirm-btn--cancel').addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    deleteBtn.addEventListener('click', () => {
      cleanup();
      resolve(''); // Empty string to delete
    });

    // Ctrl/Cmd + Enter to save
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const val = textarea.value.trim();
        cleanup();
        resolve(val);
      }
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    });
  });
}

async function editNote(id) {
  const result = findItemAndParent(id, favorites);
  if (!result || result.item.type === 'folder') return;

  const currentNote = result.item.note || '';
  const newNote = await showNoteDialog('Notitie bewerken', currentNote);

  if (newNote !== null) {
    result.item.note = newNote;
    saveFavorites();
    renderFavoritesList();
    
    if (newNote) {
      showToast('Notitie opgeslagen', 'success');
    } else if (currentNote && !newNote) {
      showToast('Notitie verwijderd', 'info');
    }
  }
}

// --- Drag and Drop Logic ---

// Store the currently dragged item ID (backup for dataTransfer issues)
let currentDraggedItemId = null;

function handleDragStart(e, id) {
  // Stop propagation to prevent parent folders from handling this drag
  e.stopPropagation();
  
  console.log('Drag start:', id);
  
  // Store in both dataTransfer AND a variable (as backup)
  currentDraggedItemId = id;
  
  // Set data with multiple formats for better compatibility
  try {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('application/x-binas-favorite', id);
  } catch (err) {
    console.warn('Could not set dataTransfer:', err);
  }
  
  e.dataTransfer.effectAllowed = 'move';
  
  // Set drag image to the nav-item element for better visual
  const navItem = e.target.closest('.nav-item');
  if (navItem) {
    navItem.classList.add('dragging');
    // Try to set a custom drag image
    try {
      e.dataTransfer.setDragImage(navItem, 10, 10);
    } catch (err) {
      // Ignore if not supported
    }
  }
  
  // Add global drag state to show drop zones
  document.body.classList.add('is-dragging-favorite');
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  // Highlight target
  const target = e.target.closest('.nav-item, .folder-items, #favorites-list');
  if (target) {
    target.classList.add('drag-over');
  }
}

function handleDragEnter(e) {
  e.preventDefault();
  const target = e.target.closest('.nav-item, .folder-items, #favorites-list');
  if (target) {
    target.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  const target = e.target.closest('.nav-item, .folder-items, #favorites-list');
  if (target) {
    target.classList.remove('drag-over');
  }
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  
  // Remove global drag state
  document.body.classList.remove('is-dragging-favorite');
  
  // Clear backup variable
  currentDraggedItemId = null;
}

async function handleDrop(e, targetId) {
  e.preventDefault();
  e.stopPropagation();
  
  // Clean up drag state
  document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  document.body.classList.remove('is-dragging-favorite');

  // Try to get source ID from dataTransfer, fall back to stored variable
  let sourceId = e.dataTransfer.getData('text/plain');
  if (!sourceId && currentDraggedItemId) {
    sourceId = currentDraggedItemId;
  }
  currentDraggedItemId = null;
  
  if (!sourceId || sourceId === targetId) return;

  const sourceRes = findItemAndParent(sourceId, favorites);
  if (!sourceRes) return;

  const targetRes = findItemAndParent(targetId, favorites);
  if (!targetRes) return;

  // Prevent moving folder into itself
  if (sourceRes.item.type === 'folder') {
    // Check if target is child of source
    let parent = targetRes.parentItem;
    while (parent) {
      if (parent.id === sourceId) return; // Circular move
      const pRes = findItemAndParent(parent.id, favorites);
      parent = pRes ? pRes.parentItem : null;
    }
    if (targetId === sourceId) return;
  }

  // Store the item to move
  const itemToMove = sourceRes.item;
  
  // Check if source and target are in the same list
  const sameList = sourceRes.parentList === targetRes.parentList;
  const sourceBeforeTarget = sameList && sourceRes.index < targetRes.index;

  // Remove source from its original location
  sourceRes.parentList.splice(sourceRes.index, 1);

  if (targetRes.item.type === 'folder') {
    // Add to folder items
    if (!targetRes.item.items) targetRes.item.items = [];
    targetRes.item.items.push(itemToMove);
    targetRes.item.collapsed = false; // Auto expand
  } else {
    // Target is item, insert before it in its parent list
    // Adjust index if source was before target in the same list
    const insertIndex = sourceBeforeTarget ? targetRes.index - 1 : targetRes.index;
    targetRes.parentList.splice(insertIndex, 0, itemToMove);
  }

  saveFavorites();
  renderFavoritesList();
}

function handleDropOnFolderList(e, folderId) {
  e.preventDefault();
  e.stopPropagation();
  
  console.log('handleDropOnFolderList called, folderId:', folderId);
  
  // Clean up drag state (don't use handleDragEnd as e.target is the drop zone, not the dragged element)
  document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  document.body.classList.remove('is-dragging-favorite');

  // Try to get source ID from dataTransfer (try multiple formats), fall back to stored variable
  let sourceId = e.dataTransfer.getData('text/plain') || 
                 e.dataTransfer.getData('application/x-binas-favorite') ||
                 e.dataTransfer.getData('text');
  console.log('Source ID from dataTransfer:', sourceId);
  
  if (!sourceId && currentDraggedItemId) {
    console.log('Using backup currentDraggedItemId:', currentDraggedItemId);
    sourceId = currentDraggedItemId;
  }
  
  // Store the ID before clearing (in case we need it)
  const draggedId = sourceId || currentDraggedItemId;
  
  // Clear the stored ID
  currentDraggedItemId = null;
  
  if (!draggedId) {
    console.warn('No source ID found');
    return;
  }
  
  // Use the found ID
  sourceId = draggedId;

  const sourceRes = findItemAndParent(sourceId, favorites);
  console.log('Source result:', sourceRes);
  
  if (!sourceRes) {
    console.warn('Source item not found:', sourceId);
    return;
  }

  // Prevent moving folder into itself
  if (sourceRes.item.type === 'folder' && folderId === sourceId) return;
  if (sourceRes.item.type === 'folder' && folderId) {
     // Check recursion
     // Simplified check: Is sourceId an ancestor of folderId?
     if (isAncestor(sourceId, folderId, favorites)) return;
  }

  // Store item before removing
  const itemToMove = sourceRes.item;

  // Remove source from its current location
  sourceRes.parentList.splice(sourceRes.index, 1);

  if (folderId) {
    // Find target folder
    const folderRes = findItemAndParent(folderId, favorites);
    if (folderRes && folderRes.item.type === 'folder') {
        if (!folderRes.item.items) folderRes.item.items = [];
        folderRes.item.items.push(itemToMove);
        folderRes.item.collapsed = false;
    } else {
        // Fallback to root if folder not found (shouldn't happen)
        favorites.push(itemToMove);
    }
  } else {
    // Dropped on root list
    favorites.push(itemToMove);
  }

  saveFavorites();
  renderFavoritesList();
}

function isAncestor(potentialAncestorId, targetId, list) {
    // Check if targetId is inside potentialAncestorId
    const ancestor = findItemAndParent(potentialAncestorId, list)?.item;
    if (!ancestor || ancestor.type !== 'folder' || !ancestor.items) return false;

    // Check deep
    const found = findItemAndParent(targetId, ancestor.items);
    return !!found;
}
