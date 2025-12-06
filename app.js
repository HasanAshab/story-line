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
    this.loadInitialAutoSavePreference();
    this.init();
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

    // Sync actions
    document.getElementById('syncToCloudBtn').addEventListener('click', () => this.syncToCloud());
    document.getElementById('syncFromCloudBtn').addEventListener('click', () => this.syncFromCloud());

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
    document.getElementById('paragraphSearchInput').addEventListener('input', (e) => this.handleParagraphSearch(e.target.value));
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
  }

  loadStories() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {};
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
    this.showView('storyListView');
    this.renderStoryList();
  }

  showStoryEditor(storyId = null) {
    this.currentStoryId = storyId;
    this.showView('storyEditorView');
    this.renderStoryEditor();
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
    this.stories[id] = {
      id,
      title: '',
      paragraphs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
    
    // Save original state for change detection
    this.originalStoryState = JSON.parse(JSON.stringify(story));
    this.hasUnsavedChanges = false;
    
    this.loadAutoSavePreference();
    this.setupAutoSaveListeners();
    this.setupChangeDetection();
    this.renderParagraphs();
  }

  renderParagraphs() {
    const story = this.stories[this.currentStoryId];
    const container = document.getElementById('paragraphsList');

    if (!story.paragraphs || story.paragraphs.length === 0) {
      container.innerHTML = '<p class="empty-state">No paragraphs yet. Add your first paragraph!</p>';
      return;
    }

    container.innerHTML = story.paragraphs.map((paragraph, index) => {
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
                            <button class="control-btn" onclick="app.moveParagraph(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                            <button class="control-btn" onclick="app.moveParagraph(${index}, 1)" ${index === story.paragraphs.length - 1 ? 'disabled' : ''}>↓</button>
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
  }

  addParagraph() {
    const story = this.stories[this.currentStoryId];
    if (!story.paragraphs) story.paragraphs = [];

    story.paragraphs.push({
      heading: '',
      content: '',
      collapsed: false
    });

    story.updatedAt = new Date().toISOString();
    this.triggerAutoSave();
    this.renderParagraphs();
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
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= story.paragraphs.length) return;

    const temp = story.paragraphs[index];
    story.paragraphs[index] = story.paragraphs[newIndex];
    story.paragraphs[newIndex] = temp;

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
    const headingInputs = document.querySelectorAll('.paragraph-heading');
    const contentInputs = document.querySelectorAll('.paragraph-content');

    headingInputs.forEach((input, index) => {
      if (story.paragraphs[index]) {
        story.paragraphs[index].heading = input.value;
      }
    });

    contentInputs.forEach((input, index) => {
      if (story.paragraphs[index]) {
        story.paragraphs[index].content = input.value;
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

  async syncToCloud() {
    // Ask for confirmation before syncing
    const confirmSync = confirm('This will upload all your local stories to the cloud and overwrite any existing cloud data. Continue?');
    if (!confirmSync) {
      return;
    }

    try {
      const btn = document.getElementById('syncToCloudBtn');
      const originalText = btn.textContent;
      btn.textContent = '☁️ Syncing...';
      btn.disabled = true;

      // Wait for Firebase to be available
      if (!window.db) {
        throw new Error('Firebase not initialized');
      }

      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

      // Use a fixed document ID for the user's data
      const userDocRef = doc(window.db, 'storylines', 'user_data');

      await setDoc(userDocRef, {
        stories: this.stories,
        lastSync: new Date().toISOString()
      });

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
    try {
      const btn = document.getElementById('syncFromCloudBtn');
      const originalText = btn.textContent;
      btn.textContent = '📥 Syncing...';
      btn.disabled = true;

      // Wait for Firebase to be available
      if (!window.db) {
        throw new Error('Firebase not initialized');
      }

      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

      // Use a fixed document ID for the user's data
      const userDocRef = doc(window.db, 'storylines', 'user_data');
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.stories) {
          // Confirm before overwriting local data
          const confirmSync = confirm('This will replace all local stories with cloud data. Continue?');
          if (confirmSync) {
            this.stories = data.stories;
            this.saveStories();
            this.renderStoryList();

            btn.textContent = '✓ Synced from Cloud!';
            btn.style.background = '#4CAF50';
          } else {
            btn.textContent = originalText;
            btn.disabled = false;
            return;
          }
        } else {
          throw new Error('No story data found in cloud');
        }
      } else {
        throw new Error('No cloud data found');
      }

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
    const headingInputs = document.querySelectorAll('.paragraph-heading');
    const contentInputs = document.querySelectorAll('.paragraph-content');

    headingInputs.forEach((input, index) => {
      if (story.paragraphs[index]) {
        story.paragraphs[index].heading = input.value;
      }
    });

    contentInputs.forEach((input, index) => {
      if (story.paragraphs[index]) {
        story.paragraphs[index].content = input.value;
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
    const previewBtn = document.getElementById('previewBtn');
    const editBtn = document.getElementById('editBtn');
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
    previewBtn.style.display = 'none';
    editBtn.style.display = 'inline-block';
  }

  showEdit() {
    const editMode = document.getElementById('editMode');
    const previewMode = document.getElementById('previewMode');
    const previewBtn = document.getElementById('previewBtn');
    const editBtn = document.getElementById('editBtn');

    // Switch to edit mode
    editMode.style.display = 'block';
    previewMode.style.display = 'none';
    previewBtn.style.display = 'inline-block';
    editBtn.style.display = 'none';
  }

  updateStoryFromForm() {
    const story = this.stories[this.currentStoryId];
    const title = document.getElementById('storyTitle').value.trim();

    // Update title
    story.title = title || 'Untitled Story';

    // Update paragraph content from current form state
    const headingInputs = document.querySelectorAll('.paragraph-heading');
    const contentInputs = document.querySelectorAll('.paragraph-content');

    headingInputs.forEach((input, index) => {
      if (story.paragraphs[index]) {
        story.paragraphs[index].heading = input.value;
      }
    });

    contentInputs.forEach((input, index) => {
      if (story.paragraphs[index]) {
        story.paragraphs[index].content = input.value;
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