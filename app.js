class StorylineApp {
  constructor() {
    this.storageKey = 'storyline_app';
    this.metaStorageKey = 'storyline_app_meta';
    this.stories = this.loadStories();
    this.storyMeta = this.loadStoryMeta();
    this.currentStoryId = null;
    this.autoSaveEnabled = false;
    this.autoSaveTimeout = null;
    this.touchStartY = 0;
    this.touchStartX = 0;
    this.draggedElement = null;
    this.hasUnsavedChanges = false;
    this.originalStoryState = null;
    this.paragraphSearchTimeout = null;
    this.uploadPassword = null;
    this.showLimitedParagraphs = true; // Show only last 5 paragraphs by default for mobile performance
    this.isPWA = this.detectPWAMode(); // Detect if running as PWA
    this.loadInitialAutoSavePreference();
    this.loadUploadPassword();
    this.loadThemePreference();
    this.init();
  }

  detectPWAMode() {
    // Check if app is running as PWA
    return window.navigator.standalone || // iOS Safari
           window.matchMedia('(display-mode: standalone)').matches || // Standard PWA
           window.matchMedia('(display-mode: fullscreen)').matches || // Fullscreen PWA
           document.referrer.includes('android-app://'); // Android PWA
  }

  init() {
    this.bindEvents();
    this.renderStoryList();
  }

  bindEvents() {
    // Navigation
    document.getElementById('newStoryBtn').addEventListener('click', () => this.createNewStory());
    document.getElementById('backBtn').addEventListener('click', () => this.handleBackButton());
    document.getElementById('themeToggleBtn').addEventListener('click', () => this.toggleTheme());

    // Story actions
    document.getElementById('saveStoryBtn').addEventListener('click', () => this.saveCurrentStory());
    document.getElementById('deleteStoryBtn').addEventListener('click', () => this.deleteCurrentStory());
    document.getElementById('copyStoryBtn').addEventListener('click', () => this.copyStoryToClipboard());
    document.getElementById('previewBtn').addEventListener('click', () => this.showPreview());
    document.getElementById('editBtn').addEventListener('click', () => this.showEdit());
    document.getElementById('jumpToParagraphBtn').addEventListener('click', () => this.showJumpToParagraphModal());
    
    // Advanced dropdown functionality
    document.getElementById('advancedBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleAdvancedMenu();
    });

    // Paragraph actions
    document.getElementById('addParagraphBtn').addEventListener('click', () => this.addParagraph());
    document.getElementById('expandAllBtn').addEventListener('click', () => this.expandAllParagraphs());
    document.getElementById('collapseAllBtn').addEventListener('click', () => this.collapseAllParagraphs());
    document.getElementById('showAllParagraphsBtn').addEventListener('click', () => this.toggleParagraphsView());

    // Progress actions
    document.getElementById('progressBtn').addEventListener('click', () => this.showProgress());
    document.getElementById('progressEditBtn').addEventListener('click', () => this.showEdit());

    // Sync actions - now handle dropdown toggles
    document.getElementById('syncToCloudBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSyncDropdown('upload');
    });
    document.getElementById('syncFromCloudBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSyncDropdown('download');
    });
    document.getElementById('mergeBtn').addEventListener('click', () => this.performFullMerge());
    document.getElementById('manageVersionsBtn').addEventListener('click', () => this.showVersionsModal());

    // Auto-save toggle
    document.getElementById('autoSaveToggle').addEventListener('change', (e) => {
      this.autoSaveEnabled = e.target.checked;
      this.saveAutoSavePreference();
    });

    // Clear cache button
    document.getElementById('clearCacheBtn').addEventListener('click', () => this.clearPWACache());

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
    document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearch());

    // Paragraph search functionality
    document.getElementById('paragraphSearchInput').addEventListener('input', (e) => this.handleParagraphSearchDebounced(e.target.value));
    document.getElementById('clearParagraphSearchBtn').addEventListener('click', () => this.clearParagraphSearch());

    // Notes modal functionality
    document.getElementById('closeNotesBtn').addEventListener('click', () => this.closeNotesModal());
    document.getElementById('notesModal').addEventListener('click', (e) => {
      if (e.target.id === 'notesModal') {
        this.closeNotesModal();
      }
    });

    // Paragraph note modal functionality
    document.getElementById('closeParagraphNoteBtn').addEventListener('click', () => this.closeParagraphNoteModal());
    document.getElementById('paragraphNoteModal').addEventListener('click', (e) => {
      if (e.target.id === 'paragraphNoteModal') {
        this.closeParagraphNoteModal();
      }
    });
    document.getElementById('addNoteBtn').addEventListener('click', () => this.addNewNote());
    document.getElementById('cancelNoteBtn').addEventListener('click', () => this.cancelNewNote());

    // Version management modal functionality
    document.getElementById('closeVersionsBtn').addEventListener('click', () => this.closeVersionsModal());
    document.getElementById('versionsModal').addEventListener('click', (e) => {
      if (e.target.id === 'versionsModal') {
        this.closeVersionsModal();
      }
    });
    document.getElementById('createManualBackupBtn').addEventListener('click', () => this.createManualBackup());
    document.getElementById('refreshVersionsBtn').addEventListener('click', () => this.refreshAutoVersions());

    // AI Settings modal functionality
    document.getElementById('closeAiSettingsBtn').addEventListener('click', () => this.closeAiSettingsModal());
    document.getElementById('aiSettingsModal').addEventListener('click', (e) => {
      if (e.target.id === 'aiSettingsModal') {
        this.closeAiSettingsModal();
      }
    });
    document.getElementById('addApiKeyBtn').addEventListener('click', () => this.addApiKey());
    document.getElementById('saveAiSettingsBtn').addEventListener('click', () => this.saveAiSettings());
    document.getElementById('testAiBtn').addEventListener('click', () => this.testAiConnection());
    document.getElementById('refreshModelsBtn').addEventListener('click', () => this.loadAvailableModels());
    
    // Handle AI mode changes
    document.addEventListener('change', (e) => {
      if (e.target.name === 'aiMode') {
        this.handleAiModeChange(e.target.value);
      }
    });
    
    // Handle model selection
    document.addEventListener('change', (e) => {
      if (e.target.id === 'customModelSelect') {
        this.handleModelSelection(e.target.value);
      }
    });

    // Sticky navigation functionality
    document.getElementById('jumpToTopBtn').addEventListener('click', () => this.jumpToTop());
    document.getElementById('jumpToBottomBtn').addEventListener('click', () => this.jumpToBottom());

    // Prevent accidental navigation away from the app
    this.setupNavigationWarning();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Setup smart sticky navigation
    this.setupSmartStickyNavigation();
  }

  setupNavigationWarning() {
    // Show warning when user tries to leave the page (close tab, refresh, navigate away)
    const handlePageLeave = (e) => {
      // Check if user is actively working on a story
      if (this.currentStoryId) {
        let message = '📖 Storyline App - Are you sure you want to leave?';
        
        if (this.hasUnsavedChanges && !this.autoSaveEnabled) {
          message = '⚠️ You have unsaved changes! Are you sure you want to leave without saving?';
        } else if (this.autoSaveEnabled) {
          message = '📖 Your work is auto-saved. Are you sure you want to leave Storyline?';
        } else {
          message = '📖 Make sure your story is saved before leaving. Continue?';
        }
        
        e.preventDefault();
        e.returnValue = message; // For older browsers
        return message;
      }
    };

    // Standard web page unload warning
    window.addEventListener('beforeunload', handlePageLeave);
    
    // PWA-specific events
    window.addEventListener('pagehide', handlePageLeave);
    
    // Handle PWA app switching and minimizing (mobile)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.currentStoryId) {
        // Auto-save when app goes to background (PWA behavior)
        if (this.autoSaveEnabled) {
          this.autoSaveStory();
        }
        // Note: We can't show confirm dialogs during visibilitychange
        // but we can auto-save to protect data
      }
    });

    // Handle app lifecycle events for PWAs
    if ('serviceWorker' in navigator) {
      // Listen for app install/uninstall events
      window.addEventListener('appinstalled', () => {
        console.log('Storyline PWA installed');
      });
      
      // Handle PWA navigation
      window.addEventListener('beforeinstallprompt', (e) => {
        // Don't show install prompt if user is actively editing
        if (this.currentStoryId && this.hasUnsavedChanges) {
          e.preventDefault();
        }
      });
    }

    // Mobile-specific: Handle app switching
    window.addEventListener('blur', () => {
      if (this.currentStoryId && this.autoSaveEnabled) {
        // Auto-save when window loses focus (user switches apps)
        this.autoSaveStory();
      }
    });

    // Handle mobile back button (Android PWA)
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      // We're in PWA mode
      document.addEventListener('backbutton', (e) => {
        if (this.currentStoryId) {
          e.preventDefault();
          const confirmLeave = confirm('🔙 Exit Storyline app? Make sure your story is saved.');
          if (confirmLeave) {
            // In PWA, we might want to minimize instead of close
            if (navigator.app && navigator.app.exitApp) {
              navigator.app.exitApp();
            } else {
              this.showStoryList();
            }
          }
        }
      }, false);
    }

    // Handle browser back/forward navigation within the app
    window.addEventListener('popstate', (e) => {
      if (this.currentStoryId) {
        let confirmMessage = '🔙 Going back to story list?';
        
        if (this.hasUnsavedChanges && !this.autoSaveEnabled) {
          confirmMessage = '⚠️ You have unsaved changes! Save your story before going back?';
        } else {
          confirmMessage = '🔙 Return to your story list?';
        }
        
        const confirmLeave = confirm(confirmMessage);
        if (!confirmLeave) {
          // Prevent navigation by pushing current state back
          history.pushState({ view: 'editor', storyId: this.currentStoryId }, '', `#story-${this.currentStoryId}`);
        } else {
          // Allow navigation to story list
          this.showStoryList();
        }
      }
    });

    // Initialize browser history state
    if (window.history.state === null) {
      history.pushState({ view: 'list' }, '', '#');
    }

    // Add PWA-specific warning for task switching
    if (this.isPWA) {
      this.setupPWAWarnings();
    }
  }

  setupPWAWarnings() {
    // Enhanced PWA exit protection
    let lastActiveTime = Date.now();
    
    // Track when user was last active
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => {
        lastActiveTime = Date.now();
      }, { passive: true });
    });

    // Handle PWA app lifecycle
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // App is going to background
        if (this.currentStoryId) {
          // Force save when PWA goes to background
          if (this.autoSaveEnabled) {
            this.autoSaveStory();
          } else if (this.hasUnsavedChanges) {
            // Try to save unsaved changes automatically when app is backgrounded
            this.saveCurrentStory();
          }
          
          // Store the time when app was backgrounded
          localStorage.setItem('storyline_last_background', Date.now().toString());
        }
      } else if (document.visibilityState === 'visible') {
        // App is coming back to foreground
        const lastBackground = localStorage.getItem('storyline_last_background');
        if (lastBackground && this.currentStoryId) {
          const timeSinceBackground = Date.now() - parseInt(lastBackground);
          
          // If app was backgrounded for more than 5 minutes, show a welcome back message
          if (timeSinceBackground > 5 * 60 * 1000) {
            setTimeout(() => {
              if (this.hasUnsavedChanges && !this.autoSaveEnabled) {
                alert('📖 Welcome back to Storyline! Don\'t forget to save your story.');
              }
            }, 1000);
          }
        }
      }
    });

    // Handle PWA window focus/blur
    window.addEventListener('focus', () => {
      // App regained focus - could be from task switcher
      if (this.currentStoryId && !this.autoSaveEnabled && this.hasUnsavedChanges) {
        // Subtle reminder about unsaved changes
        const saveBtn = document.getElementById('saveStoryBtn');
        if (saveBtn) {
          saveBtn.style.animation = 'pulse 2s ease-in-out 3';
        }
      }
    });
  }

  loadStories() {
    const stored = localStorage.getItem(this.storageKey);
    const stories = stored ? JSON.parse(stored) : {};
    
    // Ensure all stories have the required fields
    Object.values(stories).forEach(story => {
      if (!story.hasOwnProperty('lastSyncAt')) {
        story.lastSyncAt = null;
      }
      if (!story.hasOwnProperty('progressData')) {
        story.progressData = {};
      }
      if (!story.hasOwnProperty('aiSettings')) {
        story.aiSettings = {
          mode: 'smarter', // 'smarter', 'faster', or 'custom'
          customInstruction: '',
          apiKeys: [],
          customModel: '' // for custom mode
        };
      }
      // Ensure all paragraphs have progress field
      if (story.paragraphs) {
        story.paragraphs.forEach(paragraph => {
          if (!paragraph.hasOwnProperty('progress')) {
            paragraph.progress = {};
          }
        });
      }
    });
    
    return stories;
  }

  saveStories() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.stories));
  }

  loadStoryMeta() {
    const stored = localStorage.getItem(this.metaStorageKey);
    return stored ? JSON.parse(stored) : {};
  }

  saveStoryMeta() {
    localStorage.setItem(this.metaStorageKey, JSON.stringify(this.storyMeta));
  }

  isStoryReadOnly(storyId) {
    return this.storyMeta[storyId] && this.storyMeta[storyId].readOnly === true;
  }

  toggleStoryReadOnly(storyId) {
    if (!this.storyMeta[storyId]) {
      this.storyMeta[storyId] = {};
    }
    this.storyMeta[storyId].readOnly = !this.storyMeta[storyId].readOnly;
    this.saveStoryMeta();
    this.renderStoryList();
  }

  loadThemePreference() {
    const savedTheme = this.storyMeta.theme || 'light';
    this.currentTheme = savedTheme;
    this.applyTheme(savedTheme);
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.currentTheme = newTheme;
    this.storyMeta.theme = newTheme;
    this.saveStoryMeta();
    this.applyTheme(newTheme);
  }

  applyTheme(theme) {
    const body = document.body;
    const themeBtn = document.getElementById('themeToggleBtn');
    
    if (theme === 'dark') {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
      if (themeBtn) themeBtn.textContent = '☀️';
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
      if (themeBtn) themeBtn.textContent = '🌙';
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  showView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
  }

  showStoryList() {
    this.currentStoryId = null; // Clear current story when going back to list
    this.showView('storyListView');
    this.renderStoryList();
    this.hideStickyNavigation();
    
    // Update browser history
    history.pushState({ view: 'list' }, '', '#');
  }

  showStoryEditor(storyId = null) {
    this.currentStoryId = storyId;
    this.showView('storyEditorView');
    this.renderStoryEditor();
    this.showStickyNavigation();
    
    // Update browser history to handle back button properly
    if (storyId) {
      history.pushState({ view: 'editor', storyId: storyId }, '', `#story-${storyId}`);
    }
  }

  renderStoryList() {
    // Clear search when rendering story list
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
      searchInput.value = '';
      clearBtn.style.display = 'none';
    }
    
    // Use the filter method with empty search term to show all stories
    this.filterStories('');
  }

  getStoryPreview(story) {
    if (!story.paragraphs || story.paragraphs.length === 0) {
      return 'No content yet...';
    }

    const firstParagraph = story.paragraphs[0];
    const content = firstParagraph.content || '';
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  }

  createNewStory() {
    const id = this.generateId();
    const now = new Date().toISOString();
    this.stories[id] = {
      id,
      title: '',
      paragraphs: [],
      createdAt: now,
      updatedAt: now,
      lastSyncAt: null,
      progressData: {} // Initialize progress tracking for new stories
    };
    this.saveStories();
    this.showStoryEditor(id);
  }

  editStory(id) {
    if (this.isStoryReadOnly(id)) {
      // Show in preview mode for read-only stories
      this.currentStoryId = id;
      this.showStoryEditor(id);
      // Automatically switch to preview mode
      setTimeout(() => {
        this.showPreview();
      }, 100);
    } else {
      this.showStoryEditor(id);
    }
  }

  renderStoryEditor() {
    const story = this.currentStoryId ? this.stories[this.currentStoryId] : null;

    if (!story) {
      this.showStoryList();
      return;
    }

    const isReadOnly = this.isStoryReadOnly(this.currentStoryId);
    
    // Set title and disable if read-only
    const titleInput = document.getElementById('storyTitle');
    titleInput.value = story.title || '';
    titleInput.disabled = isReadOnly;
    
    // Initialize progress data if it doesn't exist
    if (!story.progressData) {
      story.progressData = {};
    }
    
    // Reset to limited view when opening a story for consistent mobile performance
    this.showLimitedParagraphs = true;
    
    // Save original state for change detection
    this.originalStoryState = JSON.parse(JSON.stringify(story));
    this.hasUnsavedChanges = false;
    
    // Only setup auto-save and change detection for editable stories
    if (!isReadOnly) {
      this.loadAutoSavePreference();
      this.setupAutoSaveListeners();
      this.setupChangeDetection();
    }
    
    this.renderParagraphs();
    this.updateProgressButton();
    
    // Update UI elements based on read-only status
    this.updateReadOnlyUI(isReadOnly);
  }

  renderParagraphs() {
    const story = this.stories[this.currentStoryId];
    const container = document.getElementById('paragraphsList');

    if (!story.paragraphs || story.paragraphs.length === 0) {
      container.innerHTML = '<p class="empty-state">No paragraphs yet. Add your first paragraph!</p>';
      this.updateShowAllButton();
      return;
    }

    // Determine which paragraphs to show
    let paragraphsToShow = story.paragraphs;
    let startIndex = 0;
    
    if (this.showLimitedParagraphs && story.paragraphs.length > 5) {
      startIndex = story.paragraphs.length - 5;
      paragraphsToShow = story.paragraphs.slice(startIndex);
    }

    // Show hidden paragraphs indicator if we're in limited mode
    let hiddenIndicator = '';
    if (this.showLimitedParagraphs && startIndex > 0) {
      hiddenIndicator = `
        <div class="hidden-paragraphs-indicator">
          <p>📝 ${startIndex} earlier paragraph${startIndex !== 1 ? 's' : ''} hidden</p>
        </div>
      `;
    }

    container.innerHTML = hiddenIndicator + paragraphsToShow.map((paragraph, relativeIndex) => {
      const index = startIndex + relativeIndex; // Actual index in the full array
      const isCollapsed = paragraph.collapsed || false;
      const displayHeading = paragraph.heading || this.getAutoHeading(paragraph.content);

      return `
                <div class="paragraph-item ${isCollapsed ? 'collapsed' : ''}" draggable="true" data-index="${index}">
                    <div class="paragraph-header">
                        <div class="paragraph-title" onclick="app.toggleParagraph(${index})">
                            <span class="collapse-icon">${isCollapsed ? '▶' : '▼'}</span>
                            <span class="paragraph-label">
                                ${isCollapsed ? this.escapeHtml(displayHeading) : `Paragraph ${index + 1}`}
                            </span>
                        </div>
                        <div class="paragraph-controls">
                            <button class="control-btn drag-handle" data-index="${index}" title="Drag to reorder">⋮⋮</button>
                            <div class="paragraph-dropdown">
                                <button class="control-btn dropdown-toggle" onclick="app.toggleParagraphDropdown(${index})" title="More actions">⋯</button>
                                <div class="paragraph-dropdown-menu" id="paragraphMenu${index}">
                                    <button class="dropdown-item" onclick="app.moveParagraph(${index}, -1); app.closeParagraphDropdown(${index})" ${index === 0 ? 'disabled' : ''}>
                                        ⬆️ Move to Top
                                    </button>
                                    <button class="dropdown-item" onclick="app.moveParagraph(${index}, 1); app.closeParagraphDropdown(${index})" ${index === story.paragraphs.length - 1 ? 'disabled' : ''}>
                                        ⬇️ Move to Bottom
                                    </button>
                                    <div class="dropdown-divider"></div>
                                    <button class="dropdown-item add-paragraph-item" onclick="app.addParagraphAfter(${index}); app.closeParagraphDropdown(${index})">
                                        ➕ Add Paragraph
                                    </button>
                                    <button class="dropdown-item ai-complete-item" onclick="app.completeParagraphWithAI(${index}); app.closeParagraphDropdown(${index})">
                                        🤖 Complete with AI
                                    </button>
                                    <button class="dropdown-item ${paragraph.notes && paragraph.notes.length > 0 ? 'has-notes' : ''}" onclick="app.showParagraphNoteModal(${index}); app.closeParagraphDropdown(${index})">
                                        📝 ${paragraph.notes && paragraph.notes.length > 0 ? 'Edit Notes' : 'Add Notes'}
                                    </button>
                                    <div class="dropdown-divider"></div>
                                    <button class="dropdown-item delete-item" onclick="app.deleteParagraph(${index}); app.closeParagraphDropdown(${index})">
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="paragraph-content-area" ${isCollapsed ? 'style="display: none;"' : ''}>
                        <input type="text" class="paragraph-heading" placeholder="Heading (optional)" 
                               value="${this.escapeHtml(paragraph.heading || '')}" 
                               onchange="app.updateParagraphHeading(${index}, this.value)"
                               oninput="app.triggerAutoSave(); app.markAsChanged();"
                               ${this.isStoryReadOnly(this.currentStoryId) ? 'disabled' : ''}>
                        <textarea class="paragraph-content" placeholder="Write your paragraph here..." 
                                  spellcheck="false"
                                  onchange="app.updateParagraphContent(${index}, this.value)"
                                  oninput="app.triggerAutoSave(); app.markAsChanged();"
                                  ${this.isStoryReadOnly(this.currentStoryId) ? 'disabled' : ''}>${this.escapeHtml(paragraph.content || '')}</textarea>
                    </div>
                </div>
            `;
    }).join('');

    this.initDragAndDrop();
    this.initMobileDragAndDrop();
    this.initAutoResize();
    this.updateShowAllButton();
    
    // Update sticky button visibility after rendering
    setTimeout(() => {
      this.updateStickyButtonsVisibility();
    }, 100);
  }

  addParagraph() {
    // Prevent adding paragraphs to read-only stories
    if (this.isStoryReadOnly(this.currentStoryId)) {
      alert('This story is read-only and cannot be edited.');
      return;
    }
    
    const story = this.stories[this.currentStoryId];
    if (!story.paragraphs) story.paragraphs = [];

    story.paragraphs.push({
      heading: '',
      content: '',
      collapsed: false,
      progress: {} // Initialize progress tracking for new paragraphs
    });

    story.updatedAt = new Date().toISOString();
    this.triggerAutoSave();
    this.renderParagraphs();
    
    // Auto-focus the new paragraph's content area if it's visible
    setTimeout(() => {
      const contentAreas = document.querySelectorAll('.paragraph-content');
      if (contentAreas.length > 0) {
        const lastContentArea = contentAreas[contentAreas.length - 1];
        lastContentArea.focus();
      }
    }, 100);
  }

  addParagraphAfter(index) {
    // Prevent adding paragraphs to read-only stories
    if (this.isStoryReadOnly(this.currentStoryId)) {
      alert('This story is read-only and cannot be edited.');
      return;
    }
    
    const story = this.stories[this.currentStoryId];
    if (!story.paragraphs) story.paragraphs = [];

    // Insert new paragraph after the specified index
    const newParagraph = {
      heading: '',
      content: '',
      collapsed: false,
      progress: {} // Initialize progress tracking for new paragraphs
    };

    story.paragraphs.splice(index + 1, 0, newParagraph);

    story.updatedAt = new Date().toISOString();
    this.triggerAutoSave();
    this.renderParagraphs();
    
    // Auto-focus the new paragraph's content area
    setTimeout(() => {
      // Find the newly created paragraph (it will be at index + 1)
      const paragraphItems = document.querySelectorAll('.paragraph-item');
      const targetParagraphIndex = index + 1;
      
      // Account for limited view mode - we need to find the actual DOM element
      paragraphItems.forEach((item) => {
        const itemIndex = parseInt(item.getAttribute('data-index'));
        if (itemIndex === targetParagraphIndex) {
          const contentArea = item.querySelector('.paragraph-content');
          if (contentArea) {
            contentArea.focus();
          }
        }
      });
    }, 100);
  }

  updateParagraphHeading(index, heading) {
    // Prevent editing read-only stories
    if (this.isStoryReadOnly(this.currentStoryId)) {
      return;
    }
    
    const story = this.stories[this.currentStoryId];
    story.paragraphs[index].heading = heading;
    story.updatedAt = new Date().toISOString();
    // Only save if auto-save is enabled, otherwise just update in memory
  }

  updateParagraphContent(index, content) {
    // Prevent editing read-only stories
    if (this.isStoryReadOnly(this.currentStoryId)) {
      return;
    }
    
    const story = this.stories[this.currentStoryId];
    story.paragraphs[index].content = content;
    story.updatedAt = new Date().toISOString();
    // Only save if auto-save is enabled, otherwise just update in memory
  }

  deleteParagraph(index) {
    // Prevent deleting from read-only stories
    if (this.isStoryReadOnly(this.currentStoryId)) {
      alert('This story is read-only and cannot be edited.');
      return;
    }
    
    if (confirm('Delete this paragraph?')) {
      const story = this.stories[this.currentStoryId];
      story.paragraphs.splice(index, 1);
      story.updatedAt = new Date().toISOString();
      this.triggerAutoSave();
      this.renderParagraphs();
    }
  }

  moveParagraph(index, direction) {
    const story = this.stories[this.currentStoryId];
    
    // Remove the paragraph from its current position
    const paragraph = story.paragraphs.splice(index, 1)[0];
    
    // Insert at top (index 0) or bottom (end of array) based on direction
    if (direction === -1) {
      // Move to top
      story.paragraphs.unshift(paragraph);
    } else {
      // Move to bottom
      story.paragraphs.push(paragraph);
    }

    story.updatedAt = new Date().toISOString();

    // Only save if auto-save is enabled
    if (this.autoSaveEnabled) {
      this.triggerAutoSave();
    }

    this.renderParagraphs();
  }

  saveCurrentStory() {
    // Prevent saving read-only stories
    if (this.isStoryReadOnly(this.currentStoryId)) {
      alert('This story is read-only and cannot be saved.');
      return;
    }
    
    const story = this.stories[this.currentStoryId];
    const title = document.getElementById('storyTitle').value.trim();

    // Update title
    story.title = title || 'Untitled Story';

    // Update paragraph content from current form state
    // We need to get the actual indices from the DOM elements since we might be in limited view
    const paragraphItems = document.querySelectorAll('.paragraph-item');
    
    paragraphItems.forEach((item) => {
      const actualIndex = parseInt(item.getAttribute('data-index'));
      const headingInput = item.querySelector('.paragraph-heading');
      const contentInput = item.querySelector('.paragraph-content');
      
      if (story.paragraphs[actualIndex] && headingInput && contentInput) {
        story.paragraphs[actualIndex].heading = headingInput.value;
        story.paragraphs[actualIndex].content = contentInput.value;
      }
    });

    story.updatedAt = new Date().toISOString();
    this.saveStories();

    // Reset unsaved changes flag and update original state
    this.hasUnsavedChanges = false;
    this.originalStoryState = JSON.parse(JSON.stringify(story));

    // Show feedback
    const btn = document.getElementById('saveStoryBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Saved!';
    btn.style.background = '#4CAF50';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 1500);
  }

  deleteCurrentStory() {
    if (confirm('Delete this story? This cannot be undone.')) {
      delete this.stories[this.currentStoryId];
      this.saveStories();
      this.showStoryList();
    }
  }

  copyStoryToClipboard() {
    const story = this.stories[this.currentStoryId];
    let text = story.title ? `${story.title}\n${'='.repeat(story.title.length)}\n\n` : '';

    story.paragraphs.forEach(paragraph => {
      if (paragraph.heading) {
        text += `${paragraph.heading}\n${'-'.repeat(paragraph.heading.length)}\n`;
      } else if (paragraph.content) {
        const words = paragraph.content.trim().split(' ').slice(0, 3);
        const autoHeading = words.join(' ') + (paragraph.content.trim().split(' ').length > 3 ? '...' : '');
        text += `${autoHeading}\n${'-'.repeat(autoHeading.length)}\n`;
      }

      if (paragraph.content) {
        text += `${paragraph.content}\n\n`;
      }
    });

    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copyStoryBtn');
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1500);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      const btn = document.getElementById('copyStoryBtn');
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1500);
    });
  }

  initDragAndDrop() {
    const paragraphs = document.querySelectorAll('.paragraph-item');

    paragraphs.forEach((item, index) => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', index);
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');

        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const targetIndex = index;

        if (draggedIndex !== targetIndex) {
          this.reorderParagraphs(draggedIndex, targetIndex);
        }
      });
    });
  }

  reorderParagraphs(fromIndex, toIndex) {
    console.log('Reordering paragraphs:', fromIndex, '->', toIndex); // Debug log

    const story = this.stories[this.currentStoryId];

    // Validate indices
    if (fromIndex < 0 || fromIndex >= story.paragraphs.length ||
      toIndex < 0 || toIndex >= story.paragraphs.length) {
      console.error('Invalid indices for reorder:', fromIndex, toIndex, 'length:', story.paragraphs.length);
      return;
    }

    // Perform the reorder
    const paragraph = story.paragraphs.splice(fromIndex, 1)[0];
    story.paragraphs.splice(toIndex, 0, paragraph);

    story.updatedAt = new Date().toISOString();

    // Always save the reorder immediately to ensure it persists
    this.saveStories();

    // Also trigger auto-save if enabled
    if (this.autoSaveEnabled) {
      this.triggerAutoSave();
    }

    this.renderParagraphs();
  }

  getAutoHeading(content) {
    if (!content || !content.trim()) return 'Empty paragraph';
    const words = content.trim().split(' ').slice(0, 3);
    return words.join(' ') + (content.trim().split(' ').length > 3 ? '...' : '');
  }



  expandAllParagraphs() {
    const story = this.stories[this.currentStoryId];
    story.paragraphs.forEach(paragraph => {
      paragraph.collapsed = false;
    });
    story.updatedAt = new Date().toISOString();
    this.triggerAutoSave();
    this.renderParagraphs();
  }

  collapseAllParagraphs() {
    const story = this.stories[this.currentStoryId];
    story.paragraphs.forEach(paragraph => {
      paragraph.collapsed = true;
    });
    story.updatedAt = new Date().toISOString();
    this.triggerAutoSave();
    this.renderParagraphs();
  }

  // Sync Dropdown functionality
  toggleSyncDropdown(type) {
    this.hideSyncDropdowns();
    
    const menuId = type === 'upload' ? 'uploadModeMenu' : 'downloadModeMenu';
    const menu = document.getElementById(menuId);
    
    if (menu) {
      menu.classList.add('show');
    }
  }

  hideSyncDropdowns() {
    const uploadMenu = document.getElementById('uploadModeMenu');
    const downloadMenu = document.getElementById('downloadModeMenu');
    
    if (uploadMenu) uploadMenu.classList.remove('show');
    if (downloadMenu) downloadMenu.classList.remove('show');
  }

  toggleParagraphsView() {
    this.showLimitedParagraphs = !this.showLimitedParagraphs;
    this.renderParagraphs();
  }

  updateShowAllButton() {
    const story = this.stories[this.currentStoryId];
    const btn = document.getElementById('showAllParagraphsBtn');
    
    if (!story || !story.paragraphs || story.paragraphs.length <= 5) {
      btn.style.display = 'none';
      return;
    }

    btn.style.display = 'inline-block';
    
    if (this.showLimitedParagraphs) {
      const hiddenCount = story.paragraphs.length - 5;
      btn.textContent = `📋 Show All (${hiddenCount} hidden)`;
      btn.title = `Show all ${story.paragraphs.length} paragraphs (may affect performance on low-end devices)`;
    } else {
      btn.textContent = '📱 Show Last 5 Only';
      btn.title = 'Show only the last 5 paragraphs for better performance';
    }
  }

  async syncToCloud(mode = 'replace') {
    // Hide sync dropdowns
    this.hideSyncDropdowns();
    
    // Password verification first
    if (!this.verifyUploadPassword(mode)) {
      return;
    }

    // First confirmation with mode info
    const modeText = mode === 'merge' ? 'merge your local stories with cloud data and upload the result' : 'upload your local stories to the cloud (replacing cloud data)';
    const confirmSync = confirm(`This will ${modeText}. Continue?`);
    if (!confirmSync) {
      return;
    }

    try {
      const btn = document.getElementById('syncToCloudBtn');
      const originalText = btn.textContent;
      btn.textContent = '☁️ Checking...';
      btn.disabled = true;

      // Wait for Firebase to be available
      if (!window.db) {
        throw new Error('Firebase not initialized');
      }

      const { doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
      const userDocRef = doc(window.db, 'storylines', 'user_data');

      // Check existing cloud data first
      const docSnap = await getDoc(userDocRef);
      let cloudStories = {};
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        cloudStories = data.stories || {};
      }

      // Only check for conflicts in replace mode (merge mode preserves all data)
      if (mode === 'replace') {
        // Check story count difference
        const localCount = Object.keys(this.stories).length;
        const cloudCount = Object.keys(cloudStories).length;
        
        if (localCount < cloudCount) {
          const storyDifference = cloudCount - localCount;
          const countWarning = confirm(
            `⚠️ STORY COUNT WARNING!\n\n` +
            `Cloud has ${storyDifference} more ${storyDifference === 1 ? 'story' : 'stories'} than your local device.\n` +
            `Local: ${localCount} stories\n` +
            `Cloud: ${cloudCount} stories\n\n` +
            `Uploading in Replace mode will DELETE ${storyDifference} ${storyDifference === 1 ? 'story' : 'stories'} from the cloud!\n\n` +
            `Consider using Merge mode instead to preserve all stories.\n\n` +
            `Do you still want to proceed with Replace mode?`
          );
          
          if (!countWarning) {
            btn.textContent = originalText;
            btn.disabled = false;
            return;
          }
        }
        
        // Compare local vs cloud data for content conflicts
        const conflicts = this.compareStoriesForUpload(this.stories, cloudStories);
        
        if (conflicts.length > 0) {
          let warningMessage = 'WARNING: Potential data loss detected!\n\n';
          warningMessage += 'The following cloud stories are newer or longer than your local versions:\n\n';
          
          conflicts.forEach(conflict => {
            warningMessage += `• "${conflict.title}"\n`;
            if (conflict.dateConflict) {
              warningMessage += `  - Cloud version is newer (${new Date(conflict.cloudDate).toLocaleString()})\n`;
            }
            if (conflict.lengthConflict) {
              warningMessage += `  - Cloud version is longer (${conflict.cloudLength} vs ${conflict.localLength} characters)\n`;
            }
            warningMessage += '\n';
          });
          
          warningMessage += 'Uploading will overwrite these cloud stories with your local versions.\n\n';
          warningMessage += 'Do you still want to proceed?';
          
          const proceedAnyway = confirm(warningMessage);
          if (!proceedAnyway) {
            btn.textContent = originalText;
            btn.disabled = false;
            return;
          }
        }
      }

      // Proceed with upload
      btn.textContent = '☁️ Uploading...';
      
      // Prepare stories for upload based on mode
      let storiesToUpload = { ...this.stories };
      
      if (mode === 'merge') {
        // Merge mode: combine local and cloud stories, keeping the latest version of each
        storiesToUpload = this.mergeStories(this.stories, cloudStories);
        btn.textContent = '🤝 Merging & Uploading...';
      }
      
      // Update timestamps for all stories being uploaded
      Object.values(storiesToUpload).forEach(story => {
        story.lastSyncAt = new Date().toISOString();
      });

      // Get existing versions to maintain version history
      const existingDoc = await getDoc(userDocRef);
      let versions = [];
      
      if (existingDoc.exists()) {
        const existingData = existingDoc.data();
        versions = existingData.versions || [];
        
        // Add current data as a new version if it exists
        if (existingData.stories) {
          versions.unshift({
            timestamp: existingData.lastSync || new Date().toISOString(),
            stories: existingData.stories,
            description: `Backup from ${new Date(existingData.lastSync || new Date()).toLocaleString()}`
          });
        }
      }
      
      // Keep only the last 5 versions
      versions = versions.slice(0, 5);

      await setDoc(userDocRef, {
        stories: storiesToUpload,
        lastSync: new Date().toISOString(),
        versions: versions
      });
      
      // Update local stories if we merged
      if (mode === 'merge') {
        this.stories = storiesToUpload;
      }

      this.saveStories(); // Save the updated timestamps locally

      btn.textContent = '✓ Synced to Cloud!';
      btn.style.background = '#4CAF50';
      
      // Refresh versions if the modal is open
      this.refreshVersionsIfModalOpen();
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('Sync to cloud failed:', error);
      const btn = document.getElementById('syncToCloudBtn');
      btn.textContent = '❌ Sync Failed';
      btn.style.background = '#f44336';
      setTimeout(() => {
        btn.textContent = '☁️ Sync To Cloud';
        btn.style.background = '';
        btn.disabled = false;
      }, 2000);
    }
  }

  async syncFromCloud(mode = 'replace') {
    // Hide sync dropdowns
    this.hideSyncDropdowns();
    
    // First confirmation with mode info
    const modeText = mode === 'merge' ? 'merge with' : 'replace';
    const confirmSync = confirm(`This will ${modeText} your local stories with cloud data. Continue?`);
    if (!confirmSync) {
      return;
    }

    try {
      const btn = document.getElementById('syncFromCloudBtn');
      const originalText = btn.textContent;
      btn.textContent = '📥 Checking...';
      btn.disabled = true;

      // Wait for Firebase to be available
      if (!window.db) {
        throw new Error('Firebase not initialized');
      }

      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

      // Use a fixed document ID for the user's data
      const userDocRef = doc(window.db, 'storylines', 'user_data');
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        throw new Error('No cloud data found');
      }

      const data = docSnap.data();
      if (!data.stories) {
        throw new Error('No story data found in cloud');
      }

      const cloudStories = data.stories;

      // Only check for conflicts in replace mode (merge mode preserves all data)
      if (mode === 'replace') {
        // Check story count difference
        const localCount = Object.keys(this.stories).length;
        const cloudCount = Object.keys(cloudStories).length;
        
        if (cloudCount < localCount) {
          const storyDifference = localCount - cloudCount;
          const countWarning = confirm(
            `⚠️ STORY COUNT WARNING!\n\n` +
            `Your local device has ${storyDifference} more ${storyDifference === 1 ? 'story' : 'stories'} than the cloud.\n` +
            `Local: ${localCount} stories\n` +
            `Cloud: ${cloudCount} stories\n\n` +
            `Downloading in Replace mode will DELETE ${storyDifference} local ${storyDifference === 1 ? 'story' : 'stories'}!\n\n` +
            `Consider using Merge mode instead to preserve all stories.\n\n` +
            `Do you still want to proceed with Replace mode?`
          );
          
          if (!countWarning) {
            btn.textContent = originalText;
            btn.disabled = false;
            return;
          }
        }
        
        // Compare cloud vs local data for content conflicts
        const conflicts = this.compareStoriesForDownload(cloudStories, this.stories);
        
        if (conflicts.length > 0) {
          let warningMessage = 'WARNING: Potential data loss detected!\n\n';
          warningMessage += 'The following local stories are newer or longer than their cloud versions:\n\n';
          
          conflicts.forEach(conflict => {
            warningMessage += `• "${conflict.title}"\n`;
            if (conflict.dateConflict) {
              warningMessage += `  - Local version is newer (${new Date(conflict.localDate).toLocaleString()})\n`;
            }
            if (conflict.lengthConflict) {
              warningMessage += `  - Local version is longer (${conflict.localLength} vs ${conflict.cloudLength} characters)\n`;
            }
            warningMessage += '\n';
          });
          
          warningMessage += 'Downloading will overwrite these local stories with cloud versions.\n\n';
          warningMessage += 'Do you still want to proceed?';
          
          const proceedAnyway = confirm(warningMessage);
          if (!proceedAnyway) {
            btn.textContent = originalText;
            btn.disabled = false;
            return;
          }
        }
      }

      // Proceed with download
      btn.textContent = '📥 Downloading...';
      
      // Prepare stories based on mode
      let storiesToKeep = { ...cloudStories };
      
      if (mode === 'merge') {
        // Merge mode: combine cloud and local stories, keeping the latest version of each
        storiesToKeep = this.mergeStories(cloudStories, this.stories);
        btn.textContent = '🤝 Merging & Downloading...';
      }
      
      // Update timestamps for all stories
      Object.values(storiesToKeep).forEach(story => {
        story.lastSyncAt = new Date().toISOString();
      });

      this.stories = storiesToKeep;
      this.saveStories();
      this.renderStoryList();

      btn.textContent = '✓ Synced from Cloud!';
      btn.style.background = '#4CAF50';

      // Refresh versions if the modal is open
      this.refreshVersionsIfModalOpen();

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('Sync from cloud failed:', error);
      const btn = document.getElementById('syncFromCloudBtn');
      btn.textContent = '❌ Sync Failed';
      btn.style.background = '#f44336';
      setTimeout(() => {
        btn.textContent = '📥 Sync From Cloud';
        btn.style.background = '';
        btn.disabled = false;
      }, 2000);
    }
  }

  // Full merge functionality - combines download and upload in merge mode
  async performFullMerge() {
    // Password verification first
    if (!this.verifyUploadPassword('merge')) {
      return;
    }

    // Confirmation dialog
    const confirmMerge = confirm(
      '🔄 Full Merge Operation\n\n' +
      'This will:\n' +
      '1. Download stories from cloud (merge mode)\n' +
      '2. Upload the merged result back to cloud\n\n' +
      'This ensures both local and cloud have the latest version of all stories.\n\n' +
      'Continue with full merge?'
    );
    
    if (!confirmMerge) {
      return;
    }

    try {
      const btn = document.getElementById('mergeBtn');
      const originalText = btn.textContent;
      btn.disabled = true;

      // Step 1: Download from cloud in merge mode
      btn.textContent = '⬇️ Downloading...';
      await this.performMergeDownload();

      // Step 2: Upload to cloud in merge mode
      btn.textContent = '⬆️ Uploading...';
      await this.performMergeUpload();

      // Success
      btn.textContent = '✅ Merge Complete!';
      btn.style.background = '#28a745';

      // Refresh the story list to show any new/updated stories
      this.renderStoryList();

      // Refresh versions if modal is open
      this.refreshVersionsIfModalOpen();

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.disabled = false;
      }, 3000);

    } catch (error) {
      console.error('Full merge failed:', error);
      const btn = document.getElementById('mergeBtn');
      btn.textContent = '❌ Merge Failed';
      btn.style.background = '#dc3545';
      
      setTimeout(() => {
        btn.textContent = '🔄 Merge';
        btn.style.background = '';
        btn.disabled = false;
      }, 3000);

      alert('Merge operation failed. Please try again or use individual sync buttons.');
    }
  }

  async performMergeDownload() {
    // Wait for Firebase to be available
    if (!window.db) {
      throw new Error('Firebase not initialized');
    }

    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    const userDocRef = doc(window.db, 'storylines', 'user_data');
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      throw new Error('No cloud data found');
    }

    const data = docSnap.data();
    const cloudStories = data.stories || {};

    // Merge local and cloud stories (keeping latest version of each)
    const mergedStories = this.mergeStories(this.stories, cloudStories);

    // Update local stories with merged result
    this.stories = mergedStories;
    this.saveStories();
  }

  async performMergeUpload() {
    // Wait for Firebase to be available
    if (!window.db) {
      throw new Error('Firebase not initialized');
    }

    const { doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    const userDocRef = doc(window.db, 'storylines', 'user_data');

    // Update timestamps for all stories being uploaded
    Object.values(this.stories).forEach(story => {
      story.lastSyncAt = new Date().toISOString();
    });

    // Get existing versions to maintain version history
    const existingDoc = await getDoc(userDocRef);
    let versions = [];
    
    if (existingDoc.exists()) {
      const existingData = existingDoc.data();
      versions = existingData.versions || [];
      
      // Add current data as a new version if it exists
      if (existingData.stories) {
        versions.unshift({
          timestamp: existingData.lastSync || new Date().toISOString(),
          stories: existingData.stories,
          description: `Backup from ${new Date(existingData.lastSync || new Date()).toLocaleString()}`
        });
      }
    }
    
    // Keep only the last 5 versions
    versions = versions.slice(0, 5);

    // Upload merged stories
    await setDoc(userDocRef, {
      stories: this.stories,
      lastSync: new Date().toISOString(),
      versions: versions
    });

    // Save updated timestamps locally
    this.saveStories();
  }

  // Auto-save functionality
  saveAutoSavePreference() {
    localStorage.setItem('storyline_autosave', this.autoSaveEnabled.toString());
  }

  loadInitialAutoSavePreference() {
    const saved = localStorage.getItem('storyline_autosave');
    this.autoSaveEnabled = saved === 'true';
  }

  loadUploadPassword() {
    this.uploadPassword = atob(atob("vZkMiRnRyIWdFpWT".split('').reverse().join(''))).split('').reverse().join('');
  }

  verifyUploadPassword(mode) {
    if (!this.uploadPassword || this.uploadPassword === 'your_secure_password_here') {
      alert('Upload password not configured. Please set UPLOAD_PASSWORD in .env file.');
      return false;
    }

    const enteredPassword = prompt('Enter upload password:');
    if (!enteredPassword) {
      return false;
    }

    if (enteredPassword !== this.uploadPassword) {
      alert('Incorrect password. Upload cancelled.');
      return false;
    }

    if (mode === 'replace') {
      const confirm = prompt('Type "REPLACE" (in capital letters) to confirm:');
      if (confirm !== 'REPLACE') {
        alert('Upload cancelled. You must type "REPLACE" exactly to confirm.');
        return false;
      }
    }

    return true;
  }

  loadAutoSavePreference() {
    const saved = localStorage.getItem('storyline_autosave');
    this.autoSaveEnabled = saved === 'true';
    document.getElementById('autoSaveToggle').checked = this.autoSaveEnabled;
  }

  setupAutoSaveListeners() {
    const titleInput = document.getElementById('storyTitle');
    titleInput.addEventListener('input', () => this.triggerAutoSave());
  }

  triggerAutoSave() {
    if (!this.autoSaveEnabled) return;

    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Set new timeout for 1 second after last change
    this.autoSaveTimeout = setTimeout(() => {
      this.autoSaveStory();
    }, 1000);
  }

  autoSaveStory() {
    const story = this.stories[this.currentStoryId];
    const title = document.getElementById('storyTitle').value.trim();

    // Update title
    story.title = title || 'Untitled Story';

    // Update paragraph content from current form state
    // We need to get the actual indices from the DOM elements since we might be in limited view
    const paragraphItems = document.querySelectorAll('.paragraph-item');
    
    paragraphItems.forEach((item) => {
      const actualIndex = parseInt(item.getAttribute('data-index'));
      const headingInput = item.querySelector('.paragraph-heading');
      const contentInput = item.querySelector('.paragraph-content');
      
      if (story.paragraphs[actualIndex] && headingInput && contentInput) {
        story.paragraphs[actualIndex].heading = headingInput.value;
        story.paragraphs[actualIndex].content = contentInput.value;
      }
    });

    story.updatedAt = new Date().toISOString();
    this.saveStories();

    // Reset unsaved changes flag since auto-save completed
    this.hasUnsavedChanges = false;
    this.originalStoryState = JSON.parse(JSON.stringify(story));

    // Show subtle feedback
    const saveBtn = document.getElementById('saveStoryBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '💾';
    setTimeout(() => {
      saveBtn.textContent = originalText;
    }, 500);
  }

  // Mobile drag and drop functionality
  initMobileDragAndDrop() {
    const dragHandles = document.querySelectorAll('.drag-handle');

    dragHandles.forEach(handle => {
      handle.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
      handle.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      handle.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    });
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.touchStartY = touch.clientY;
    this.touchStartX = touch.clientX;

    const handle = e.target;
    this.draggedElement = handle.closest('.paragraph-item');
    this.draggedElement.classList.add('dragging');

    // Create visual feedback
    this.draggedElement.style.transform = 'scale(1.02)';
    this.draggedElement.style.zIndex = '1000';
  }

  handleTouchMove(e) {
    if (!this.draggedElement) return;
    e.preventDefault();

    const touch = e.touches[0];
    const deltaY = touch.clientY - this.touchStartY;

    // Move the element
    this.draggedElement.style.transform = `translateY(${deltaY}px) scale(1.02)`;

    // Temporarily hide the dragged element to get accurate elementFromPoint
    this.draggedElement.style.pointerEvents = 'none';

    // Find the element we're hovering over
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetParagraph = elementBelow?.closest('.paragraph-item');

    // Restore pointer events
    this.draggedElement.style.pointerEvents = '';

    // Remove previous hover effects
    document.querySelectorAll('.paragraph-item').forEach(item => {
      item.classList.remove('drag-over');
    });

    // Add hover effect to target
    if (targetParagraph && targetParagraph !== this.draggedElement) {
      targetParagraph.classList.add('drag-over');
    }
  }

  handleTouchEnd(e) {
    if (!this.draggedElement) return;
    e.preventDefault();

    const touch = e.changedTouches[0];

    // Temporarily hide the dragged element to get accurate elementFromPoint
    this.draggedElement.style.pointerEvents = 'none';
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetParagraph = elementBelow?.closest('.paragraph-item');
    this.draggedElement.style.pointerEvents = '';

    // Reset visual state
    this.draggedElement.style.transform = '';
    this.draggedElement.style.zIndex = '';
    this.draggedElement.classList.remove('dragging');

    // Remove all hover effects
    document.querySelectorAll('.paragraph-item').forEach(item => {
      item.classList.remove('drag-over');
    });

    // Perform reorder if we have a valid target
    if (targetParagraph && targetParagraph !== this.draggedElement) {
      // Get fresh indices from the DOM to ensure accuracy
      const allParagraphs = Array.from(document.querySelectorAll('.paragraph-item'));
      const fromIndex = allParagraphs.indexOf(this.draggedElement);
      const toIndex = allParagraphs.indexOf(targetParagraph);

      console.log('Mobile drag: from', fromIndex, 'to', toIndex); // Debug log

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        this.reorderParagraphs(fromIndex, toIndex);
      }
    }

    this.draggedElement = null;
  }

  async clearPWACache() {
    try {
      const btn = document.getElementById('clearCacheBtn');
      const originalText = btn.textContent;
      btn.textContent = '🗑️ Clearing...';
      btn.disabled = true;

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Unregister service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
      }

      btn.textContent = '✓ Cache Cleared!';
      btn.style.background = '#4CAF50';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.disabled = false;

        // Show reload prompt
        if (confirm('Cache cleared successfully! Reload the app to complete the process?')) {
          window.location.reload();
        }
      }, 2000);

    } catch (error) {
      console.error('Clear cache failed:', error);
      const btn = document.getElementById('clearCacheBtn');
      btn.textContent = '❌ Clear Failed';
      btn.style.background = '#f44336';
      setTimeout(() => {
        btn.textContent = '🗑️ Clear Cache';
        btn.style.background = '';
        btn.disabled = false;
      }, 2000);
    }
  }

  initAutoResize() {
    const textareas = document.querySelectorAll('.paragraph-content');

    textareas.forEach(textarea => {
      // Set initial height
      this.autoResizeTextarea(textarea);

      // Add event listeners for auto-resize
      textarea.addEventListener('input', () => {
        this.autoResizeTextarea(textarea);
      });

      textarea.addEventListener('change', () => {
        this.autoResizeTextarea(textarea);
      });
    });
  }

  autoResizeTextarea(textarea) {
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Set height to scrollHeight to fit content
    const newHeight = Math.max(120, textarea.scrollHeight);
    textarea.style.height = newHeight + 'px';

    // Ensure no scrollbars
    textarea.style.overflow = 'hidden';
  }

  showPreview() {
    const story = this.stories[this.currentStoryId];
    if (!story) return;

    // Update story data from current form state before preview
    this.updateStoryFromForm();

    const editMode = document.getElementById('editMode');
    const previewMode = document.getElementById('previewMode');
    const progressMode = document.getElementById('progressMode');
    const previewBtn = document.getElementById('previewBtn');
    const progressBtn = document.getElementById('progressBtn');
    const editBtn = document.getElementById('editBtn');
    const progressEditBtn = document.getElementById('progressEditBtn');
    const contentElement = document.getElementById('previewContent');

    if (!story.paragraphs || story.paragraphs.length === 0) {
      contentElement.innerHTML = '<div class="preview-empty">No content to preview yet.</div>';
    } else {
      let previewHTML = `<div class="preview-title">${this.escapeHtml(story.title || 'Untitled Story')}</div>`;

      story.paragraphs.forEach((paragraph, index) => {
        if (paragraph.content && paragraph.content.trim()) {
          previewHTML += `<div class="preview-paragraph" id="previewParagraph${index + 1}">`;

          if (paragraph.heading && paragraph.heading.trim()) {
            previewHTML += `<div class="preview-paragraph-heading">
              <span class="preview-paragraph-number">${index + 1}.</span> ${this.escapeHtml(paragraph.heading)}
            </div>`;
          } else {
            // Show paragraph number even without heading
            previewHTML += `<div class="preview-paragraph-heading">
              <span class="preview-paragraph-number">${index + 1}.</span> ${this.getAutoHeading(paragraph.content)}
            </div>`;
          }

          previewHTML += `<div class="preview-paragraph-content">${this.escapeHtml(paragraph.content).replace(/\n/g, '<br>')}</div>`;
          previewHTML += '</div>';
        }
      });

      contentElement.innerHTML = previewHTML;
    }

    // Switch to preview mode
    editMode.style.display = 'none';
    previewMode.style.display = 'block';
    progressMode.style.display = 'none';
    previewBtn.style.display = 'none';
    progressBtn.style.display = 'inline-block';
    editBtn.style.display = 'inline-block';
    progressEditBtn.style.display = 'none';
  }

  showEdit() {
    const editMode = document.getElementById('editMode');
    const previewMode = document.getElementById('previewMode');
    const progressMode = document.getElementById('progressMode');
    const previewBtn = document.getElementById('previewBtn');
    const progressBtn = document.getElementById('progressBtn');
    const editBtn = document.getElementById('editBtn');
    const progressEditBtn = document.getElementById('progressEditBtn');

    // Switch to edit mode
    editMode.style.display = 'block';
    previewMode.style.display = 'none';
    progressMode.style.display = 'none';
    previewBtn.style.display = 'inline-block';
    progressBtn.style.display = 'inline-block';
    editBtn.style.display = 'none';
    progressEditBtn.style.display = 'none';
  }

  updateStoryFromForm() {
    const story = this.stories[this.currentStoryId];
    const title = document.getElementById('storyTitle').value.trim();

    // Update title
    story.title = title || 'Untitled Story';

    // Update paragraph content from current form state
    // We need to get the actual indices from the DOM elements since we might be in limited view
    const paragraphItems = document.querySelectorAll('.paragraph-item');
    
    paragraphItems.forEach((item) => {
      const actualIndex = parseInt(item.getAttribute('data-index'));
      const headingInput = item.querySelector('.paragraph-heading');
      const contentInput = item.querySelector('.paragraph-content');
      
      if (story.paragraphs[actualIndex] && headingInput && contentInput) {
        story.paragraphs[actualIndex].heading = headingInput.value;
        story.paragraphs[actualIndex].content = contentInput.value;
      }
    });

    story.updatedAt = new Date().toISOString();
  }

  handleBackButton() {
    if (this.hasUnsavedChanges && !this.autoSaveEnabled) {
      const confirmLeave = confirm('You have unsaved changes. Are you sure you want to go back without saving?');
      if (!confirmLeave) {
        return;
      }
    }
    this.showStoryList();
  }

  setupChangeDetection() {
    // Track changes on title input
    const titleInput = document.getElementById('storyTitle');
    titleInput.addEventListener('input', () => this.markAsChanged());

    // Note: Paragraph changes are tracked in the oninput handlers in renderParagraphs
  }

  markAsChanged() {
    if (!this.autoSaveEnabled) {
      this.hasUnsavedChanges = true;
    }
  }

  getCurrentStoryState() {
    const story = this.stories[this.currentStoryId];
    if (!story) return null;

    // Get current form state
    const currentState = {
      title: document.getElementById('storyTitle').value || '',
      paragraphs: []
    };

    const headingInputs = document.querySelectorAll('.paragraph-heading');
    const contentInputs = document.querySelectorAll('.paragraph-content');

    headingInputs.forEach((input, index) => {
      if (!currentState.paragraphs[index]) {
        currentState.paragraphs[index] = {};
      }
      currentState.paragraphs[index].heading = input.value || '';
    });

    contentInputs.forEach((input, index) => {
      if (!currentState.paragraphs[index]) {
        currentState.paragraphs[index] = {};
      }
      currentState.paragraphs[index].content = input.value || '';
    });

    return currentState;
  }

  handleSearch(searchTerm) {
    const clearBtn = document.getElementById('clearSearchBtn');
    
    // Show/hide clear button based on search term
    if (searchTerm.trim()) {
      clearBtn.style.display = 'flex';
    } else {
      clearBtn.style.display = 'none';
    }
    
    this.filterStories(searchTerm);
  }

  clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    this.filterStories('');
  }

  filterStories(searchTerm) {
    const container = document.getElementById('storyList');
    const storyIds = Object.keys(this.stories);

    if (storyIds.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No stories yet</h3>
          <p>Create your first story to get started!</p>
        </div>
      `;
      return;
    }

    // Filter stories based on search term
    const filteredIds = storyIds.filter(id => {
      const story = this.stories[id];
      const searchLower = searchTerm.toLowerCase();
      
      // Search in title
      if (story.title && story.title.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in paragraph content
      if (story.paragraphs) {
        return story.paragraphs.some(paragraph => {
          const headingMatch = paragraph.heading && paragraph.heading.toLowerCase().includes(searchLower);
          const contentMatch = paragraph.content && paragraph.content.toLowerCase().includes(searchLower);
          return headingMatch || contentMatch;
        });
      }
      
      return false;
    });

    if (filteredIds.length === 0 && searchTerm.trim()) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No stories found</h3>
          <p>No stories match "${this.escapeHtml(searchTerm)}"</p>
        </div>
      `;
      return;
    }

    // Render filtered stories
    container.innerHTML = filteredIds.map(id => {
      const story = this.stories[id];
      const preview = this.getStoryPreview(story);
      const paragraphCount = story.paragraphs ? story.paragraphs.length : 0;

      const isReadOnly = this.isStoryReadOnly(id);
      
      return `
        <div class="story-card ${isReadOnly ? 'read-only' : ''}" onclick="app.editStory('${id}')">
          <div class="story-card-header">
            <h3>${this.escapeHtml(story.title || 'Untitled Story')} ${isReadOnly ? '🔒' : ''}</h3>
            <button class="read-only-toggle ${isReadOnly ? 'active' : ''}" 
                    onclick="event.stopPropagation(); app.toggleStoryReadOnly('${id}')" 
                    title="${isReadOnly ? 'Make editable' : 'Make read-only'}">
              ${isReadOnly ? '🔓' : '🔒'}
            </button>
          </div>
          <div class="story-meta">
            ${paragraphCount} paragraph${paragraphCount !== 1 ? 's' : ''} • 
            ${new Date(story.updatedAt || story.createdAt).toLocaleDateString()}
            ${isReadOnly ? ' • Read-only' : ''}
          </div>
          <div class="story-preview">${preview}</div>
        </div>
      `;
    }).join('');
  }

  handleParagraphSearchDebounced(searchTerm) {
    const clearBtn = document.getElementById('clearParagraphSearchBtn');
    
    // Show/hide clear button based on search term immediately
    if (searchTerm.trim()) {
      clearBtn.style.display = 'flex';
    } else {
      clearBtn.style.display = 'none';
    }
    
    // Clear existing timeout
    if (this.paragraphSearchTimeout) {
      clearTimeout(this.paragraphSearchTimeout);
    }
    
    // Set new timeout for 1 second debounce
    this.paragraphSearchTimeout = setTimeout(() => {
      this.filterParagraphs(searchTerm);
    }, 1000);
  }

  handleParagraphSearch(searchTerm) {
    const clearBtn = document.getElementById('clearParagraphSearchBtn');
    
    // Show/hide clear button based on search term
    if (searchTerm.trim()) {
      clearBtn.style.display = 'flex';
    } else {
      clearBtn.style.display = 'none';
    }
    
    this.filterParagraphs(searchTerm);
  }

  clearParagraphSearch() {
    const searchInput = document.getElementById('paragraphSearchInput');
    const clearBtn = document.getElementById('clearParagraphSearchBtn');
    
    // Clear any pending search timeout
    if (this.paragraphSearchTimeout) {
      clearTimeout(this.paragraphSearchTimeout);
      this.paragraphSearchTimeout = null;
    }
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    this.filterParagraphs('');
  }

  filterParagraphs(searchTerm) {
    const paragraphItems = document.querySelectorAll('.paragraph-item');
    const searchLower = searchTerm.toLowerCase().trim();

    if (!searchLower) {
      // Show all paragraphs and remove highlighting
      paragraphItems.forEach(item => {
        item.classList.remove('search-hidden', 'search-match');
        item.style.display = '';
      });
      return;
    }

    let hasMatches = false;

    paragraphItems.forEach((item, index) => {
      const story = this.stories[this.currentStoryId];
      const paragraph = story.paragraphs[index];
      
      if (!paragraph) {
        item.classList.add('search-hidden');
        return;
      }

      const headingMatch = paragraph.heading && paragraph.heading.toLowerCase().includes(searchLower);
      const contentMatch = paragraph.content && paragraph.content.toLowerCase().includes(searchLower);
      
      if (headingMatch || contentMatch) {
        item.classList.remove('search-hidden');
        item.classList.add('search-match');
        item.style.display = '';
        hasMatches = true;
        
        // Auto-expand collapsed paragraphs that match
        if (paragraph.collapsed) {
          this.toggleParagraph(index, false); // Don't save, just expand for search
        }
      } else {
        item.classList.add('search-hidden');
        item.classList.remove('search-match');
        item.style.display = 'none';
      }
    });

    // If no matches, show a message
    if (!hasMatches && searchTerm.trim()) {
      // You could add a "no matches" message here if desired
    }
  }

  // Update toggleParagraph to accept a save parameter
  toggleParagraph(index, shouldSave = true) {
    const story = this.stories[this.currentStoryId];
    story.paragraphs[index].collapsed = !story.paragraphs[index].collapsed;
    
    if (shouldSave) {
      story.updatedAt = new Date().toISOString();
      this.triggerAutoSave();
    }
    
    this.renderParagraphs();
    
    // Restore search state after re-render
    const searchInput = document.getElementById('paragraphSearchInput');
    if (searchInput && searchInput.value.trim()) {
      this.filterParagraphs(searchInput.value);
    }
  }

  // Paragraph dropdown functionality
  toggleParagraphDropdown(index) {
    const menu = document.getElementById(`paragraphMenu${index}`);
    const isOpen = menu.classList.contains('show');
    
    // Close all other dropdowns first
    this.closeAllParagraphDropdowns();
    
    if (!isOpen) {
      menu.classList.add('show');
      
      // Close dropdown when clicking outside
      setTimeout(() => {
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.paragraph-dropdown')) {
            this.closeAllParagraphDropdowns();
          }
        }, { once: true });
      }, 0);
    }
  }

  closeParagraphDropdown(index) {
    const menu = document.getElementById(`paragraphMenu${index}`);
    if (menu) {
      menu.classList.remove('show');
    }
  }

  closeAllParagraphDropdowns() {
    document.querySelectorAll('.paragraph-dropdown-menu').forEach(menu => {
      menu.classList.remove('show');
    });
  }

  updateReadOnlyUI(isReadOnly) {
    // Disable/enable editor buttons
    const editorButtons = [
      'saveStoryBtn', 'deleteStoryBtn', 'addParagraphBtn', 
      'expandAllBtn', 'collapseAllBtn', 'showAllParagraphsBtn'
    ];
    
    editorButtons.forEach(buttonId => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.disabled = isReadOnly;
        if (isReadOnly) {
          button.style.opacity = '0.5';
          button.style.cursor = 'not-allowed';
        } else {
          button.style.opacity = '';
          button.style.cursor = '';
        }
      }
    });

    // Update auto-save toggle
    const autoSaveToggle = document.getElementById('autoSaveToggle');
    if (autoSaveToggle) {
      autoSaveToggle.disabled = isReadOnly;
    }

    // Show read-only indicator in header if needed
    const storyHeader = document.querySelector('.story-header');
    if (storyHeader) {
      const existingIndicator = storyHeader.querySelector('.read-only-indicator');
      if (isReadOnly && !existingIndicator) {
        const indicator = document.createElement('span');
        indicator.className = 'read-only-indicator';
        indicator.textContent = '🔒 Read-Only';
        indicator.style.cssText = 'color: #666; font-size: 0.9rem; margin-left: 1rem;';
        storyHeader.appendChild(indicator);
      } else if (!isReadOnly && existingIndicator) {
        existingIndicator.remove();
      }
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Helper function to calculate total character length of a story
  getStoryCharacterLength(story) {
    if (!story.paragraphs || story.paragraphs.length === 0) {
      return 0;
    }
    
    return story.paragraphs.reduce((total, paragraph) => {
      const headingLength = paragraph.heading ? paragraph.heading.length : 0;
      const contentLength = paragraph.content ? paragraph.content.length : 0;
      return total + headingLength + contentLength;
    }, 0);
  }

  // Compare stories for upload conflicts (local vs cloud)
  compareStoriesForUpload(localStories, cloudStories) {
    const conflicts = [];
    
    Object.keys(localStories).forEach(storyId => {
      const localStory = localStories[storyId];
      const cloudStory = cloudStories[storyId];
      
      if (!cloudStory) {
        return; // New story, no conflict
      }
      
      const localDate = new Date(localStory.updatedAt || localStory.createdAt);
      const cloudDate = new Date(cloudStory.updatedAt || cloudStory.createdAt);
      const localLength = this.getStoryCharacterLength(localStory);
      const cloudLength = this.getStoryCharacterLength(cloudStory);
      
      const dateConflict = cloudDate > localDate;
      const lengthConflict = cloudLength > localLength;
      
      if (dateConflict || lengthConflict) {
        conflicts.push({
          storyId,
          title: localStory.title || 'Untitled Story',
          dateConflict,
          lengthConflict,
          localDate: localDate.toISOString(),
          cloudDate: cloudDate.toISOString(),
          localLength,
          cloudLength
        });
      }
    });
    
    return conflicts;
  }

  // Compare stories for download conflicts (cloud vs local)
  compareStoriesForDownload(cloudStories, localStories) {
    const conflicts = [];
    
    Object.keys(cloudStories).forEach(storyId => {
      const cloudStory = cloudStories[storyId];
      const localStory = localStories[storyId];
      
      if (!localStory) {
        return; // New story from cloud, no conflict
      }
      
      const cloudDate = new Date(cloudStory.updatedAt || cloudStory.createdAt);
      const localDate = new Date(localStory.updatedAt || localStory.createdAt);
      const cloudLength = this.getStoryCharacterLength(cloudStory);
      const localLength = this.getStoryCharacterLength(localStory);
      
      const dateConflict = localDate > cloudDate;
      const lengthConflict = localLength > cloudLength;
      
      if (dateConflict || lengthConflict) {
        conflicts.push({
          storyId,
          title: cloudStory.title || 'Untitled Story',
          dateConflict,
          lengthConflict,
          cloudDate: cloudDate.toISOString(),
          localDate: localDate.toISOString(),
          cloudLength,
          localLength
        });
      }
    });
    
    return conflicts;
  }

  // Merge stories from two sources, keeping the latest version of each
  mergeStories(primaryStories, secondaryStories) {
    const merged = { ...primaryStories };
    
    // Go through secondary stories and add/update based on timestamps
    Object.keys(secondaryStories).forEach(storyId => {
      const secondaryStory = secondaryStories[storyId];
      const primaryStory = merged[storyId];
      
      if (!primaryStory) {
        // Story doesn't exist in primary, add it
        merged[storyId] = { ...secondaryStory };
      } else {
        // Story exists in both, compare timestamps to keep the latest
        const primaryDate = new Date(primaryStory.updatedAt || primaryStory.createdAt);
        const secondaryDate = new Date(secondaryStory.updatedAt || secondaryStory.createdAt);
        
        if (secondaryDate > primaryDate) {
          // Secondary story is newer, use it
          merged[storyId] = { ...secondaryStory };
        }
        // Otherwise keep the primary story (it's newer or same age)
      }
    });
    
    return merged;
  }

  // Notes functionality
  showNotesModal() {
    const story = this.stories[this.currentStoryId];
    if (!story) return;

    const notesContent = document.getElementById('notesContent');
    let notesHTML = '';

    if (!story.paragraphs || story.paragraphs.length === 0) {
      notesHTML = '<div class="notes-empty">No paragraphs with notes yet.</div>';
    } else {
      const paragraphsWithNotes = story.paragraphs.filter((p, index) => p.notes && p.notes.length > 0);
      
      if (paragraphsWithNotes.length === 0) {
        notesHTML = '<div class="notes-empty">No notes added yet. Click the 📝 button on any paragraph to add notes.</div>';
      } else {
        notesHTML = paragraphsWithNotes.map((paragraph, originalIndex) => {
          // Find the actual index in the story
          const actualIndex = story.paragraphs.findIndex(p => p === paragraph);
          const displayHeading = paragraph.heading || this.getAutoHeading(paragraph.content);
          
          return `
            <div class="note-summary">
              <div class="note-paragraph-title">
                <strong>Paragraph ${actualIndex + 1}: ${this.escapeHtml(displayHeading)}</strong>
              </div>
              <div class="note-content">
                ${paragraph.notes.map(note => `<div class="note-item">${this.escapeHtml(note).replace(/\n/g, '<br>')}</div>`).join('')}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    notesContent.innerHTML = notesHTML;
    document.getElementById('notesModal').style.display = 'flex';
  }

  closeNotesModal() {
    document.getElementById('notesModal').style.display = 'none';
  }

  showParagraphNoteModal(paragraphIndex) {
    this.currentNoteIndex = paragraphIndex;
    const story = this.stories[this.currentStoryId];
    const paragraph = story.paragraphs[paragraphIndex];
    
    // Set modal title
    const displayHeading = paragraph.heading || this.getAutoHeading(paragraph.content);
    document.getElementById('noteModalTitle').textContent = `📝 Notes for: ${displayHeading}`;
    
    // Initialize notes array if it doesn't exist
    if (!paragraph.notes) {
      paragraph.notes = [];
    }
    
    // Render existing notes
    this.renderParagraphNotes();
    
    // Clear the new note textarea
    document.getElementById('newNoteTextarea').value = '';
    
    document.getElementById('paragraphNoteModal').style.display = 'flex';
    document.getElementById('newNoteTextarea').focus();
  }

  closeParagraphNoteModal() {
    document.getElementById('paragraphNoteModal').style.display = 'none';
    this.currentNoteIndex = null;
  }

  renderParagraphNotes() {
    const story = this.stories[this.currentStoryId];
    const paragraph = story.paragraphs[this.currentNoteIndex];
    const notesList = document.getElementById('notesList');
    
    if (!paragraph.notes || paragraph.notes.length === 0) {
      notesList.innerHTML = '<div class="no-notes">No notes yet. Add your first note below.</div>';
      return;
    }
    
    notesList.innerHTML = paragraph.notes.map((note, noteIndex) => `
      <div class="individual-note">
        <div class="note-content">${this.escapeHtml(note).replace(/\n/g, '<br>')}</div>
        <div class="note-controls">
          <button class="note-edit-btn" onclick="app.editNote(${noteIndex})">✏️</button>
          <button class="note-delete-btn" onclick="app.deleteNote(${noteIndex})">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  addNewNote() {
    const noteText = document.getElementById('newNoteTextarea').value.trim();
    if (!noteText) return;
    
    const story = this.stories[this.currentStoryId];
    const paragraph = story.paragraphs[this.currentNoteIndex];
    
    if (!paragraph.notes) {
      paragraph.notes = [];
    }
    
    paragraph.notes.push(noteText);
    
    story.updatedAt = new Date().toISOString();
    this.triggerAutoSave();
    
    // Clear the textarea and re-render
    document.getElementById('newNoteTextarea').value = '';
    this.renderParagraphNotes();
    this.renderParagraphs(); // Update note indicators
  }

  cancelNewNote() {
    document.getElementById('newNoteTextarea').value = '';
  }

  editNote(noteIndex) {
    const story = this.stories[this.currentStoryId];
    const paragraph = story.paragraphs[this.currentNoteIndex];
    const note = paragraph.notes[noteIndex];
    
    // Replace the note display with an editable textarea
    const notesList = document.getElementById('notesList');
    const noteElements = notesList.querySelectorAll('.individual-note');
    const noteElement = noteElements[noteIndex];
    
    noteElement.innerHTML = `
      <textarea class="edit-note-textarea">${this.escapeHtml(note)}</textarea>
      <div class="note-controls">
        <button class="note-save-btn" onclick="app.saveEditedNote(${noteIndex})">💾</button>
        <button class="note-cancel-btn" onclick="app.cancelEditNote(${noteIndex})">❌</button>
      </div>
    `;
    
    // Focus and select the textarea
    const textarea = noteElement.querySelector('.edit-note-textarea');
    textarea.focus();
    textarea.select();
  }

  saveEditedNote(noteIndex) {
    const story = this.stories[this.currentStoryId];
    const paragraph = story.paragraphs[this.currentNoteIndex];
    
    const notesList = document.getElementById('notesList');
    const noteElements = notesList.querySelectorAll('.individual-note');
    const noteElement = noteElements[noteIndex];
    const textarea = noteElement.querySelector('.edit-note-textarea');
    
    const newText = textarea.value.trim();
    if (newText) {
      paragraph.notes[noteIndex] = newText;
      story.updatedAt = new Date().toISOString();
      this.triggerAutoSave();
    }
    
    this.renderParagraphNotes();
  }

  cancelEditNote(noteIndex) {
    this.renderParagraphNotes();
  }

  deleteNote(noteIndex) {
    if (confirm('Delete this note?')) {
      const story = this.stories[this.currentStoryId];
      const paragraph = story.paragraphs[this.currentNoteIndex];
      
      paragraph.notes.splice(noteIndex, 1);
      
      story.updatedAt = new Date().toISOString();
      this.triggerAutoSave();
      
      this.renderParagraphNotes();
      this.renderParagraphs(); // Update note indicators
    }
  }

  // Version management functionality
  async showVersionsModal() {
    try {
      const btn = document.getElementById('manageVersionsBtn');
      const originalText = btn.textContent;
      btn.textContent = '📋 Loading...';
      btn.disabled = true;

      // Load manual backups first (always available)
      this.renderManualVersionsList();

      // Try to load auto versions from Firebase
      try {
        if (!window.db) {
          throw new Error('Firebase not initialized');
        }

        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        const userDocRef = doc(window.db, 'storylines', 'user_data');
        const docSnap = await getDoc(userDocRef);

        let versions = [];
        if (docSnap.exists()) {
          const data = docSnap.data();
          versions = data.versions || [];
        }

        this.renderVersionsList(versions);
      } catch (firebaseError) {
        console.warn('Firebase not available for auto versions:', firebaseError);
        // Show message in auto versions tab
        document.getElementById('versionsList').innerHTML = '<div class="versions-empty">Cloud sync not available. Auto backups require cloud sync to be configured.</div>';
      }

      // Show the modal with auto tab active by default
      this.showVersionTab('auto');
      document.getElementById('versionsModal').style.display = 'flex';

      btn.textContent = originalText;
      btn.disabled = false;

    } catch (error) {
      console.error('Failed to load versions:', error);
      const btn = document.getElementById('manageVersionsBtn');
      btn.textContent = '❌ Load Failed';
      btn.style.background = '#f44336';
      setTimeout(() => {
        btn.textContent = '📋 Manage Versions';
        btn.style.background = '';
        btn.disabled = false;
      }, 2000);
    }
  }

  showVersionTab(tabName) {
    // Update tab buttons
    document.getElementById('autoVersionsTab').classList.toggle('active', tabName === 'auto');
    document.getElementById('manualVersionsTab').classList.toggle('active', tabName === 'manual');
    
    // Update tab content
    document.getElementById('autoVersionsContent').classList.toggle('active', tabName === 'auto');
    document.getElementById('manualVersionsContent').classList.toggle('active', tabName === 'manual');
    
    // Refresh manual versions list when switching to manual tab
    if (tabName === 'manual') {
      this.renderManualVersionsList();
    }
  }

  createManualBackup() {
    try {
      const nameInput = document.getElementById('manualBackupName');
      const backupName = nameInput.value.trim() || `Backup ${new Date().toLocaleString()}`;
      
      // Get current stories data
      const backupData = {
        name: backupName,
        timestamp: Date.now(),
        stories: JSON.parse(JSON.stringify(this.stories)), // Deep copy
        createdAt: new Date().toISOString()
      };

      // Get existing manual backups
      const manualBackups = this.getManualBackups();
      
      // Add new backup
      manualBackups.push(backupData);
      
      // Save to localStorage
      localStorage.setItem('storyline_manual_backups', JSON.stringify(manualBackups));
      
      // Clear input and refresh list
      nameInput.value = '';
      this.renderManualVersionsList();
      
      // Show success feedback
      const btn = document.getElementById('createManualBackupBtn');
      const originalText = btn.textContent;
      btn.textContent = '✅ Created!';
      btn.style.background = '#4CAF50';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 2000);

    } catch (error) {
      console.error('Failed to create manual backup:', error);
      alert('Failed to create backup. Please try again.');
    }
  }

  getManualBackups() {
    const stored = localStorage.getItem('storyline_manual_backups');
    return stored ? JSON.parse(stored) : [];
  }

  renderManualVersionsList() {
    const manualVersionsList = document.getElementById('manualVersionsList');
    const manualBackups = this.getManualBackups();
    
    if (!manualBackups || manualBackups.length === 0) {
      manualVersionsList.innerHTML = '<div class="versions-empty">No manual backups yet. Create your first backup above!</div>';
      return;
    }

    // Sort by timestamp (newest first)
    manualBackups.sort((a, b) => b.timestamp - a.timestamp);

    manualVersionsList.innerHTML = manualBackups.map((backup, index) => {
      const backupDate = new Date(backup.timestamp);
      const storyCount = Object.keys(backup.stories || {}).length;
      const totalParagraphs = Object.values(backup.stories || {}).reduce((total, story) => {
        return total + (story.paragraphs ? story.paragraphs.length : 0);
      }, 0);

      return `
        <div class="version-item">
          <div class="version-header">
            <div class="version-info">
              <div class="version-date">${this.escapeHtml(backup.name)}</div>
              <div class="version-stats">${backupDate.toLocaleString()} • ${storyCount} stories • ${totalParagraphs} paragraphs</div>
            </div>
            <div class="version-controls">
              <button class="version-btn preview-btn" onclick="app.previewManualBackup(${index})" title="Preview this backup">👁️</button>
              <button class="version-btn restore-btn" onclick="app.restoreManualBackup(${index})" title="Restore this backup">🔄</button>
              <button class="version-btn delete-btn" onclick="app.deleteManualBackup(${index})" title="Delete this backup" style="color: #f44336;">🗑️</button>
            </div>
          </div>
          <div class="version-description">Manual backup created locally</div>
        </div>
      `;
    }).join('');
  }

  async previewManualBackup(backupIndex) {
    try {
      const manualBackups = this.getManualBackups();
      const backup = manualBackups[backupIndex];

      if (!backup) {
        throw new Error('Backup not found');
      }

      // Create preview content
      const stories = backup.stories || {};
      const storyIds = Object.keys(stories);
      
      let previewHTML = `<div class="version-preview-header">
        <h3>Manual Backup Preview: ${this.escapeHtml(backup.name)}</h3>
        <p>Created: ${new Date(backup.timestamp).toLocaleString()}</p>
        <p>${storyIds.length} stories in this backup</p>
      </div>`;

      if (storyIds.length === 0) {
        previewHTML += '<div class="preview-empty">No stories in this backup.</div>';
      } else {
        previewHTML += storyIds.map(storyId => {
          const story = stories[storyId];
          const paragraphCount = story.paragraphs ? story.paragraphs.length : 0;
          const preview = this.getStoryPreview(story);

          return `
            <div class="preview-story-card">
              <h4>${this.escapeHtml(story.title || 'Untitled Story')}</h4>
              <div class="preview-story-meta">
                ${paragraphCount} paragraph${paragraphCount !== 1 ? 's' : ''} • 
                ${new Date(story.updatedAt || story.createdAt).toLocaleDateString()}
              </div>
              <div class="preview-story-content">${preview}</div>
            </div>
          `;
        }).join('');
      }

      // Show preview in manual versions list
      const manualVersionsList = document.getElementById('manualVersionsList');
      const originalContent = manualVersionsList.innerHTML;
      
      manualVersionsList.innerHTML = `
        <div class="version-preview">
          ${previewHTML}
          <div class="preview-controls">
            <button class="version-btn" onclick="app.closeManualBackupPreview('${originalContent.replace(/'/g, "\\'")}')">← Back to Manual Backups</button>
          </div>
        </div>
      `;

    } catch (error) {
      console.error('Failed to preview manual backup:', error);
      alert('Failed to preview backup. Please try again.');
    }
  }

  closeManualBackupPreview(originalContent) {
    const manualVersionsList = document.getElementById('manualVersionsList');
    manualVersionsList.innerHTML = originalContent.replace(/\\'/g, "'");
  }

  async restoreManualBackup(backupIndex) {
    const manualBackups = this.getManualBackups();
    const backup = manualBackups[backupIndex];

    if (!backup) {
      alert('Backup not found.');
      return;
    }

    // Multiple confirmations for safety
    const confirmRestore = confirm(`⚠️ WARNING: This will replace ALL your current local stories with the backup "${backup.name}".\n\nThis action cannot be undone. Are you sure you want to continue?`);
    if (!confirmRestore) {
      return;
    }

    const doubleConfirm = confirm('🚨 FINAL WARNING: You are about to permanently replace your current stories.\n\nClick OK to confirm this action.');
    if (!doubleConfirm) {
      return;
    }

    try {
      // Restore the backup
      this.stories = JSON.parse(JSON.stringify(backup.stories)) || {};
      this.saveStories();
      
      // Close modal and refresh view
      this.closeVersionsModal();
      this.showStoryList();

      alert(`✅ Successfully restored ${Object.keys(this.stories).length} stories from backup "${backup.name}"`);

    } catch (error) {
      console.error('Failed to restore manual backup:', error);
      alert('Failed to restore backup. Please try again.');
    }
  }

  deleteManualBackup(backupIndex) {
    const manualBackups = this.getManualBackups();
    const backup = manualBackups[backupIndex];

    if (!backup) {
      alert('Backup not found.');
      return;
    }

    const confirmDelete = confirm(`Delete backup "${backup.name}"?\n\nThis action cannot be undone.`);
    if (!confirmDelete) {
      return;
    }

    try {
      // Remove backup from array
      manualBackups.splice(backupIndex, 1);
      
      // Save updated list
      localStorage.setItem('storyline_manual_backups', JSON.stringify(manualBackups));
      
      // Refresh the list
      this.renderManualVersionsList();

    } catch (error) {
      console.error('Failed to delete manual backup:', error);
      alert('Failed to delete backup. Please try again.');
    }
  }

  async refreshAutoVersions() {
    try {
      const btn = document.getElementById('refreshVersionsBtn');
      const originalText = btn.textContent;
      btn.textContent = '🔄 Refreshing...';
      btn.disabled = true;

      // Wait for Firebase to be available
      if (!window.db) {
        throw new Error('Firebase not initialized');
      }

      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
      const userDocRef = doc(window.db, 'storylines', 'user_data');
      const docSnap = await getDoc(userDocRef);

      let versions = [];
      if (docSnap.exists()) {
        const data = docSnap.data();
        versions = data.versions || [];
      }

      this.renderVersionsList(versions);

      btn.textContent = '✅ Refreshed!';
      btn.style.background = '#4CAF50';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.disabled = false;
      }, 1500);

    } catch (error) {
      console.error('Failed to refresh versions:', error);
      const btn = document.getElementById('refreshVersionsBtn');
      btn.textContent = '❌ Refresh Failed';
      btn.style.background = '#f44336';
      setTimeout(() => {
        btn.textContent = '🔄 Refresh';
        btn.style.background = '';
        btn.disabled = false;
      }, 2000);
      
      // Show error message in versions list
      document.getElementById('versionsList').innerHTML = '<div class="versions-empty">Failed to refresh versions. Cloud sync may not be available.</div>';
    }
  }

  refreshVersionsIfModalOpen() {
    // Check if versions modal is open and auto tab is active
    const modal = document.getElementById('versionsModal');
    const autoTab = document.getElementById('autoVersionsTab');
    
    if (modal && modal.style.display === 'flex' && autoTab && autoTab.classList.contains('active')) {
      // Add a small delay to ensure the upload has completed
      setTimeout(() => {
        this.refreshAutoVersions();
      }, 1000);
    }
  }

  closeVersionsModal() {
    document.getElementById('versionsModal').style.display = 'none';
  }

  renderVersionsList(versions) {
    const versionsList = document.getElementById('versionsList');
    
    if (!versions || versions.length === 0) {
      versionsList.innerHTML = '<div class="versions-empty">No backup versions available yet. Upload to cloud to create your first backup.</div>';
      return;
    }

    versionsList.innerHTML = versions.map((version, index) => {
      const versionDate = new Date(version.timestamp);
      const storyCount = Object.keys(version.stories || {}).length;
      const totalParagraphs = Object.values(version.stories || {}).reduce((total, story) => {
        return total + (story.paragraphs ? story.paragraphs.length : 0);
      }, 0);

      return `
        <div class="version-item">
          <div class="version-header">
            <div class="version-info">
              <div class="version-date">${versionDate.toLocaleString()}</div>
              <div class="version-stats">${storyCount} stories • ${totalParagraphs} paragraphs</div>
            </div>
            <div class="version-controls">
              <button class="version-btn preview-btn" onclick="app.previewVersion(${index})" title="Preview this version">👁️</button>
              <button class="version-btn restore-btn" onclick="app.restoreVersion(${index})" title="Restore this version">🔄</button>
            </div>
          </div>
          <div class="version-description">${this.escapeHtml(version.description || 'Backup version')}</div>
        </div>
      `;
    }).join('');
  }

  async previewVersion(versionIndex) {
    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
      const userDocRef = doc(window.db, 'storylines', 'user_data');
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        throw new Error('No cloud data found');
      }

      const data = docSnap.data();
      const versions = data.versions || [];
      const version = versions[versionIndex];

      if (!version) {
        throw new Error('Version not found');
      }

      // Create preview content
      const stories = version.stories || {};
      const storyIds = Object.keys(stories);
      
      let previewHTML = `<div class="version-preview-header">
        <h3>Version Preview: ${new Date(version.timestamp).toLocaleString()}</h3>
        <p>${storyIds.length} stories in this version</p>
      </div>`;

      if (storyIds.length === 0) {
        previewHTML += '<div class="preview-empty">No stories in this version.</div>';
      } else {
        previewHTML += storyIds.map(storyId => {
          const story = stories[storyId];
          const paragraphCount = story.paragraphs ? story.paragraphs.length : 0;
          const preview = this.getStoryPreview(story);

          return `
            <div class="preview-story-card">
              <h4>${this.escapeHtml(story.title || 'Untitled Story')}</h4>
              <div class="preview-story-meta">
                ${paragraphCount} paragraph${paragraphCount !== 1 ? 's' : ''} • 
                ${new Date(story.updatedAt || story.createdAt).toLocaleDateString()}
              </div>
              <div class="preview-story-content">${preview}</div>
            </div>
          `;
        }).join('');
      }

      // Show preview in a new modal or replace current content
      const versionsList = document.getElementById('versionsList');
      const originalContent = versionsList.innerHTML;
      
      versionsList.innerHTML = `
        <div class="version-preview">
          ${previewHTML}
          <div class="preview-controls">
            <button class="version-btn" onclick="app.closeVersionPreview('${originalContent.replace(/'/g, "\\'")}')">← Back to Versions</button>
          </div>
        </div>
      `;

    } catch (error) {
      console.error('Failed to preview version:', error);
      alert('Failed to preview version. Please try again.');
    }
  }

  closeVersionPreview(originalContent) {
    const versionsList = document.getElementById('versionsList');
    versionsList.innerHTML = originalContent.replace(/\\'/g, "'");
  }

  async restoreVersion(versionIndex) {
    // Multiple confirmations for safety
    const confirmRestore = confirm('⚠️ WARNING: This will replace ALL your current local stories with the selected backup version.\n\nThis action cannot be undone. Are you sure you want to continue?');
    if (!confirmRestore) {
      return;
    }

    const doubleConfirm = confirm('🚨 FINAL WARNING: You are about to permanently replace your current stories.\n\nType "RESTORE" in the next dialog to confirm this action.');
    if (!doubleConfirm) {
      return;
    }

    const confirmText = 'RESTORE' //prompt('Type "RESTORE" (in capital letters) to confirm:');
    if (confirmText !== 'RESTORE') {
      alert('Restoration cancelled. You must type "RESTORE" exactly to confirm.');
      return;
    }

    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
      const userDocRef = doc(window.db, 'storylines', 'user_data');
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        throw new Error('No cloud data found');
      }

      const data = docSnap.data();
      const versions = data.versions || [];
      const version = versions[versionIndex];

      if (!version) {
        throw new Error('Version not found');
      }

      // Restore the version
      this.stories = version.stories || {};
      this.saveStories();
      
      // Close modal and refresh view
      this.closeVersionsModal();
      this.showStoryList();

      alert(`✅ Successfully restored ${Object.keys(this.stories).length} stories from backup created on ${new Date(version.timestamp).toLocaleString()}`);

    } catch (error) {
      console.error('Failed to restore version:', error);
      alert('Failed to restore version. Please try again.');
    }
  }

  // Progress tracking functionality
  showProgress() {
    const story = this.stories[this.currentStoryId];
    if (!story) return;

    // Update story data from current form state before showing progress
    this.updateStoryFromForm();

    const editMode = document.getElementById('editMode');
    const previewMode = document.getElementById('previewMode');
    const progressMode = document.getElementById('progressMode');
    const previewBtn = document.getElementById('previewBtn');
    const progressBtn = document.getElementById('progressBtn');
    const editBtn = document.getElementById('editBtn');
    const progressEditBtn = document.getElementById('progressEditBtn');
    const contentElement = document.getElementById('progressContent');

    if (!story.paragraphs || story.paragraphs.length === 0) {
      contentElement.innerHTML = '<div class="progress-empty">No content to track progress yet.</div>';
    } else {
      this.renderProgressContent();
    }

    // Switch to progress mode
    editMode.style.display = 'none';
    previewMode.style.display = 'none';
    progressMode.style.display = 'block';
    previewBtn.style.display = 'inline-block';
    progressBtn.style.display = 'none';
    editBtn.style.display = 'none';
    progressEditBtn.style.display = 'inline-block';
  }

  renderProgressContent() {
    const story = this.stories[this.currentStoryId];
    const contentElement = document.getElementById('progressContent');
    
    // Initialize progress data if needed
    if (!story.progressData) {
      story.progressData = {};
    }

    // Calculate progress statistics
    const stats = this.calculateProgressStats(story);
    
    let progressHTML = `<div class="progress-title">${this.escapeHtml(story.title || 'Untitled Story')}</div>`;
    
    // Progress statistics
    progressHTML += `
      <div class="progress-stats">
        <div class="progress-text">${stats.completedSentences} of ${stats.totalSentences} sentences completed</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${stats.percentage}%"></div>
        </div>
        <div class="progress-details">${stats.percentage}% complete</div>
      </div>
    `;

    // Render paragraphs with clickable sentences
    story.paragraphs.forEach((paragraph, paragraphIndex) => {
      if (paragraph.content && paragraph.content.trim()) {
        progressHTML += '<div class="progress-paragraph">';

        if (paragraph.heading && paragraph.heading.trim()) {
          progressHTML += `<div class="progress-paragraph-heading">${this.escapeHtml(paragraph.heading)}</div>`;
        }

        // Split content into sentences and make them clickable
        const sentences = this.splitIntoSentences(paragraph.content);
        const sentenceHTML = sentences.map((sentence, sentenceIndex) => {
          const sentenceId = `${paragraphIndex}-${sentenceIndex}`;
          const isCompleted = story.progressData[sentenceId] || false;
          const completedClass = isCompleted ? 'completed' : '';
          
          return `<span class="progress-sentence ${completedClass}" 
                       onclick="app.toggleSentenceProgress('${sentenceId}')"
                       data-sentence-id="${sentenceId}">
                    ${this.escapeHtml(sentence)}
                  </span>`;
        }).join(' ');

        progressHTML += `<div class="progress-paragraph-content">${sentenceHTML}</div>`;
        progressHTML += '</div>';
      }
    });

    contentElement.innerHTML = progressHTML;
  }

  splitIntoSentences(text) {
    // Split text into sentences using common sentence endings
    // This is a simple implementation - could be enhanced with more sophisticated NLP
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    return sentences.map(sentence => sentence.trim() + '.');
  }

  toggleSentenceProgress(sentenceId) {
    const story = this.stories[this.currentStoryId];
    
    // Initialize progress data if needed
    if (!story.progressData) {
      story.progressData = {};
    }

    // Toggle the sentence completion status
    story.progressData[sentenceId] = !story.progressData[sentenceId];
    
    // Update timestamp
    story.updatedAt = new Date().toISOString();
    
    // Save changes
    this.saveStories();
    
    // Update the visual state
    const sentenceElement = document.querySelector(`[data-sentence-id="${sentenceId}"]`);
    if (sentenceElement) {
      if (story.progressData[sentenceId]) {
        sentenceElement.classList.add('completed');
      } else {
        sentenceElement.classList.remove('completed');
      }
    }
    
    // Update progress statistics
    this.updateProgressStats();
    this.updateProgressButton();
  }

  calculateProgressStats(story) {
    if (!story.paragraphs || story.paragraphs.length === 0) {
      return { totalSentences: 0, completedSentences: 0, percentage: 0 };
    }

    let totalSentences = 0;
    let completedSentences = 0;

    story.paragraphs.forEach((paragraph, paragraphIndex) => {
      if (paragraph.content && paragraph.content.trim()) {
        const sentences = this.splitIntoSentences(paragraph.content);
        totalSentences += sentences.length;

        sentences.forEach((sentence, sentenceIndex) => {
          const sentenceId = `${paragraphIndex}-${sentenceIndex}`;
          if (story.progressData && story.progressData[sentenceId]) {
            completedSentences++;
          }
        });
      }
    });

    const percentage = totalSentences > 0 ? Math.round((completedSentences / totalSentences) * 100) : 0;

    return { totalSentences, completedSentences, percentage };
  }

  updateProgressStats() {
    const story = this.stories[this.currentStoryId];
    const stats = this.calculateProgressStats(story);
    
    // Update the progress bar and text in the current view
    const progressText = document.querySelector('.progress-text');
    const progressFill = document.querySelector('.progress-fill');
    const progressDetails = document.querySelector('.progress-details');
    
    if (progressText) {
      progressText.textContent = `${stats.completedSentences} of ${stats.totalSentences} sentences completed`;
    }
    
    if (progressFill) {
      progressFill.style.width = `${stats.percentage}%`;
    }
    
    if (progressDetails) {
      progressDetails.textContent = `${stats.percentage}% complete`;
    }
  }

  updateProgressButton() {
    const story = this.stories[this.currentStoryId];
    if (!story) return;

    const stats = this.calculateProgressStats(story);
    const progressBtn = document.getElementById('progressBtn');
    
    if (progressBtn) {
      progressBtn.textContent = `📊 Progress (${stats.percentage}%)`;
    }
  }

  // AI Settings functionality
  showAiSettingsModal() {
    const story = this.stories[this.currentStoryId];
    if (!story) return;

    // Load current settings
    const aiSettings = story.aiSettings || { mode: 'smarter', customInstruction: '', apiKeys: [], customModel: '' };
    
    // Set radio button
    const modeRadio = document.getElementById(
      aiSettings.mode === 'smarter' ? 'aiModeSmarter' : 
      aiSettings.mode === 'faster' ? 'aiModeFaster' : 'aiModeCustom'
    );
    if (modeRadio) modeRadio.checked = true;
    
    // Set custom instruction
    document.getElementById('customInstruction').value = aiSettings.customInstruction || '';
    
    // Handle custom model section
    this.handleAiModeChange(aiSettings.mode);
    
    // Load models if custom mode and we have API keys
    if (aiSettings.mode === 'custom' && aiSettings.apiKeys.length > 0) {
      this.loadAvailableModels().then(() => {
        // Set selected model after models are loaded
        if (aiSettings.customModel) {
          document.getElementById('customModelSelect').value = aiSettings.customModel;
          this.handleModelSelection(aiSettings.customModel);
        }
      });
    }
    
    // Render API keys
    this.renderApiKeys();
    
    document.getElementById('aiSettingsModal').style.display = 'flex';
  }

  closeAiSettingsModal() {
    document.getElementById('aiSettingsModal').style.display = 'none';
  }

  renderApiKeys() {
    const story = this.stories[this.currentStoryId];
    const apiKeys = story.aiSettings?.apiKeys || [];
    const container = document.getElementById('apiKeysList');
    
    if (apiKeys.length === 0) {
      container.innerHTML = '<div class="no-api-keys">No API keys added yet. Add your first Groq API key below.</div>';
      return;
    }
    
    container.innerHTML = apiKeys.map((key, index) => {
      const maskedKey = key.substring(0, 8) + '...' + key.substring(key.length - 4);
      return `
        <div class="api-key-item">
          <span class="api-key-text">${maskedKey}</span>
          <button class="api-key-delete" onclick="app.removeApiKey(${index})" title="Remove API key">🗑️</button>
        </div>
      `;
    }).join('');
  }

  addApiKey() {
    const newKeyInput = document.getElementById('newApiKey');
    const newKey = newKeyInput.value.trim();
    
    if (!newKey) {
      alert('Please enter an API key');
      return;
    }
    
    if (!newKey.startsWith('gsk_')) {
      alert('Invalid Groq API key format. Keys should start with "gsk_"');
      return;
    }
    
    const story = this.stories[this.currentStoryId];
    if (!story.aiSettings.apiKeys.includes(newKey)) {
      story.aiSettings.apiKeys.push(newKey);
      newKeyInput.value = '';
      this.renderApiKeys();
    } else {
      alert('This API key is already added');
    }
  }

  removeApiKey(index) {
    if (confirm('Remove this API key?')) {
      const story = this.stories[this.currentStoryId];
      story.aiSettings.apiKeys.splice(index, 1);
      this.renderApiKeys();
    }
  }

  handleAiModeChange(mode) {
    const customSection = document.getElementById('customModelSection');
    if (mode === 'custom') {
      customSection.style.display = 'block';
      // Load models if we have API keys
      const story = this.stories[this.currentStoryId];
      if (story.aiSettings?.apiKeys?.length > 0) {
        this.loadAvailableModels();
      } else {
        document.getElementById('customModelSelect').innerHTML = '<option value="">Add API keys first</option>';
      }
    } else {
      customSection.style.display = 'none';
    }
  }

  async loadAvailableModels() {
    const story = this.stories[this.currentStoryId];
    const apiKeys = story.aiSettings?.apiKeys || [];
    
    if (apiKeys.length === 0) {
      document.getElementById('customModelSelect').innerHTML = '<option value="">Add API keys first</option>';
      return;
    }

    const select = document.getElementById('customModelSelect');
    const refreshBtn = document.getElementById('refreshModelsBtn');
    
    select.innerHTML = '<option value="">Loading models...</option>';
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳';

    try {
      // Use first API key to fetch models
      const apiKey = apiKeys[0];
      
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format');
      }

      // Sort models by name and filter for chat models
      const models = data.data
        .filter(model => model.id && !model.id.includes('whisper')) // Filter out non-chat models
        .sort((a, b) => a.id.localeCompare(b.id));

      select.innerHTML = '<option value="">Select a model...</option>';
      
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.id;
        option.dataset.modelData = JSON.stringify(model);
        select.appendChild(option);
      });

      refreshBtn.textContent = '🔄 Refresh';
      refreshBtn.disabled = false;

    } catch (error) {
      console.error('Failed to load models:', error);
      select.innerHTML = '<option value="">Failed to load models</option>';
      refreshBtn.textContent = '❌ Failed';
      setTimeout(() => {
        refreshBtn.textContent = '🔄 Refresh';
        refreshBtn.disabled = false;
      }, 2000);
    }
  }

  handleModelSelection(modelId) {
    const select = document.getElementById('customModelSelect');
    const modelInfo = document.getElementById('modelInfo');
    
    if (!modelId) {
      modelInfo.innerHTML = '<p>Select a model to see details</p>';
      return;
    }

    const selectedOption = select.querySelector(`option[value="${modelId}"]`);
    if (!selectedOption || !selectedOption.dataset.modelData) {
      modelInfo.innerHTML = '<p>Model information not available</p>';
      return;
    }

    try {
      const modelData = JSON.parse(selectedOption.dataset.modelData);
      
      modelInfo.innerHTML = `
        <div class="model-details">
          <div class="model-name">${modelData.id}</div>
          <div class="model-description">
            ${this.getModelDescription(modelData.id)}
          </div>
          <div class="model-specs">
            <div class="model-spec">
              <span class="spec-label">Owner</span>
              <span class="spec-value">${modelData.owned_by || 'Unknown'}</span>
            </div>
            <div class="model-spec">
              <span class="spec-label">Created</span>
              <span class="spec-value">${modelData.created ? new Date(modelData.created * 1000).toLocaleDateString() : 'Unknown'}</span>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error parsing model data:', error);
      modelInfo.innerHTML = '<p>Error loading model details</p>';
    }
  }

  getModelDescription(modelId) {
    const descriptions = {
      'llama-3.1-70b-versatile': 'Large, high-quality model with excellent reasoning capabilities. Best for complex tasks.',
      'llama-3.1-8b-instant': 'Fast, efficient model optimized for quick responses. Good balance of speed and quality.',
      'llama3-70b-8192': 'Previous generation Llama model with good performance.',
      'llama3-8b-8192': 'Smaller, faster version of Llama 3.',
      'mixtral-8x7b-32768': 'Mixture of experts model with strong performance across various tasks.',
      'gemma-7b-it': 'Google\'s Gemma model optimized for instruction following.',
      'gemma2-9b-it': 'Updated Gemma model with improved capabilities.'
    };
    
    return descriptions[modelId] || 'Advanced language model for text generation and conversation.';
  }

  saveAiSettings() {
    const story = this.stories[this.currentStoryId];
    
    // Get AI mode
    const aiMode = document.querySelector('input[name="aiMode"]:checked')?.value || 'smarter';
    
    // Get custom instruction
    const customInstruction = document.getElementById('customInstruction').value.trim();
    
    // Get custom model if in custom mode
    const customModel = aiMode === 'custom' ? document.getElementById('customModelSelect').value : '';
    
    // Update settings
    story.aiSettings = {
      mode: aiMode,
      customInstruction: customInstruction,
      apiKeys: story.aiSettings?.apiKeys || [],
      customModel: customModel
    };
    
    story.updatedAt = new Date().toISOString();
    this.saveStories();
    
    // Show feedback
    const btn = document.getElementById('saveAiSettingsBtn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    btn.style.background = '#4CAF50';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 1500);
  }

  async testAiConnection() {
    const story = this.stories[this.currentStoryId];
    const apiKeys = story.aiSettings?.apiKeys || [];
    
    if (apiKeys.length === 0) {
      alert('Please add at least one API key first');
      return;
    }
    
    const btn = document.getElementById('testAiBtn');
    const originalText = btn.textContent;
    btn.textContent = '🔄 Testing...';
    btn.disabled = true;
    
    try {
      const response = await this.callGroqAPI('Test connection', 'Say "Hello from Groq!" in a friendly way.');
      
      if (response) {
        btn.textContent = '✓ Connected!';
        btn.style.background = '#4CAF50';
        alert('✅ AI connection successful!\n\nResponse: ' + response);
      } else {
        throw new Error('No response received');
      }
    } catch (error) {
      console.error('AI test failed:', error);
      btn.textContent = '❌ Failed';
      btn.style.background = '#f44336';
      alert('❌ AI connection failed: ' + error.message);
    }
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);
  }

  async completeParagraphWithAI(paragraphIndex) {
    const story = this.stories[this.currentStoryId];
    const paragraph = story.paragraphs[paragraphIndex];
    const apiKeys = story.aiSettings?.apiKeys || [];
    
    if (apiKeys.length === 0) {
      alert('Please add Groq API keys in AI Settings first');
      return;
    }
    
    if (!paragraph.heading && (!paragraph.content || paragraph.content.trim().length < 10)) {
      alert('Please add a heading or at least 10 characters of draft content to give the AI context');
      return;
    }
    
    // Find the AI button and show loading state
    const aiButtons = document.querySelectorAll('.ai-complete-btn');
    const currentButton = aiButtons[paragraphIndex - (this.showLimitedParagraphs ? Math.max(0, story.paragraphs.length - 5) : 0)];
    
    if (currentButton) {
      currentButton.textContent = '⏳';
      currentButton.disabled = true;
    }
    
    try {
      // Build context from story and previous paragraphs
      const context = this.buildAIContext(story, paragraphIndex);
      
      // Call Groq API
      const completion = await this.callGroqAPI(story.title || 'Untitled Story', context);
      
      if (completion) {
        // Update the paragraph content
        paragraph.content = (paragraph.content || '') + completion;
        story.updatedAt = new Date().toISOString();
        
        // Save and re-render
        this.triggerAutoSave();
        this.renderParagraphs();
        
        // Show success feedback
        if (currentButton) {
          currentButton.textContent = '✅';
          setTimeout(() => {
            const newButtons = document.querySelectorAll('.ai-complete-btn');
            const newCurrentButton = newButtons[paragraphIndex - (this.showLimitedParagraphs ? Math.max(0, story.paragraphs.length - 5) : 0)];
            if (newCurrentButton) {
              newCurrentButton.textContent = '🤖';
              newCurrentButton.disabled = false;
            }
          }, 2000);
        }
      }
    } catch (error) {
      console.error('AI completion failed:', error);
      alert('AI completion failed: ' + error.message);
      
      if (currentButton) {
        currentButton.textContent = '❌';
        setTimeout(() => {
          currentButton.textContent = '🤖';
          currentButton.disabled = false;
        }, 2000);
      }
    }
  }

  buildAIContext(story, currentParagraphIndex) {
    const currentParagraph = story.paragraphs[currentParagraphIndex];
    
    // Get previous 3 paragraphs for context
    const startIndex = Math.max(0, currentParagraphIndex - 3);
    const previousParagraphs = story.paragraphs.slice(startIndex, currentParagraphIndex);
    
    let context = `Story Title: "${story.title || 'Untitled Story'}"\n\n`;
    
    // Add previous paragraphs for context
    if (previousParagraphs.length > 0) {
      context += "Previous paragraphs for context:\n";
      previousParagraphs.forEach((para, index) => {
        const paraNumber = startIndex + index + 1;
        if (para.heading) {
          context += `\nParagraph ${paraNumber} - ${para.heading}:\n${para.content || '[No content yet]'}\n`;
        } else {
          context += `\nParagraph ${paraNumber}:\n${para.content || '[No content yet]'}\n`;
        }
      });
      context += "\n";
    }
    
    // Add current paragraph info
    const currentParaNumber = currentParagraphIndex + 1;
    context += `Current paragraph ${currentParaNumber} to complete:\n`;
    if (currentParagraph.heading) {
      context += `Heading: "${currentParagraph.heading}"\n`;
    }
    if (currentParagraph.content) {
      context += `Draft content: "${currentParagraph.content}"\n`;
    }
    
    context += `\nPlease continue or complete this paragraph. Keep the writing style consistent with the previous paragraphs. Write naturally and engagingly.`;
    
    return context;
  }

  async callGroqAPI(storyTitle, context) {
    const story = this.stories[this.currentStoryId];
    const aiSettings = story.aiSettings || {};
    const apiKeys = aiSettings.apiKeys || [];
    
    if (apiKeys.length === 0) {
      throw new Error('No API keys available');
    }
    
    // Select API key (rotate through them for load balancing)
    const keyIndex = Math.floor(Math.random() * apiKeys.length);
    const apiKey = apiKeys[keyIndex];
    
    // Select model based on mode
    let model;
    if (aiSettings.mode === 'custom') {
      model = aiSettings.customModel || 'llama-3.1-70b-versatile';
      if (!model) {
        throw new Error('No custom model selected. Please choose a model in AI Settings.');
      }
    } else if (aiSettings.mode === 'faster') {
      model = 'llama-3.1-8b-instant';
    } else {
      model = 'llama-3.1-70b-versatile';
    }
    
    // Build system prompt
    let systemPrompt = `You are a creative writing assistant helping to complete a story paragraph. Write in a natural, engaging style that flows well with the existing content.`;
    
    if (aiSettings.customInstruction) {
      systemPrompt += `\n\nAdditional instructions: ${aiSettings.customInstruction}`;
    }
    
    const requestBody = {
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: context
        }
      ],
      model: model,
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.9
    };
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from API');
    }
    
    return data.choices[0].message.content.trim();
  }

  // Jump to Paragraph functionality
  showJumpToParagraphModal() {
    const story = this.stories[this.currentStoryId];
    if (!story || !story.paragraphs || story.paragraphs.length === 0) {
      alert('No paragraphs to jump to. Add some paragraphs first.');
      return;
    }

    const totalParagraphs = story.paragraphs.length;
    const input = prompt(`Jump to paragraph (1-${totalParagraphs}):`);
    
    if (input === null) {
      // User cancelled
      return;
    }
    
    const paragraphNum = parseInt(input);
    
    if (!paragraphNum || isNaN(paragraphNum) || paragraphNum < 1 || paragraphNum > totalParagraphs) {
      alert(`Please enter a valid paragraph number between 1 and ${totalParagraphs}`);
      return;
    }
    
    this.jumpToParagraphByNumber(paragraphNum);
  }

  jumpToParagraphByNumber(paragraphNum) {
    const story = this.stories[this.currentStoryId];
    
    // Check if we're in preview mode
    const previewMode = document.getElementById('previewMode');
    const isPreviewMode = previewMode && previewMode.style.display === 'block';
    
    if (isPreviewMode) {
      // In preview mode, jump directly to the preview paragraph
      this.scrollToPreviewParagraph(paragraphNum);
    } else {
      // In edit mode, handle limited view and then scroll
      if (this.showLimitedParagraphs && story.paragraphs.length > 5) {
        const startIndex = story.paragraphs.length - 5;
        const targetIndex = paragraphNum - 1;
        
        if (targetIndex < startIndex) {
          // Target paragraph is hidden, switch to full view
          this.showLimitedParagraphs = false;
          this.renderParagraphs();
        }
      }
      
      // Wait for rendering to complete, then scroll to paragraph
      setTimeout(() => {
        this.scrollToParagraph(paragraphNum - 1);
      }, 100);
    }
  }

  scrollToPreviewParagraph(paragraphNum) {
    const targetElement = document.getElementById(`previewParagraph${paragraphNum}`);
    
    if (!targetElement) {
      alert(`Paragraph ${paragraphNum} not found in preview.`);
      return;
    }
    
    // Add highlight class
    targetElement.classList.add('jump-highlight');
    
    // Scroll to the paragraph with smooth behavior
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    
    // Remove highlight after 3 seconds
    setTimeout(() => {
      targetElement.classList.remove('jump-highlight');
    }, 3000);
  }

  scrollToParagraph(paragraphIndex) {
    // Find the paragraph element
    const paragraphItems = document.querySelectorAll('.paragraph-item');
    let targetElement = null;
    
    // Find the correct paragraph by data-index
    paragraphItems.forEach(item => {
      const dataIndex = parseInt(item.getAttribute('data-index'));
      if (dataIndex === paragraphIndex) {
        targetElement = item;
      }
    });
    
    if (!targetElement) {
      alert('Paragraph not found. It might be hidden in limited view.');
      return;
    }
    
    // Add highlight class
    targetElement.classList.add('jump-highlight');
    
    // Scroll to the paragraph with smooth behavior
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    
    // Remove highlight after animation
    setTimeout(() => {
      targetElement.classList.remove('jump-highlight');
    }, 2000);
    
    // Update sticky button visibility after scroll
    setTimeout(() => {
      this.updateStickyButtonsVisibility();
    }, 500);
    
    // If paragraph is collapsed, expand it
    const story = this.stories[this.currentStoryId];
    if (story.paragraphs[paragraphIndex].collapsed) {
      this.toggleParagraph(paragraphIndex, false); // Don't save, just expand
    }
  }

  // Sticky Navigation functionality
  jumpToTop() {
    const story = this.stories[this.currentStoryId];
    if (!story || !story.paragraphs || story.paragraphs.length === 0) {
      return;
    }
    
    // Check if we're in preview mode
    const previewMode = document.getElementById('previewMode');
    const isPreviewMode = previewMode && previewMode.style.display === 'block';
    
    if (isPreviewMode) {
      // In preview mode, find the first paragraph with content (by actual index)
      let firstParagraphIndex = -1;
      for (let i = 0; i < story.paragraphs.length; i++) {
        if (story.paragraphs[i].content && story.paragraphs[i].content.trim()) {
          firstParagraphIndex = i;
          break;
        }
      }
      if (firstParagraphIndex >= 0) {
        this.scrollToPreviewParagraph(firstParagraphIndex + 1); // +1 because IDs are 1-based
      }
    } else {
      // In edit mode, handle limited view and then scroll
      if (this.showLimitedParagraphs && story.paragraphs.length > 5) {
        this.showLimitedParagraphs = false;
        this.renderParagraphs();
        
        // Wait for rendering, then scroll to top
        setTimeout(() => {
          this.scrollToParagraph(0);
        }, 100);
      } else {
        this.scrollToParagraph(0);
      }
    }
  }

  jumpToBottom() {
    const story = this.stories[this.currentStoryId];
    if (!story || !story.paragraphs || story.paragraphs.length === 0) {
      return;
    }
    
    // Check if we're in preview mode
    const previewMode = document.getElementById('previewMode');
    const isPreviewMode = previewMode && previewMode.style.display === 'block';
    
    if (isPreviewMode) {
      // In preview mode, find the last paragraph with content (by actual index)
      let lastParagraphIndex = -1;
      for (let i = story.paragraphs.length - 1; i >= 0; i--) {
        if (story.paragraphs[i].content && story.paragraphs[i].content.trim()) {
          lastParagraphIndex = i;
          break;
        }
      }
      if (lastParagraphIndex >= 0) {
        this.scrollToPreviewParagraph(lastParagraphIndex + 1); // +1 because IDs are 1-based
      }
    } else {
      // In edit mode, scroll to last paragraph
      const lastIndex = story.paragraphs.length - 1;
      this.scrollToParagraph(lastIndex);
    }
  }

  showStickyNavigation() {
    const stickyNav = document.getElementById('stickyNavigation');
    if (stickyNav) {
      stickyNav.style.display = 'flex';
      // Initial update of button visibility
      setTimeout(() => {
        this.updateStickyButtonsVisibility();
      }, 100);
    }
  }

  hideStickyNavigation() {
    const stickyNav = document.getElementById('stickyNavigation');
    if (stickyNav) {
      stickyNav.style.display = 'none';
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when in story editor and not typing in inputs
      if (!this.currentStoryId || 
          e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable) {
        return;
      }
      
      // Ctrl+G or Cmd+G to jump to paragraph
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        this.showJumpToParagraphModal();
      }
      
      // Home key to jump to top
      if (e.key === 'Home' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.jumpToTop();
      }
      
      // End key to jump to bottom
      if (e.key === 'End' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.jumpToBottom();
      }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.advanced-dropdown') && !e.target.closest('.copy-options-dropdown')) {
        this.hideAllDropdowns();
      }
      if (!e.target.closest('.sync-dropdown')) {
        this.hideSyncDropdowns();
      }
    });
  }

  setupSmartStickyNavigation() {
    let scrollTimeout;
    
    const handleScroll = () => {
      // Clear existing timeout to debounce scroll events
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(() => {
        this.updateStickyButtonsVisibility();
      }, 100); // Debounce scroll events
    };
    
    // Listen to scroll events on the main content area
    window.addEventListener('scroll', handleScroll);
    
    // Also listen to scroll events on the paragraphs container
    const paragraphsList = document.getElementById('paragraphsList');
    if (paragraphsList) {
      paragraphsList.addEventListener('scroll', handleScroll);
    }
  }

  updateStickyButtonsVisibility() {
    // Only update when in story editor
    if (!this.currentStoryId) {
      return;
    }
    
    const topBtn = document.getElementById('jumpToTopBtn');
    const bottomBtn = document.getElementById('jumpToBottomBtn');
    
    if (!topBtn || !bottomBtn) {
      return;
    }
    
    // Get scroll information
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Calculate scroll position as percentage
    const scrollPercentage = scrollTop / (documentHeight - windowHeight);
    
    // Define thresholds
    const topThreshold = 0.1;    // Show top button when more than 10% scrolled down
    const bottomThreshold = 0.9; // Show bottom button when less than 90% scrolled down
    
    // Determine which buttons to show
    const showTopButton = scrollPercentage > topThreshold;
    const showBottomButton = scrollPercentage < bottomThreshold;
    
    // Update button visibility with smooth transitions
    if (showTopButton) {
      topBtn.style.display = 'flex';
      topBtn.style.opacity = '1';
      topBtn.style.transform = 'scale(1)';
    } else {
      topBtn.style.opacity = '0';
      topBtn.style.transform = 'scale(0.8)';
      setTimeout(() => {
        if (topBtn.style.opacity === '0') {
          topBtn.style.display = 'none';
        }
      }, 200);
    }
    
    if (showBottomButton) {
      bottomBtn.style.display = 'flex';
      bottomBtn.style.opacity = '1';
      bottomBtn.style.transform = 'scale(1)';
    } else {
      bottomBtn.style.opacity = '0';
      bottomBtn.style.transform = 'scale(0.8)';
      setTimeout(() => {
        if (bottomBtn.style.opacity === '0') {
          bottomBtn.style.display = 'none';
        }
      }, 200);
    }
  }

  // Advanced Dropdown functionality
  toggleAdvancedMenu() {
    const menu = document.getElementById('advancedMenu');
    const isVisible = menu.classList.contains('show');
    
    this.hideAllDropdowns();
    
    if (!isVisible) {
      menu.classList.add('show');
    }
  }

  hideAllDropdowns() {
    document.getElementById('advancedMenu').classList.remove('show');
    const copyDropdown = document.querySelector('.copy-options-dropdown');
    if (copyDropdown) {
      copyDropdown.style.display = 'none';
    }
  }

  showCopyOptionsMenu() {
    // Hide advanced menu and show copy options
    document.getElementById('advancedMenu').classList.remove('show');
    const copyDropdown = document.querySelector('.copy-options-dropdown');
    copyDropdown.style.display = 'block';
    document.getElementById('copyOptionsMenu').classList.add('show');
  }

  hideCopyOptionsMenu() {
    // Hide copy options and show advanced menu
    document.getElementById('copyOptionsMenu').classList.remove('show');
    document.querySelector('.copy-options-dropdown').style.display = 'none';
    document.getElementById('advancedMenu').classList.add('show');
  }

  // Copy functionality
  copyAllParagraphs() {
    this.copyParagraphsRange(0, -1, true);
    this.hideAllDropdowns();
  }

  copyTopParagraphs(count) {
    this.copyParagraphsRange(0, count - 1, true);
    this.hideAllDropdowns();
  }

  copyBottomParagraphs(count) {
    const story = this.stories[this.currentStoryId];
    const startIndex = Math.max(0, story.paragraphs.length - count);
    this.copyParagraphsRange(startIndex, -1, true);
    this.hideAllDropdowns();
  }

  copyCustomRange() {
    const story = this.stories[this.currentStoryId];
    const totalParagraphs = story.paragraphs.length;
    
    const input = prompt(`Enter range (e.g., "1-5" or "3-10"). Total paragraphs: ${totalParagraphs}`);
    
    if (!input) {
      this.hideAllDropdowns();
      return;
    }
    
    const range = input.trim().split('-');
    if (range.length !== 2) {
      alert('Please enter a valid range like "1-5"');
      return;
    }
    
    const start = parseInt(range[0]) - 1; // Convert to 0-based index
    const end = parseInt(range[1]) - 1;   // Convert to 0-based index
    
    if (isNaN(start) || isNaN(end) || start < 0 || end >= totalParagraphs || start > end) {
      alert(`Please enter a valid range between 1 and ${totalParagraphs}`);
      return;
    }
    
    this.copyParagraphsRange(start, end, true);
    this.hideAllDropdowns();
  }

  copyHeadingsOnly() {
    this.copyParagraphsRange(0, -1, false);
    this.hideAllDropdowns();
  }

  copyWithContent() {
    this.copyParagraphsRange(0, -1, true);
    this.hideAllDropdowns();
  }

  copyParagraphsRange(startIndex, endIndex, includeContent) {
    const story = this.stories[this.currentStoryId];
    if (!story || !story.paragraphs || story.paragraphs.length === 0) {
      alert('No paragraphs to copy');
      return;
    }
    
    // Handle negative endIndex (means to end)
    const actualEndIndex = endIndex === -1 ? story.paragraphs.length - 1 : endIndex;
    
    // Get the paragraphs in the specified range
    const paragraphsToShow = story.paragraphs.slice(startIndex, actualEndIndex + 1);
    
    let text = '';
    
    // Add story title if copying from beginning
    if (startIndex === 0 && story.title) {
      text += `${story.title}\n${'='.repeat(story.title.length)}\n\n`;
    }
    
    paragraphsToShow.forEach((paragraph, index) => {
      const actualIndex = startIndex + index + 1;
      
      // Add heading
      if (paragraph.heading && paragraph.heading.trim()) {
        text += `${actualIndex}. ${paragraph.heading}\n`;
        if (includeContent) {
          text += `${'-'.repeat(paragraph.heading.length + 3)}\n`;
        }
      } else if (paragraph.content && includeContent) {
        // Auto-generate heading from content
        const words = paragraph.content.trim().split(' ').slice(0, 3);
        const autoHeading = words.join(' ') + (paragraph.content.trim().split(' ').length > 3 ? '...' : '');
        text += `${actualIndex}. ${autoHeading}\n`;
        text += `${'-'.repeat(autoHeading.length + 3)}\n`;
      } else {
        text += `${actualIndex}. Paragraph ${actualIndex}\n`;
        if (includeContent) {
          text += `${'-'.repeat(15)}\n`;
        }
      }
      
      // Add content if requested
      if (includeContent && paragraph.content && paragraph.content.trim()) {
        text += `${paragraph.content}\n`;
      }
      
      text += '\n';
    });
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      const rangeText = startIndex === 0 && actualEndIndex === story.paragraphs.length - 1 
        ? 'All paragraphs' 
        : `Paragraphs ${startIndex + 1}-${actualEndIndex + 1}`;
      const formatText = includeContent ? 'with content' : 'headings only';
      
      alert(`✓ Copied! ${rangeText} (${formatText}) copied to clipboard.`);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      alert('✓ Copied to clipboard!');
    });
  }
}

// Initialize app
const app = new StorylineApp();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => console.log('SW registered'))
      .catch(error => console.log('SW registration failed'));
  });
}