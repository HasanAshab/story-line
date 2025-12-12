# Storyline App Features

## 📖 Overview
Storyline is a Progressive Web App (PWA) designed for writers to create, organize, and manage story outlines and drafts. The app works offline and provides a clean, intuitive interface for structured writing.

## 🚀 Core Features

### AI-Powered Writing Assistant
- **Smart Paragraph Completion**: AI-powered paragraph completion using Groq's Llama models
- **Context-Aware Suggestions**: AI considers story title, previous paragraphs, and current content for relevant completions
- **Triple AI Modes**: Choose between Smarter (Llama-3.1-70B), Faster (Llama-3.1-8B-instant), or Custom (choose any available model)
- **Custom Instructions**: Set personalized writing style and tone preferences for AI completions
- **Multiple API Keys**: Load balance across multiple Groq API keys for better rate limiting
- **Dynamic Model Selection**: Fetch and choose from all available Groq models with detailed information
- **Model Information**: View model descriptions, specifications, and capabilities before selection
- **Intelligent Context**: AI receives the last 3 paragraphs plus current paragraph for better story continuity

### Story Management
- **Create New Stories**: Start fresh stories with customizable titles
- **Story List View**: Browse all your stories with previews and metadata
- **Auto-Save**: Optional automatic saving as you type (1-second delay)
- **Manual Save**: Explicit save control for your work
- **Delete Stories**: Remove unwanted stories with confirmation
- **Copy to Clipboard**: Export stories as formatted text

### Paragraph Organization
- **Add Paragraphs**: Create new story sections with headings and content
- **Drag & Drop Reordering**: Rearrange paragraphs via desktop drag-and-drop
- **Mobile Touch Reordering**: Touch-friendly paragraph reordering on mobile devices
- **Collapse/Expand**: Hide or show paragraph content for better organization
- **Bulk Operations**: Expand all or collapse all paragraphs at once
- **Quick Move Controls**: Up/down arrow buttons to move paragraphs to top or bottom of story
- **Limited View Mode**: Show only the last 5 paragraphs by default for better performance on low-end mobile devices
- **Show All Toggle**: Button to reveal all paragraphs when needed, with clear indication of hidden content
- **Jump to Paragraph**: Quickly navigate to any paragraph by number using simple prompt dialog
- **Smart Sticky Navigation**: Context-aware floating buttons that appear only when needed based on scroll position
- **Keyboard Shortcuts**: Ctrl+G (Cmd+G) to jump to paragraph, Home/End keys for top/bottom navigation

### Search & Discovery
- **Story Search**: Find stories by title or content across your entire collection
- **Paragraph Search**: Search within paragraphs of the current story
- **Real-time Filtering**: Instant search results as you type
- **Search Highlighting**: Visual indicators for matching content

### Notes System
- **Story Notes**: Add general notes to entire stories
- **Paragraph Notes**: Attach specific notes to individual paragraphs
- **Note Management**: Add, edit, and delete notes with full CRUD operations
- **Visual Indicators**: Icons show which paragraphs have notes attached

### Preview Mode
- **Reading View**: Clean, formatted preview of your story
- **Typography**: Serif fonts and proper spacing for comfortable reading
- **Structured Display**: Organized presentation with headings and paragraphs

### Progress Tracking
- **Sentence-Level Progress**: Mark individual sentences as completed or pending
- **Visual Progress Indicators**: Click sentences to toggle completion status with visual feedback
- **Progress Statistics**: Real-time progress bar and percentage completion display
- **Progress Button**: Shows current completion percentage in the editor header
- **Persistent Progress**: Progress data is saved locally and syncs with cloud storage
- **Interactive Progress View**: Preview-like mode where sentences can be clicked to mark as done

## ☁️ Cloud Sync Features

### Data Synchronization
- **Upload to Cloud**: Sync local stories to Firebase cloud storage
- **Download from Cloud**: Retrieve stories from cloud to local device
- **Conflict Detection**: Warns about potential data loss before sync operations
- **Password Protection**: Secure uploads with password verification
- **Timestamp Tracking**: Monitors last sync times for each story
- **Progress Sync**: Progress tracking data is included in cloud synchronization
- **AI Settings Sync**: AI preferences and API keys are preserved during cloud sync operations

### Version Management
- **Automatic Versioning**: Keeps last 5 backup versions automatically when uploading
- **Version History**: View all available backup versions with timestamps and statistics
- **Version Preview**: Preview the contents of any backup version before restoring
- **Version Restore**: Restore any backup version with multiple safety confirmations
- **Smart Backup**: Each upload creates a new version while maintaining the 5-version limit

### Sync Safety
- **Data Comparison**: Compares local vs cloud versions before sync
- **Length Validation**: Checks content length differences
- **Date Verification**: Compares modification timestamps
- **User Confirmation**: Multiple confirmation dialogs for destructive operations
- **Version Rollback**: Safe restoration with multiple confirmation steps
- **Backup Protection**: Automatic backup creation before any destructive operation

## 📱 Progressive Web App Features

### Offline Capability
- **Service Worker**: Full offline functionality with caching
- **Local Storage**: All data stored locally in browser
- **Cache Management**: Manual cache clearing and app updates
- **Installable**: Can be installed as a native app on devices
- **Exit Protection**: Game-like warnings when trying to leave the app to prevent data loss
- **PWA Lifecycle Management**: Smart handling of app backgrounding, task switching, and PWA-specific navigation
- **Auto-save on Background**: Automatically saves work when PWA goes to background or loses focus

### Mobile Optimization
- **Responsive Design**: Adapts to all screen sizes
- **Touch Gestures**: Mobile-friendly touch interactions
- **Viewport Optimization**: Proper mobile viewport handling
- **App Manifest**: Native app-like experience when installed
- **Performance Mode**: Limited paragraph view for better performance on low-end devices
- **Smart Loading**: Shows only recent paragraphs by default to reduce memory usage and improve scrolling

## 🎨 User Interface Features

### Modern Design
- **Clean Interface**: Minimalist, distraction-free design
- **Material Design**: Google Material Design principles
- **Smooth Animations**: Subtle transitions and hover effects
- **Color Coding**: Visual hierarchy with consistent color scheme

### Accessibility
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Semantic HTML structure
- **Focus Management**: Proper focus handling throughout the app
- **High Contrast**: Clear visual distinctions

### User Experience
- **Auto-resize Textareas**: Text areas expand as you type
- **Change Detection**: Tracks unsaved changes with visual indicators
- **Loading States**: Visual feedback during operations
- **Error Handling**: Graceful error handling with user feedback
- **Navigation Protection**: Warns users before leaving the app to prevent accidental data loss
- **Browser Back Button**: Smart handling of browser navigation with confirmation dialogs
- **Quick Navigation**: Jump to any paragraph instantly with visual highlighting and smooth scrolling
- **Smart Controls**: Contextual floating buttons that show/hide based on scroll position and user needs
- **Fast Prompts**: Simple prompt dialogs instead of complex modals for speed

## 🔧 Technical Features

### Data Management
- **JSON Storage**: Structured data storage in localStorage
- **Unique IDs**: Timestamp-based unique identifiers for stories
- **Data Validation**: Input validation and sanitization
- **Backup Safety**: Original state tracking for change detection

### Performance
- **Lazy Loading**: Efficient rendering of large story lists
- **Debounced Search**: Optimized search with input debouncing
- **Memory Management**: Efficient DOM manipulation and cleanup
- **Caching Strategy**: Smart caching for offline performance

### Security
- **XSS Protection**: HTML escaping for user content
- **Password Hashing**: Secure password handling for cloud sync
- **Input Sanitization**: Safe handling of user input
- **HTTPS Ready**: Secure connection support

## 📊 Story Statistics

### Metadata Tracking
- **Creation Dates**: Track when stories were created
- **Last Modified**: Monitor when stories were last updated
- **Sync Status**: Track cloud synchronization status
- **Content Length**: Monitor story and paragraph lengths

### Organization
- **Auto-generated Headings**: Automatic paragraph titles from content
- **Story Previews**: Quick content previews in story list
- **Empty State Handling**: Helpful messages for empty content
- **Structured Export**: Formatted text export with proper headings

## 🔄 Import/Export

### Export Options
- **Clipboard Copy**: Copy formatted stories to clipboard
- **Text Format**: Export with proper markdown-style formatting
- **Hierarchical Structure**: Maintains heading hierarchy in exports

### Data Portability
- **JSON Format**: Stories stored in portable JSON format
- **Cross-device Sync**: Move stories between devices via cloud sync
- **Backup Friendly**: Easy to backup and restore story data