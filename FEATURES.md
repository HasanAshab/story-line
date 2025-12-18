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
- **API Key Management**: Copy API keys to clipboard with one click for easy sharing or backup
- **Dynamic Model Selection**: Fetch and choose from all available Groq models with detailed information
- **Model Information**: View model descriptions, specifications, and capabilities before selection
- **Intelligent Context**: AI receives the last 3 paragraphs plus current paragraph for better story continuity

### Story Management
- **Create New Stories**: Start fresh stories with customizable titles
- **Story List View**: Browse all your stories with previews and metadata
- **Alphabetical Sorting**: Stories automatically sorted by title in ascending alphabetical order
- **Duplicate Stories**: Create exact copies of existing stories with "_duplicate" suffix
- **Complete Duplication**: Copies all paragraphs, notes, headings, and settings
- **Independent Copies**: Duplicated stories are completely separate from originals
- **Read-Only Mode**: Mark stories as read-only to prevent accidental editing
- **Local Read-Only Storage**: Read-only status stored locally, not synced to cloud
- **Preview-Only Access**: Read-only stories automatically open in preview mode
- **Auto-Save**: Optional automatic saving as you type (1-second delay)
- **Manual Save**: Explicit save control for your work
- **Delete Stories**: Remove unwanted stories with confirmation
- **Advanced Copy Options**: Multiple copy formats and ranges (all, top/bottom N, custom range, headings only)
- **Flexible Export**: Copy paragraphs with or without content, numbered and formatted
- **Text File Export**: Download complete stories as formatted text files to device
- **Structured Export Format**: Includes title, dates, numbered paragraphs, headings, and notes
- **Smart Filename Generation**: Auto-generates filenames with story title and date

### Paragraph Organization
- **Add Paragraphs**: Create new story sections with headings and content
- **Insert Paragraphs**: Add new paragraphs anywhere in your story using dropdown menu
- **Contextual Addition**: Insert paragraphs right after the current one for better workflow
- **Drag Handle Reordering**: Rearrange paragraphs by dragging the ⋮⋮ handle icon only
- **Precise Drag Control**: Prevents accidental dragging when scrolling or selecting text
- **Mobile Touch Reordering**: Touch-friendly paragraph reordering using drag handles on mobile devices
- **Collapse/Expand**: Hide or show paragraph content for better organization
- **Bulk Operations**: Expand all or collapse all paragraphs at once
- **Clean Interface**: Minimal 3-dot dropdown menu for paragraph actions to reduce visual clutter
- **Dropdown Actions**: Add paragraph, move to top/bottom, AI completion, notes, and delete all in organized menu
- **Focus on Writing**: Cleaner paragraph interface with fewer visible buttons for better writing focus
- **Limited View Mode**: Show only the last 5 paragraphs by default for better performance on low-end mobile devices
- **Show All Toggle**: Button to reveal all paragraphs when needed, with clear indication of hidden content
- **Jump to Paragraph**: Quickly navigate to any paragraph by number using simple prompt dialog
- **Anchor System**: Set one paragraph per story as an anchor for quick navigation
- **Anchor Navigation**: Jump to anchored paragraph using "$" character in jump dialog
- **Visual Anchor Indicators**: Anchored paragraphs display ⚓ icon for easy identification
- **Universal Navigation**: Jump functionality works in both edit and preview modes
- **Smart Sticky Navigation**: Context-aware floating buttons that appear only when needed based on scroll position
- **Cross-Mode Navigation**: Top/bottom navigation works seamlessly across edit and preview modes
- **Read-Only Compatible**: Navigation functions work correctly in read-only stories opened in preview mode
- **Keyboard Shortcuts**: Ctrl+G (Cmd+G) to jump to paragraph, Home/End keys for top/bottom navigation

### Search & Discovery
- **Story Search**: Find stories by title or content across your entire collection
- **Paragraph Search**: Search within paragraphs of the current story
- **Real-time Filtering**: Instant search results as you type
- **Search Highlighting**: Visual indicators for matching content
- **Sorted Results**: Search results automatically sorted alphabetically by story title

### Notes System
- **Story Notes**: Add general notes to entire stories
- **Paragraph Notes**: Attach specific notes to individual paragraphs
- **Note Management**: Add, edit, and delete notes with full CRUD operations
- **Visual Indicators**: Icons show which paragraphs have notes attached
- **Jump to Paragraph**: Click "Jump" button in notes modal to instantly navigate to any paragraph
- **Cross-Modal Navigation**: Seamlessly jump from notes view to specific paragraphs in the editor
- **Smart Note Headers**: Each note shows paragraph number and heading with convenient jump access
- **Mobile-Friendly Jumps**: Jump buttons work perfectly on mobile with responsive design

### Preview Mode
- **Reading View**: Clean, formatted preview of your story
- **Typography**: Serif fonts and proper spacing for comfortable reading
- **Structured Display**: Organized presentation with headings and paragraphs
- **Paragraph Numbers**: Numbered headings for easy navigation and reference
- **Preview Search**: Search within preview mode to find specific content
- **Search Filtering**: Shows only paragraphs that match your search query
- **Text Highlighting**: Exact search matches highlighted with yellow background
- **Real-time Search**: Instant filtering and highlighting as you type
- **Search Clearing**: Easy clear button to reset search and show all content
- **Jump Navigation**: Full jump-to-paragraph functionality works in preview mode
- **Sticky Navigation**: Jump to top/bottom buttons work seamlessly in preview
- **Visual Highlighting**: Smooth highlighting and animation when jumping to paragraphs
- **Auto-Generated Headings**: Shows paragraph numbers even for paragraphs without custom headings

### Progress Tracking
- **Sentence-Level Progress**: Mark individual sentences as completed or pending
- **Visual Progress Indicators**: Click sentences to toggle completion status with visual feedback
- **Progress Statistics**: Real-time progress bar and percentage completion display
- **Progress Button**: Shows current completion percentage in the editor header
- **Persistent Progress**: Progress data is saved locally and syncs with cloud storage
- **Interactive Progress View**: Preview-like mode where sentences can be clicked to mark as done

## ☁️ Cloud Sync Features

### Data Synchronization
- **Dual Sync Modes**: Choose between Replace mode (overwrite) or Merge mode (keep latest versions)
- **Smart Merging**: Automatically keeps the most recent version of each story when merging
- **Team Collaboration**: Merge mode enables multiple users to work on different stories simultaneously
- **Upload to Cloud**: Sync local stories to Firebase cloud storage with mode selection
- **Download from Cloud**: Retrieve stories from cloud to local device with merge options
- **Full Merge Button**: One-click operation that downloads and uploads in merge mode for streamlined workflow
- **Conflict Detection**: Warns about potential data loss before sync operations
- **Password Protection**: Secure uploads with password verification
- **Password Memory**: Upload password stored locally for convenience, re-prompted if incorrect
- **Timestamp Tracking**: Monitors last sync times for each story and uses them for merge decisions
- **Progress Sync**: Progress tracking data is included in cloud synchronization
- **AI Settings Sync**: AI preferences and API keys are preserved during cloud sync operations

### Version Management
- **Automatic Versioning**: Keeps last 5 backup versions automatically when uploading
- **Manual Backups**: Create unlimited named backups stored locally with custom names or timestamps
- **Dual Backup System**: Separate tabs for automatic cloud backups and manual local backups
- **Version History**: View all available backup versions with timestamps and statistics
- **Version Preview**: Preview the contents of any backup version before restoring
- **Version Restore**: Restore any backup version with multiple safety confirmations
- **Smart Backup**: Each upload creates a new version while maintaining the 5-version limit
- **Manual Backup Management**: Create, preview, restore, and delete manual backups with full control
- **Unlimited Manual Storage**: No limit on the number of manual backups you can create
- **Auto-Refresh**: Versions list automatically refreshes after cloud uploads
- **Manual Refresh**: Refresh button to manually update the versions list anytime
- **Instant Updates**: New versions appear immediately after successful cloud sync

### Dark Theme System
- **Complete Dark Mode**: Comprehensive dark theme covering all UI elements
- **Eye-Friendly Colors**: Carefully chosen dark colors to reduce eye strain during long writing sessions
- **Smart Contrast**: Optimized text contrast for excellent readability in dark mode
- **Consistent Theming**: All components (modals, dropdowns, forms) follow the dark theme
- **Theme Toggle**: Convenient moon/sun icon in header for instant theme switching
- **Local Persistence**: Theme preference stored in device metadata, not synced to cloud
- **Smooth Transitions**: Seamless switching between light and dark modes
- **Mobile Optimized**: Dark theme works perfectly on all screen sizes and devices

### Read-Only Story Protection
- **Toggle Protection**: One-click toggle to make stories read-only from the story list
- **Visual Indicators**: Lock icons and muted colors clearly show read-only status
- **Complete Edit Prevention**: All editing functions disabled for read-only stories
- **Preview Mode Access**: Read-only stories automatically open in preview mode
- **Local Storage Only**: Read-only status stored locally, not synced to cloud for device-specific control
- **Form Disabling**: All input fields, buttons, and editing controls disabled when read-only
- **Safe Sharing**: Perfect for protecting reference stories or completed drafts
- **Easy Toggle**: Quick unlock/lock with visual feedback and confirmation

### One-Click Full Merge
- **Streamlined Workflow**: Single button combines download and upload operations in merge mode
- **Automatic Sequencing**: Downloads from cloud first, then uploads the merged result back
- **Password Protection**: Requires upload password verification for security
- **Progress Feedback**: Clear visual feedback showing download and upload phases
- **Error Handling**: Graceful error handling with detailed feedback if operations fail
- **Version Creation**: Automatically creates new backup versions during the merge process
- **Conflict Resolution**: Uses smart merging to keep the latest version of each story
- **Time Saving**: Eliminates the need to manually perform download then upload operations

### Manual Backup System
- **Dual Storage Options**: Choose between Local (device-only) and Cloud (Firebase) manual backups
- **Nested Tab Interface**: Local and Cloud tabs within Manual Backups for organized access
- **Custom Naming**: Give your backups meaningful names or use automatic timestamps
- **Unlimited Local Backups**: Create unlimited backups stored locally in your browser
- **Cloud Manual Backups**: Store manual backups in Firebase with password protection
- **Independent Management**: Create, preview, restore, and delete backups independently for each type
- **Safety Confirmations**: Multiple confirmation dialogs prevent accidental data loss
- **Instant Local Creation**: Create local backups instantly without network requirements
- **Secure Cloud Creation**: Cloud backups require upload password for security
- **Detailed Previews**: Preview backup contents before restoration with story counts and metadata
- **Cross-Platform Cloud Access**: Cloud manual backups accessible from any device with your credentials

### Smart Password Management
- **Password Storage**: Upload password stored locally in device metadata for convenience
- **Automatic Retry**: Stored password tried first, prompts only if incorrect or missing
- **Security Validation**: Incorrect stored passwords automatically cleared and re-prompted
- **Seamless Experience**: Enter password once, reuse automatically until it changes
- **Local Only**: Password stored locally, never synced to cloud for security
- **Smart Prompting**: Only asks for password when needed, not on every upload

### Sync Safety
- **Mode Selection**: Clear dropdown menus to choose sync behavior before operation
- **Story Count Protection**: Warns when Replace mode would delete stories due to count differences
- **Smart Warnings**: No data loss warnings in Merge mode (since it preserves all data)
- **Data Comparison**: Compares local vs cloud versions before sync in Replace mode
- **Length Validation**: Checks content length differences for potential data loss
- **Date Verification**: Compares modification timestamps for merge decisions
- **User Confirmation**: Multiple confirmation dialogs for destructive operations
- **Version Rollback**: Safe restoration with multiple confirmation steps
- **Backup Protection**: Automatic backup creation before any destructive operation
- **Merge Intelligence**: Automatically resolves conflicts by keeping the most recently updated version

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
- **Dark Theme**: Complete dark mode with eye-friendly colors for low-light writing
- **Theme Toggle**: One-click switching between light and dark themes
- **Persistent Preference**: Theme choice saved locally and remembered across sessions

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
- **Clean Interface**: Advanced tools organized in dropdown menu to reduce visual clutter
- **Advanced Toolbox**: Comprehensive dropdown menu with organized sections for secondary features
- **Distraction-Free Writing**: Minimal paragraph controls with 3-dot menus keep focus on content
- **Organized Actions**: All paragraph actions neatly organized in contextual dropdown menus

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