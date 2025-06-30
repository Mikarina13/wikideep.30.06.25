import { initMenu } from './src/utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './src/utils/activityTracker.js';
import { restrictAllDateInputs } from './src/utils/dateRestriction.js';
import supabase from './src/utils/supabaseClient.js';

// Whitelist of allowed domains for URL sharing
const ALLOWED_DOMAINS = [
  // OpenAI ChatGPT
  'chat.openai.com',
  'chatgpt.com',
  
  // Anthropic Claude
  'claude.ai',
  'chat.claude.ai',
  
  // xAI Grok
  'x.ai',
  'grok.x.ai',
  
  // Google Services
  'docs.google.com',
  'drive.google.com',
  'sheets.google.com',
  'slides.google.com',
  'forms.google.com',
  
  // Additional trusted platforms
  'github.com',
  'gist.github.com'
];

let currentUser = null;
let currentTab = 'archive';
let archiveTags = [];
let collabTags = [];

// Form data cache keys
const ARCHIVE_FORM_CACHE = 'wikideep_archive_form_cache';
const COLLAB_FORM_CACHE = 'wikideep_collab_form_cache';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the menu
  initMenu();
  
  // Record page visit
  recordPageVisit({
    type: getPageTypeFromUrl(window.location.href),
    title: getPageTitle(),
    url: window.location.href
  });
  
  // Restrict date inputs to today or earlier
  restrictAllDateInputs();
  
  // Check authentication status
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;

  // Check URL parameters for specific tab
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  const type = urlParams.get('type');
  
  // Handle direct tab selection
  if (tab && (tab === 'archive' || tab === 'collab')) {
    switchTab(tab);
  } else if (type) {
    // Handle legacy type parameter
    if (type === 'archive' || type === 'collab') {
      switchTab(type);
    }
  }

  // Setup event listeners
  setupEventListeners();
  
  // Initialize form states
  initializeFormStates();
  
  // Restore form data from cache if available
  restoreFormData();
  
  // Force style application for production
  forceStyleApplying();
});

function forceStyleApplying() {
  console.log("Forcing style application");
  
  // Force tab styling
  const archiveTab = document.getElementById('archive-tab');
  const collabTab = document.getElementById('collab-tab');
  
  // Add inline styles with !important to ensure they take precedence
  if (archiveTab) {
    if (archiveTab.classList.contains('active')) {
      archiveTab.style.backgroundColor = '#fac637';
      archiveTab.style.color = '#07717c';
      archiveTab.style.fontWeight = '600';
    } else {
      archiveTab.style.backgroundColor = 'transparent';
    }
  }
  
  if (collabTab) {
    if (collabTab.classList.contains('active')) {
      collabTab.style.backgroundColor = '#fac637';
      collabTab.style.color = '#07717c';
      collabTab.style.fontWeight = '600';
    } else {
      collabTab.style.backgroundColor = 'transparent';
    }
  }
  
  // Force choice button styling too
  const choiceButtons = document.querySelectorAll('.choice-button');
  choiceButtons.forEach(button => {
    if (button.classList.contains('active')) {
      button.style.backgroundColor = '#fac637';
      button.style.color = '#07717c';
      button.style.fontWeight = '600';
    } else {
      button.style.backgroundColor = 'transparent';
    }
  });
}

function setupEventListeners() {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      switchTab(tab);
      
      // Force style applying after tab switch
      setTimeout(forceStyleApplying, 10);
    });
  });

  // Content choice switching (archive form)
  const choiceButtons = document.querySelectorAll('.choice-button');
  choiceButtons.forEach(button => {
    button.addEventListener('click', () => {
      const choice = button.dataset.choice;
      switchContentChoice(choice);
      
      // Force style applying after choice switch
      setTimeout(forceStyleApplying, 10);
    });
  });

  // Form submissions
  const archiveForm = document.getElementById('archive-form');
  const collabForm = document.getElementById('collab-form');
  
  if (archiveForm) {
    archiveForm.addEventListener('submit', handleArchiveSubmission);
  }
  
  if (collabForm) {
    collabForm.addEventListener('submit', handleCollabSubmission);
  }

  // Tag management
  setupTagManagement('archive');
  setupTagManagement('collab');

  // Privacy option selection
  setupPrivacyOptions();

  // Close button
  const closeBtn = document.getElementById('publish-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.history.back();
    });
  }

  // Real-time validation
  setupRealTimeValidation();
}

function switchTab(tabName) {
  currentTab = tabName;
  
  // Update tab buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    if (button.dataset.tab === tabName) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });

  // Update forms
  const forms = document.querySelectorAll('.publish-form');
  forms.forEach(form => {
    if (form.id === `${tabName}-form`) {
      form.classList.add('active');
    } else {
      form.classList.remove('active');
    }
  });

  // Update title
  const titleElement = document.getElementById('publish-title');
  if (titleElement) {
    titleElement.textContent = tabName === 'archive' ? 'Publish AI Content' : 'Post Collaboration';
  }

  // Check if only one tab should be shown
  const container = document.getElementById('publish-container');
  if (container) {
    const tabs = document.getElementById('publish-tabs');
    if (tabs && tabs.children.length <= 1) {
      container.classList.add('tabs-hidden');
    }
  }
  
  // Force styles for production compatibility
  forceStyleApplying();
}

function switchContentChoice(choice) {
  // Update choice buttons
  const choiceButtons = document.querySelectorAll('.choice-button');
  choiceButtons.forEach(button => {
    if (button.dataset.choice === choice) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });

  // Update content sections
  const contentSections = document.querySelectorAll('.content-section');
  contentSections.forEach(section => {
    if (section.id === `${choice}-content`) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  // Update required fields
  updateRequiredFields(choice);
  
  // Force styles for production compatibility
  forceStyleApplying();
}

function updateRequiredFields(choice) {
  const contentTextarea = document.getElementById('archive-content');
  const embedUrlInput = document.getElementById('archive-embed-url');

  if (choice === 'paste') {
    if (contentTextarea) {
      contentTextarea.required = true;
    }
    if (embedUrlInput) {
      embedUrlInput.required = false;
    }
  } else if (choice === 'link') {
    if (contentTextarea) {
      contentTextarea.required = false;
    }
    if (embedUrlInput) {
      embedUrlInput.required = true;
    }
  }
}

function setupTagManagement(formType) {
  const tagInput = document.getElementById(`${formType}-tag-input`);
  const addTagBtn = document.getElementById(`${formType}-add-tag`);
  
  if (tagInput && addTagBtn) {
    addTagBtn.addEventListener('click', () => addTag(formType));
    tagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag(formType);
      }
    });
    
    tagInput.addEventListener('input', () => {
      clearTagError(formType);
    });
  }
}

function addTag(formType) {
  const input = document.getElementById(`${formType}-tag-input`);
  const errorElement = document.getElementById(`${formType}-tag-error`);
  
  if (!input) return;
  
  const tagText = input.value.trim().toLowerCase();
  const tags = formType === 'archive' ? archiveTags : collabTags;
  
  // Clear previous error
  clearTagError(formType);
  
  // Validation
  if (!tagText) {
    showTagError(formType, 'Please enter a tag');
    return;
  }
  
  if (tagText.length > 20) {
    showTagError(formType, 'Tag must be 20 characters or less');
    return;
  }
  
  if (!/^[a-zA-Z0-9\s-]+$/.test(tagText)) {
    showTagError(formType, 'Tag can only contain letters, numbers, spaces, and hyphens');
    return;
  }
  
  if (tags.includes(tagText)) {
    showTagError(formType, 'Tag already added');
    return;
  }
  
  if (tags.length >= 5) {
    showTagError(formType, 'Maximum 5 tags allowed');
    return;
  }
  
  // Add tag
  if (formType === 'archive') {
    archiveTags.push(tagText);
  } else {
    collabTags.push(tagText);
  }
  
  input.value = '';
  updateTagsDisplay(formType);
  updateSubmitButtonState(formType);
}

function removeTag(formType, tag) {
  const tags = formType === 'archive' ? archiveTags : collabTags;
  const index = tags.indexOf(tag);
  
  if (index > -1) {
    if (formType === 'archive') {
      archiveTags.splice(index, 1);
    } else {
      collabTags.splice(index, 1);
    }
    updateTagsDisplay(formType);
    updateSubmitButtonState(formType);
  }
}

// Make removeTag globally available
window.removeTag = removeTag;

function updateTagsDisplay(formType) {
  const display = document.getElementById(`${formType}-tags-display`);
  const count = document.getElementById(`${formType}-tag-count`);
  const warning = document.getElementById(`${formType}-tags-warning`);
  
  if (!display) return;
  
  const tags = formType === 'archive' ? archiveTags : collabTags;
  
  if (tags.length === 0) {
    display.className = 'tags-display empty';
    display.textContent = `Add at least one tag to categorize your ${formType === 'archive' ? 'content' : 'collaboration'} before publishing.`;
    
    if (warning) {
      warning.classList.add('visible');
    }
  } else {
    display.className = 'tags-display';
    display.innerHTML = tags.map(tag => `
      <div class="tag-item">
        ${tag}
        <button type="button" class="tag-remove" onclick="removeTag('${formType}', '${tag}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `).join('');
    
    if (warning) {
      warning.classList.remove('visible');
    }
  }
  
  if (count) {
    count.textContent = `${tags.length} tags added`;
  }
}

function showTagError(formType, message) {
  const errorElement = document.getElementById(`${formType}-tag-error`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('visible');
  }
}

function clearTagError(formType) {
  const errorElement = document.getElementById(`${formType}-tag-error`);
  if (errorElement) {
    errorElement.classList.remove('visible');
    errorElement.textContent = '';
  }
}

function setupPrivacyOptions() {
  const privacyOptions = document.querySelectorAll('.privacy-option');
  const promptTextarea = document.getElementById('archive-prompt');
  const promptGroup = promptTextarea ? promptTextarea.closest('.form-group') : null;
  
  if (!promptTextarea || !promptGroup) return;
  
  // Add disabled style and no-entry cursor to textarea when private
  const style = document.createElement('style');
  style.textContent = `
    .prompt-disabled {
      position: relative;
      opacity: 0.7;
      pointer-events: none;
    }
    
    .prompt-disabled::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.5);
      z-index: 5;
    }
    
    .prompt-disabled::after {
      content: '🚫';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24px;
      z-index: 10;
    }
    
    .prompt-textarea-container {
      position: relative;
    }
    
    .prompt-textarea-container:hover::after {
      content: '⛔ Prompt editing disabled when private';
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(220, 53, 69, 0.9);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 100;
    }
  `;
  document.head.appendChild(style);
  
  // Wrap the textarea in a container for hover effects
  const container = document.createElement('div');
  container.className = 'prompt-textarea-container';
  promptTextarea.parentNode.insertBefore(container, promptTextarea);
  container.appendChild(promptTextarea);
  
  privacyOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all options
      privacyOptions.forEach(opt => opt.classList.remove('selected'));
      // Add selected class to clicked option
      option.classList.add('selected');
      
      // Check the radio button
      const radio = option.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        
        // Handle prompt field based on privacy choice
        const isPrivate = radio.value === 'private';
        handlePromptPrivacy(isPrivate, container, promptTextarea);
      }
    });
    
    // Also handle change on the radio button directly
    const radio = option.querySelector('input[type="radio"]');
    if (radio) {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          const isPrivate = radio.value === 'private';
          handlePromptPrivacy(isPrivate, container, promptTextarea);
        }
      });
    }
  });
  
  // Initial state check
  const privateRadio = document.querySelector('input[name="prompt-privacy"][value="private"]');
  if (privateRadio && privateRadio.checked) {
    handlePromptPrivacy(true, container, promptTextarea);
  }
}

function handlePromptPrivacy(isPrivate, container, textarea) {
  if (isPrivate) {
    // Disable prompt editing
    container.classList.add('prompt-disabled');
    textarea.setAttribute('readonly', 'readonly');
    
    // Save current prompt value before disabling
    if (!textarea.dataset.savedValue) {
      textarea.dataset.savedValue = textarea.value;
    }
  } else {
    // Re-enable prompt editing
    container.classList.remove('prompt-disabled');
    textarea.removeAttribute('readonly');
    
    // Restore saved value if exists
    if (textarea.dataset.savedValue) {
      textarea.value = textarea.dataset.savedValue;
      delete textarea.dataset.savedValue;
    }
  }
}

function setupRealTimeValidation() {
  // Archive form validation
  const archiveTitle = document.getElementById('archive-title');
  const archiveModel = document.getElementById('archive-model');
  const archivePrompt = document.getElementById('archive-prompt');
  
  if (archiveTitle) {
    archiveTitle.addEventListener('input', () => updateSubmitButtonState('archive'));
  }
  if (archiveModel) {
    archiveModel.addEventListener('change', () => updateSubmitButtonState('archive'));
  }
  if (archivePrompt) {
    archivePrompt.addEventListener('input', () => updateSubmitButtonState('archive'));
  }
  
  // Content fields
  const archiveContent = document.getElementById('archive-content');
  const archiveEmbedUrl = document.getElementById('archive-embed-url');
  
  if (archiveContent) {
    archiveContent.addEventListener('input', () => updateSubmitButtonState('archive'));
  }
  if (archiveEmbedUrl) {
    archiveEmbedUrl.addEventListener('input', () => {
      updateSubmitButtonState('archive');
      validateUrl();
    });
  }
  
  // Collab form validation
  const collabType = document.getElementById('collab-type');
  const collabTitle = document.getElementById('collab-title');
  const collabDescription = document.getElementById('collab-description');
  const collabContact = document.getElementById('collab-contact');
  
  if (collabType) {
    collabType.addEventListener('change', () => updateSubmitButtonState('collab'));
  }
  if (collabTitle) {
    collabTitle.addEventListener('input', () => updateSubmitButtonState('collab'));
  }
  if (collabDescription) {
    collabDescription.addEventListener('input', () => updateSubmitButtonState('collab'));
  }
  if (collabContact) {
    collabContact.addEventListener('input', () => updateSubmitButtonState('collab'));
  }
}

function validateUrl() {
  const urlInput = document.getElementById('archive-embed-url');
  if (!urlInput) return;
  
  const url = urlInput.value.trim();
  if (!url) return;
  
  if (!isValidUrl(url)) {
    urlInput.setCustomValidity('Please enter a URL from a trusted platform (ChatGPT, Claude, Grok, or Google Docs)');
  } else {
    urlInput.setCustomValidity('');
  }
}

function updateSubmitButtonState(formType) {
  const submitBtn = document.getElementById(`${formType}-submit-btn`);
  if (!submitBtn) return;
  
  let isValid = false;
  
  if (formType === 'archive') {
    const title = document.getElementById('archive-title')?.value.trim();
    const model = document.getElementById('archive-model')?.value;
    const prompt = document.getElementById('archive-prompt')?.value.trim();
    
    // Check content based on active choice
    const activeChoice = document.querySelector('.choice-button.active')?.dataset.choice || 'paste';
    let contentValid = false;
    
    if (activeChoice === 'paste') {
      const content = document.getElementById('archive-content')?.value.trim();
      contentValid = !!content;
    } else {
      const embedUrl = document.getElementById('archive-embed-url')?.value.trim();
      contentValid = !!embedUrl && isValidUrl(embedUrl);
    }
    
    isValid = title && model && prompt && contentValid && archiveTags.length > 0;
  } else if (formType === 'collab') {
    const type = document.getElementById('collab-type')?.value;
    const title = document.getElementById('collab-title')?.value.trim();
    const description = document.getElementById('collab-description')?.value.trim();
    const contact = document.getElementById('collab-contact')?.value.trim();
    
    isValid = type && title && description && contact && isValidEmail(contact) && collabTags.length > 0;
  }
  
  submitBtn.disabled = !isValid;
}

async function handleArchiveSubmission(e) {
  e.preventDefault();
  
  if (!currentUser) {
    showNotification('Please sign in to publish content.', 'error');
    setTimeout(() => {
      window.location.href = '/login.html?returnTo=' + encodeURIComponent(window.location.href);
    }, 2000);
    return;
  }

  // Save form data before checking terms acceptance
  saveFormData('archive');

  // Check terms acceptance
  if (!await checkTermsAcceptance()) {
    return;
  }

  const submitBtn = document.getElementById('archive-submit-btn');
  const originalText = submitBtn.textContent;
  
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';
    
    // Collect form data
    const title = document.getElementById('archive-title').value.trim();
    const model = document.getElementById('archive-model').value;
    const prompt = document.getElementById('archive-prompt').value.trim();
    const generationDate = document.getElementById('archive-generation-date').value || null;
    
    // Get privacy setting
    const promptPrivacy = document.querySelector('input[name="prompt-privacy"]:checked')?.value || 'public';
    const promptIsPublic = promptPrivacy === 'public';
    
    // Get content based on active choice
    const activeChoice = document.querySelector('.choice-button.active')?.dataset.choice || 'paste';
    let content = '';
    let embedUrl = null;
    
    if (activeChoice === 'paste') {
      content = document.getElementById('archive-content').value.trim();
    } else {
      embedUrl = document.getElementById('archive-embed-url').value.trim();
      if (!isValidUrl(embedUrl)) {
        throw new Error('Please enter a valid URL from a trusted platform (ChatGPT, Claude, Grok, or Google Docs)');
      }
    }
    
    // Validate required fields
    if (!title || !model || !prompt || archiveTags.length === 0) {
      throw new Error('Please fill in all required fields and add at least one tag');
    }
    
    if (activeChoice === 'paste' && !content) {
      throw new Error('Please enter the AI-generated content');
    }
    
    // Insert into database
    const { data, error } = await supabase
      .from('archive_posts')
      .insert({
        user_id: currentUser.id,
        title: title,
        ai_model: model,
        prompt: prompt,
        content: content || '', // Empty string if using embed URL
        embed_url: embedUrl,
        tags: archiveTags,
        generation_date: generationDate,
        prompt_is_public: promptIsPublic
      })
      .select()
      .single();
    
    if (error) throw error;
    
    showNotification('Archive post published successfully!', 'success');
    
    // Record activity
    recordPageVisit({
      type: 'archive',
      title: title,
      url: `/view-post.html?type=archive&id=${data.id}`,
      postId: data.id,
      metadata: { action: 'published' }
    });
    
    // Clear form cache after successful submission
    clearFormCache('archive');
    
    // Redirect after delay
    setTimeout(() => {
      window.location.href = `/view-post.html?type=archive&id=${data.id}`;
    }, 2000);
    
  } catch (error) {
    console.error('Error publishing archive post:', error);
    showNotification(error.message || 'Failed to publish. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    updateSubmitButtonState('archive');
  }
}

async function handleCollabSubmission(e) {
  e.preventDefault();
  
  if (!currentUser) {
    showNotification('Please sign in to post collaboration opportunities.', 'error');
    setTimeout(() => {
      window.location.href = '/login.html?returnTo=' + encodeURIComponent(window.location.href);
    }, 2000);
    return;
  }

  // Save form data before checking terms acceptance
  saveFormData('collab');

  // Check terms acceptance
  if (!await checkTermsAcceptance()) {
    return;
  }

  const submitBtn = document.getElementById('collab-submit-btn');
  const originalText = submitBtn.textContent;
  
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';
    
    // Collect form data
    const type = document.getElementById('collab-type').value;
    const title = document.getElementById('collab-title').value.trim();
    const description = document.getElementById('collab-description').value.trim();
    const contact = document.getElementById('collab-contact').value.trim();
    
    // Validate required fields
    if (!type || !title || !description || !contact || collabTags.length === 0) {
      throw new Error('Please fill in all required fields and add at least one tag');
    }
    
    if (!isValidEmail(contact)) {
      throw new Error('Please enter a valid email address');
    }
    
    // Insert into database
    const { data, error } = await supabase
      .from('collab_posts')
      .insert({
        user_id: currentUser.id,
        type: type,
        title: title,
        description: description,
        contact_email: contact,
        tags: collabTags
      })
      .select()
      .single();
    
    if (error) throw error;
    
    showNotification('Collaboration post published successfully!', 'success');
    
    // Record activity
    recordPageVisit({
      type: 'collab',
      title: title,
      url: `/view-post.html?type=collab&id=${data.id}`,
      postId: data.id,
      metadata: { action: 'published' }
    });
    
    // Clear form cache after successful submission
    clearFormCache('collab');
    
    // Redirect after delay
    setTimeout(() => {
      window.location.href = `/view-post.html?type=collab&id=${data.id}`;
    }, 2000);
    
  } catch (error) {
    console.error('Error publishing collab post:', error);
    showNotification(error.message || 'Failed to post. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    updateSubmitButtonState('collab');
  }
}

async function checkTermsAcceptance() {
  if (!currentUser) return false;
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('terms_accepted')
      .eq('id', currentUser.id)
      .single();
    
    if (error) throw error;
    
    if (!user?.terms_accepted) {
      showNotification('Please accept the terms and policies before publishing.', 'error');
      setTimeout(() => {
        window.location.href = '/accept-terms.html?returnTo=' + encodeURIComponent(window.location.href);
      }, 2000);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking terms acceptance:', error);
    return false;
  }
}

function initializeFormStates() {
  // Set default content choice to "paste"
  switchContentChoice('paste');
  
  // Initialize submit button states
  updateSubmitButtonState('archive');
  updateSubmitButtonState('collab');
  
  // Initialize tags displays
  updateTagsDisplay('archive');
  updateTagsDisplay('collab');
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    
    // Check if protocol is HTTP or HTTPS
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    
    // Extract hostname and check against whitelist
    const hostname = url.hostname.toLowerCase();
    
    // Check if the hostname matches any allowed domain (including subdomains)
    const isAllowed = ALLOWED_DOMAINS.some(domain => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });
    
    if (!isAllowed) {
      console.warn(`URL blocked: ${hostname} is not in the whitelist of allowed domains`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Invalid URL:', error);
    return false;
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#dc3545' : '#067273'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 100);

  // Remove notification
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Save form data to localStorage
function saveFormData(formType) {
  try {
    if (formType === 'archive') {
      const formData = {
        title: document.getElementById('archive-title')?.value || '',
        model: document.getElementById('archive-model')?.value || '',
        prompt: document.getElementById('archive-prompt')?.value || '',
        generationDate: document.getElementById('archive-generation-date')?.value || '',
        promptPrivacy: document.querySelector('input[name="prompt-privacy"]:checked')?.value || 'public',
        contentChoice: document.querySelector('.choice-button.active')?.dataset.choice || 'paste',
        content: document.getElementById('archive-content')?.value || '',
        embedUrl: document.getElementById('archive-embed-url')?.value || '',
        tags: archiveTags
      };
      
      localStorage.setItem(ARCHIVE_FORM_CACHE, JSON.stringify(formData));
      console.log('Archive form data saved to localStorage');
    } else if (formType === 'collab') {
      const formData = {
        type: document.getElementById('collab-type')?.value || '',
        title: document.getElementById('collab-title')?.value || '',
        description: document.getElementById('collab-description')?.value || '',
        contact: document.getElementById('collab-contact')?.value || '',
        tags: collabTags
      };
      
      localStorage.setItem(COLLAB_FORM_CACHE, JSON.stringify(formData));
      console.log('Collab form data saved to localStorage');
    }
  } catch (error) {
    console.error(`Error saving ${formType} form data:`, error);
  }
}

// Restore form data from localStorage
function restoreFormData() {
  try {
    // Restore archive form data
    const archiveCache = localStorage.getItem(ARCHIVE_FORM_CACHE);
    if (archiveCache) {
      const formData = JSON.parse(archiveCache);
      
      // Restore text inputs
      if (formData.title) document.getElementById('archive-title').value = formData.title;
      if (formData.model) document.getElementById('archive-model').value = formData.model;
      if (formData.prompt) document.getElementById('archive-prompt').value = formData.prompt;
      if (formData.generationDate) document.getElementById('archive-generation-date').value = formData.generationDate;
      
      // Restore content choice
      if (formData.contentChoice) {
        const choiceButton = document.querySelector(`.choice-button[data-choice="${formData.contentChoice}"]`);
        if (choiceButton) choiceButton.click();
        
        // Restore content based on choice
        if (formData.contentChoice === 'paste' && formData.content) {
          document.getElementById('archive-content').value = formData.content;
        } else if (formData.contentChoice === 'link' && formData.embedUrl) {
          document.getElementById('archive-embed-url').value = formData.embedUrl;
        }
      }
      
      // Restore prompt privacy
      if (formData.promptPrivacy) {
        const privacyRadio = document.querySelector(`input[name="prompt-privacy"][value="${formData.promptPrivacy}"]`);
        if (privacyRadio) {
          privacyRadio.checked = true;
          // Also update the selected class on the parent
          const privacyOption = privacyRadio.closest('.privacy-option');
          if (privacyOption) {
            document.querySelectorAll('.privacy-option').forEach(opt => opt.classList.remove('selected'));
            privacyOption.classList.add('selected');
            
            // Apply privacy settings to prompt field
            if (formData.promptPrivacy === 'private') {
              const promptTextarea = document.getElementById('archive-prompt');
              const container = promptTextarea?.closest('.prompt-textarea-container');
              if (promptTextarea && container) {
                handlePromptPrivacy(true, container, promptTextarea);
              }
            }
          }
        }
      }
      
      // Restore tags
      if (formData.tags && Array.isArray(formData.tags)) {
        archiveTags = formData.tags;
        updateTagsDisplay('archive');
      }
      
      console.log('Archive form data restored from cache');
    }
    
    // Restore collab form data
    const collabCache = localStorage.getItem(COLLAB_FORM_CACHE);
    if (collabCache) {
      const formData = JSON.parse(collabCache);
      
      // Restore text inputs
      if (formData.type) document.getElementById('collab-type').value = formData.type;
      if (formData.title) document.getElementById('collab-title').value = formData.title;
      if (formData.description) document.getElementById('collab-description').value = formData.description;
      if (formData.contact) document.getElementById('collab-contact').value = formData.contact;
      
      // Restore tags
      if (formData.tags && Array.isArray(formData.tags)) {
        collabTags = formData.tags;
        updateTagsDisplay('collab');
      }
      
      console.log('Collab form data restored from cache');
    }
    
    // Update submit button states after restoration
    updateSubmitButtonState('archive');
    updateSubmitButtonState('collab');
    
  } catch (error) {
    console.error('Error restoring form data:', error);
  }
}

// Clear form cache after successful submission
function clearFormCache(formType) {
  try {
    if (formType === 'archive') {
      localStorage.removeItem(ARCHIVE_FORM_CACHE);
    } else if (formType === 'collab') {
      localStorage.removeItem(COLLAB_FORM_CACHE);
    }
    console.log(`${formType} form cache cleared`);
  } catch (error) {
    console.error(`Error clearing ${formType} form cache:`, error);
  }
}

// Force style application on load and after DOM changes
window.addEventListener('load', forceStyleApplying);
document.addEventListener('DOMContentLoaded', forceStyleApplying);

// Setup a mutation observer to fix styles when DOM changes
const observer = new MutationObserver(function(mutations) {
  forceStyleApplying();
});
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class', 'style']
});