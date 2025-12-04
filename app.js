class StorylineApp {
  constructor() {
    this.storageKey = 'storyline_app';
    this.stories = this.loadStories();
    this.currentStoryId = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.renderStoryList();
  }

  bindEvents() {
    // Navigation
    document.getElementById('newStoryBtn').addEventListener('click', () => this.createNewStory());
    document.getElementById('backBtn').addEventListener('click', () => this.showStoryList());

    // Story actions
    document.getElementById('saveStoryBtn').addEventListener('click', () => this.saveCurrentStory());
    document.getElementById('deleteStoryBtn').addEventListener('click', () => this.deleteCurrentStory());
    document.getElementById('copyStoryBtn').addEventListener('click', () => this.copyStoryToClipboard());

    // Paragraph actions
    document.getElementById('addParagraphBtn').addEventListener('click', () => this.addParagraph());
    document.getElementById('expandAllBtn').addEventListener('click', () => this.expandAllParagraphs());
    document.getElementById('collapseAllBtn').addEventListener('click', () => this.collapseAllParagraphs());

    // Sync actions
    document.getElementById('syncToCloudBtn').addEventListener('click', () => this.syncToCloud());
    document.getElementById('syncFromCloudBtn').addEventListener('click', () => this.syncFromCloud());
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

    container.innerHTML = storyIds.map(id => {
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
                            <button class="control-btn" onclick="app.moveParagraph(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                            <button class="control-btn" onclick="app.moveParagraph(${index}, 1)" ${index === story.paragraphs.length - 1 ? 'disabled' : ''}>↓</button>
                            <button class="control-btn" onclick="app.deleteParagraph(${index})">🗑️</button>
                        </div>
                    </div>
                    <div class="paragraph-content-area" ${isCollapsed ? 'style="display: none;"' : ''}>
                        <input type="text" class="paragraph-heading" placeholder="Heading (optional)" 
                               value="${this.escapeHtml(paragraph.heading || '')}" 
                               onchange="app.updateParagraphHeading(${index}, this.value)">
                        <textarea class="paragraph-content" placeholder="Write your paragraph here..." 
                                  onchange="app.updateParagraphContent(${index}, this.value)">${this.escapeHtml(paragraph.content || '')}</textarea>
                    </div>
                </div>
            `;
    }).join('');

    this.initDragAndDrop();
  }

  addParagraph() {
    const story = this.stories[this.currentStoryId];
    if (!story.paragraphs) story.paragraphs = [];

    story.paragraphs.push({
      heading: '',
      content: '',
      collapsed: false
    });

    this.saveStories();
    this.renderParagraphs();
  }

  updateParagraphHeading(index, heading) {
    const story = this.stories[this.currentStoryId];
    story.paragraphs[index].heading = heading;
    story.updatedAt = new Date().toISOString();
    this.saveStories();
  }

  updateParagraphContent(index, content) {
    const story = this.stories[this.currentStoryId];
    story.paragraphs[index].content = content;
    story.updatedAt = new Date().toISOString();
    this.saveStories();
  }

  deleteParagraph(index) {
    if (confirm('Delete this paragraph?')) {
      const story = this.stories[this.currentStoryId];
      story.paragraphs.splice(index, 1);
      story.updatedAt = new Date().toISOString();
      this.saveStories();
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
    this.saveStories();
    this.renderParagraphs();
  }

  saveCurrentStory() {
    const story = this.stories[this.currentStoryId];
    const title = document.getElementById('storyTitle').value.trim();

    story.title = title || 'Untitled Story';
    story.updatedAt = new Date().toISOString();
    this.saveStories();

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
    const story = this.stories[this.currentStoryId];
    const paragraph = story.paragraphs.splice(fromIndex, 1)[0];
    story.paragraphs.splice(toIndex, 0, paragraph);

    story.updatedAt = new Date().toISOString();
    this.saveStories();
    this.renderParagraphs();
  }

  getAutoHeading(content) {
    if (!content || !content.trim()) return 'Empty paragraph';
    const words = content.trim().split(' ').slice(0, 3);
    return words.join(' ') + (content.trim().split(' ').length > 3 ? '...' : '');
  }

  toggleParagraph(index) {
    const story = this.stories[this.currentStoryId];
    story.paragraphs[index].collapsed = !story.paragraphs[index].collapsed;
    story.updatedAt = new Date().toISOString();
    this.saveStories();
    this.renderParagraphs();
  }

  expandAllParagraphs() {
    const story = this.stories[this.currentStoryId];
    story.paragraphs.forEach(paragraph => {
      paragraph.collapsed = false;
    });
    story.updatedAt = new Date().toISOString();
    this.saveStories();
    this.renderParagraphs();
  }

  collapseAllParagraphs() {
    const story = this.stories[this.currentStoryId];
    story.paragraphs.forEach(paragraph => {
      paragraph.collapsed = true;
    });
    story.updatedAt = new Date().toISOString();
    this.saveStories();
    this.renderParagraphs();
  }

  async syncToCloud() {
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

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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