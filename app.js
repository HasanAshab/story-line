class StorylineApp {
  constructor() {
    this.storageKey = 'storyline_app';
    this.stories = this.loadStories();
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

    // Story actions
    document.getElementById('saveStoryBtn').addEventListener('click', () => this.saveCurrentStory());
    document.getElementById('deleteStoryBtn').addEventListener('click', () => this.deleteCurrentStory());
    document.getElementById('copyStoryBtn').addEventListener('click', () => this.copyStoryToClipboard());
    document.getElementById('previewBtn').addEventListener('click', () => this.showPreview());
    document.getElementById('editBtn').addEventListener('click', () => this.showEdit());
    document.getElementById('notesBtn').addEventListener('click', () => this.showNotesModal());

    // Paragraph actions
    document.getElementById('addParagraphBtn').addEventListener('click', () => this.addParagraph());
    document.getElementById('expandAllBtn').addEventListener('click', () => this.expandAllParagraphs());
    document.getElementById('collapseAllBtn').addEventListener('click', () => this.collapseAllParagraphs());
    document.getElementById('showAllParagraphsBtn').addEventListener('click', () => this.toggleParagraphsView());

    // Progress actions
    document.getElementById('progressBtn').addEventListener('click', () => this.showProgress());
    document.getElementById('progressEditBtn').addEventListener('click', () => this.showEdit());

    // Sync actions
    document.getElementById('syncToCloudBtn').addEventListener('click', () => this.syncToCloud());
    document.getElementById('syncFromCloudBtn').addEventListener('click', () => this.syncFromCloud());
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

    // Prevent accidental navigation away from the app
    this.setupNavigationWarning();
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
    
    // Update browser history
    history.pushState({ view: 'list' }, '', '#');
  }

  showStoryEditor(storyId = null) {
    this.currentStoryId = storyId;
    this.showView('storyEditorView');
    this.renderStoryEditor();
    
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
    this.showStoryEditor(id);
  }

  renderStoryEditor() {
    const story = this.currentStoryId ? this.stories[this.currentStoryId] : null;

    if (!story) {
      this.showStoryList();
      return;
    }

    document.getElementById('storyTitle').value = story.title || '';
    
    // Initialize progress data if it doesn't exist
    if (!story.progressData) {
      story.progressData = {};
    }
    
    // Reset to limited view when opening a story for consistent mobile performance
    this.showLimitedParagraphs = true;
    
    // Save original state for change detection
    this.originalStoryState = JSON.parse(JSON.stringify(story));
    this.hasUnsavedChanges = false;
    
    this.loadAutoSavePreference();
    this.setupAutoSaveListeners();
    this.setupChangeDetection();
    this.renderParagraphs();
    this.updateProgressButton();
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
          <p>📝 ${startIndex} earlier paragraph${startIndex !== 1 ? 's' : ''} hidden for better performance</p>
          <button class="btn btn-small show-all-btn" onclick="app.toggleParagraphsView()">
            📋 Show All ${story.paragraphs.length} Paragraphs
          </button>
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
                            <button class="control-btn drag-handle" data-index="${index}">⋮⋮</button>
                            <button class="control-btn" onclick="app.moveParagraph(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Move to top">⬆️</button>
                            <button class="control-btn" onclick="app.moveParagraph(${index}, 1)" ${index === story.paragraphs.length - 1 ? 'disabled' : ''} title="Move to bottom">⬇️</button>
                            <button class="control-btn ${paragraph.notes && paragraph.notes.length > 0 ? 'has-notes' : ''}" onclick="app.showParagraphNoteModal(${index})" title="Add/Edit Notes">📝</button>
                            <button class="control-btn" onclick="app.deleteParagraph(${index})">🗑️</button>
                        </div>
                    </div>
                    <div class="paragraph-content-area" ${isCollapsed ? 'style="display: none;"' : ''}>
                        <input type="text" class="paragraph-heading" placeholder="Heading (optional)" 
                               value="${this.escapeHtml(paragraph.heading || '')}" 
                               onchange="app.updateParagraphHeading(${index}, this.value)"
                               oninput="app.triggerAutoSave(); app.markAsChanged();">
                        <textarea class="paragraph-content" placeholder="Write your paragraph here..." 
                                  spellcheck="false"
                                  onchange="app.updateParagraphContent(${index}, this.value)"
                                  oninput="app.triggerAutoSave(); app.markAsChanged();">${this.escapeHtml(paragraph.content || '')}</textarea>
                    </div>
                </div>
            `;
    }).join('');

    this.initDragAndDrop();
    this.initMobileDragAndDrop();
    this.initAutoResize();
    this.updateShowAllButton();
  }

  addParagraph() {
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

  updateParagraphHeading(index, heading) {
    const story = this.stories[this.currentStoryId];
    story.paragraphs[index].heading = heading;
    story.updatedAt = new Date().toISOString();
    // Only save if auto-save is enabled, otherwise just update in memory
  }

  updateParagraphContent(index, content) {
    const story = this.stories[this.currentStoryId];
    story.paragraphs[index].content = content;
    story.updatedAt = new Date().toISOString();
    // Only save if auto-save is enabled, otherwise just update in memory
  }

  deleteParagraph(index) {
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

  async syncToCloud() {
    // Password verification first
    if (!this.verifyUploadPassword()) {
      return;
    }

    // First confirmation
    const confirmSync = confirm('This will upload your local stories to the cloud. Continue?');
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

      // Compare local vs cloud data
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

      // Proceed with upload
      btn.textContent = '☁️ Uploading...';
      
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

      await setDoc(userDocRef, {
        stories: this.stories,
        lastSync: new Date().toISOString(),
        versions: versions
      });

      this.saveStories(); // Save the updated timestamps locally

      btn.textContent = '✓ Synced to Cloud!';
      btn.style.background = '#4CAF50';
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

  async syncFromCloud() {
    // First confirmation
    const confirmSync = confirm('This will download stories from the cloud. Continue?');
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

      // Compare cloud vs local data
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

      // Proceed with download
      btn.textContent = '📥 Downloading...';
      
      // Update timestamps for all stories being downloaded
      Object.values(cloudStories).forEach(story => {
        story.lastSyncAt = new Date().toISOString();
      });

      this.stories = cloudStories;
      this.saveStories();
      this.renderStoryList();

      btn.textContent = '✓ Synced from Cloud!';
      btn.style.background = '#4CAF50';

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

  verifyUploadPassword() {
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
          previewHTML += '<div class="preview-paragraph">';

          if (paragraph.heading && paragraph.heading.trim()) {
            previewHTML += `<div class="preview-paragraph-heading">${this.escapeHtml(paragraph.heading)}</div>`;
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

      return `
        <div class="story-card" onclick="app.editStory('${id}')">
          <h3>${this.escapeHtml(story.title || 'Untitled Story')}</h3>
          <div class="story-meta">
            ${paragraphCount} paragraph${paragraphCount !== 1 ? 's' : ''} • 
            ${new Date(story.updatedAt || story.createdAt).toLocaleDateString()}
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