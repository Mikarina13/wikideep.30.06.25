import { createClient } from '@supabase/supabase-js';
import { initMenu } from './utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './utils/activityTracker.js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let currentUser = null;
let currentPost = null;
let postComments = [];
let authorId = null;
let isFollowingAuthor = false;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the menu
  initMenu();
  
  // Record page visit
  recordPageVisit({
    type: getPageTypeFromUrl(window.location.href),
    title: getPageTitle(),
    url: window.location.href
  });
  
  // Check authentication status
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  
  // Setup event listeners
  setupEventListeners();
  
  // Load and display the post
  await loadPost();
});

function setupEventListeners() {
  // Add the close button dynamically to the content after it's loaded
  window.addEventListener('load', addCloseButton);
}

function addCloseButton() {
  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.id = 'close-post-btn';
  closeBtn.className = 'close-post-btn';
  closeBtn.title = 'Close post';
  closeBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  
  // Add click event
  closeBtn.addEventListener('click', () => {
    window.history.back();
  });
  
  // Add to post content container
  const postContent = document.getElementById('post-content');
  if (postContent && postContent.firstChild) {
    const contentElement = postContent.querySelector('.post-full-content');
    if (contentElement) {
      contentElement.appendChild(closeBtn);
    }
  }
}

async function loadPost() {
  const urlParams = new URLSearchParams(window.location.search);
  const postType = urlParams.get('type');
  const postId = urlParams.get('id');
  
  if (!postType || !postId) {
    showError('Invalid post URL. Missing type or ID parameter.');
    return;
  }
  
  if (postType !== 'archive' && postType !== 'collab') {
    showError('Invalid post type. Must be either "archive" or "collab".');
    return;
  }
  
  try {
    const tableName = postType === 'archive' ? 'archive_posts' : 'collab_posts';
    
    const { data: post, error } = await supabase
      .from(tableName)
      .select(`
        *,
        users:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('id', postId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        showError('Post not found.');
      } else {
        throw error;
      }
      return;
    }
    
    currentPost = { ...post, type: postType };
    authorId = post.user_id;
    
    // Update view count
    await incrementViewCount(tableName, postId, post.views || 0);
    
    // Check if user is following the author
    if (currentUser && authorId && currentUser.id !== authorId) {
      await checkFollowStatus();
    }
    
    // Display the post
    displayPost(currentPost);
    
    // Update page title
    document.title = `${post.title} - WikiDeep.io`;
    
    // Load comments
    await loadComments(postId, postType);
    
    // Setup comment form
    setupCommentForm();
    
    // Record detailed page visit
    recordPageVisit({
      type: postType,
      title: post.title,
      url: window.location.href,
      postId: postId,
      metadata: { action: 'viewed' }
    });
    
  } catch (error) {
    console.error('Error loading post:', error);
    showError('Failed to load post. Please try again.');
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
      showNotification('Please accept the terms and policies before proceeding.', 'info');
      setTimeout(() => {
        window.location.href = '/accept-terms.html?returnTo=' + encodeURIComponent(window.location.href);
      }, 1000);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking terms acceptance:', error);
    return false;
  }
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

async function checkFollowStatus() {
  if (!currentUser || !authorId) return;
  
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('followed_id', authorId)
      .single();
    
    isFollowingAuthor = !!data;
    
  } catch (error) {
    console.error('Error checking follow status:', error);
    isFollowingAuthor = false;
  }
}

async function incrementViewCount(tableName, postId, currentViews) {
  try {
    const newViewCount = currentViews + 1;
    
    const { error } = await supabase
      .from(tableName)
      .update({ views: newViewCount })
      .eq('id', postId);
    
    if (error) {
      console.error('Error updating view count:', error);
    }
  } catch (error) {
    console.error('Error incrementing view count:', error);
  }
}

function displayPost(post) {
  const container = document.getElementById('post-content');
  if (!container) return;
  
  const authorName = post.users?.raw_user_meta_data?.display_name || 
                    post.users?.raw_user_meta_data?.full_name || 
                    post.users?.email?.split('@')[0] || 
                    'Community Member';
  
  const postDate = new Date(post.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const isArchivePost = post.type === 'archive';
  
  let contentHTML = '';
  let metaHTML = '';
  let actionsHTML = '';
  
  // Add Follow Author button if user is not the author
  const followButtonHTML = currentUser && authorId && currentUser.id !== authorId ? `
    <button class="author-follow-btn ${isFollowingAuthor ? 'following' : ''}" onclick="followAuthor('${authorId}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${isFollowingAuthor ?
          `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <polyline points="17 11 19 13 23 9"/>`
          :
          `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>`
        }
      </svg>
      ${isFollowingAuthor ? 'Following' : 'Follow'}
    </button>
  ` : '';
  
  if (isArchivePost) {
    // Archive post content
    metaHTML = `
      <div class="post-full-meta">
        <div class="post-type-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Archive Post
        </div>
        <span>
          <a href="/public-profile.html?id=${authorId}" class="author-link">
            👤 By ${authorName}
          </a>
          ${followButtonHTML}
        </span>
        <span>•</span>
        <span>🤖 ${post.ai_model}</span>
        <span>•</span>
        <span>📅 ${postDate}</span>
        <span>•</span>
        <span>👁️ ${(post.views || 0) + 1} views</span>
        <span>•</span>
        <span>❤️ ${post.favorites_count || 0} favorites</span>
      </div>
    `;
    
    // Content section - UPDATED: Now displaying a direct link instead of iframe for embed_url
    if (post.embed_url) {
      contentHTML = `
        <div class="post-full-content-section">
          <div class="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Linked Content
          </div>
          <div class="external-link-container">
            <a href="${post.embed_url}" target="_blank" rel="noopener noreferrer" class="external-content-link">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Open Original Content
            </a>
            <p class="external-link-info">This content is hosted externally. Click the link above to view it in a new tab.</p>
          </div>
        </div>
      `;
    } else if (post.content) {
      contentHTML = `
        <div class="post-full-content-section">
          <div class="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            AI-Generated Content
          </div>
          <div class="post-full-text">${post.content}</div>
        </div>
      `;
    }
    
    // Prompt section (if public)
    if (post.prompt && post.prompt_is_public) {
      contentHTML += `
        <div class="post-full-content-section">
          <div class="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
            Original Prompt
          </div>
          <div class="post-full-text">${post.prompt}</div>
        </div>
      `;
    }
    
    // Action buttons for archive posts - UPDATED: Only show download button if there's content
    actionsHTML = `
      <button class="favorite-btn" onclick="toggleFavorite('${post.id}', 'archive', this)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        Add to Favorites
      </button>
      ${post.content ? `
        <button class="download-btn" onclick="downloadPost('${post.id}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download as Text
        </button>
      ` : ''}
    `;
    
  } else {
    // Collaboration post content
    metaHTML = `
      <div class="post-full-meta">
        <div class="post-type-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
          ${post.type === 'request' ? 'Looking for Collaboration' : 'Offering to Collaborate'}
        </div>
        <span>
          <a href="/public-profile.html?id=${authorId}" class="author-link">
            👤 By ${authorName}
          </a>
          ${followButtonHTML}
        </span>
        <span>•</span>
        <span>📅 ${postDate}</span>
        <span>•</span>
        <span>👁️ ${(post.views || 0) + 1} views</span>
        <span>•</span>
        <span>❤️ ${post.favorites_count || 0} favorites</span>
      </div>
    `;
    
    contentHTML = `
      <div class="post-full-content-section">
        <div class="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
          Description
        </div>
        <div class="post-full-text">${post.description}</div>
      </div>
      
      <div class="contact-section">
        <div class="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Contact Information
        </div>
        <a href="mailto:${post.contact_email}" class="contact-email">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          ${post.contact_email}
        </a>
      </div>
    `;
    
    // Action buttons for collab posts
    actionsHTML = `
      <button class="favorite-btn" onclick="toggleFavorite('${post.id}', 'collab', this)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        Add to Favorites
      </button>
      <a href="mailto:${post.contact_email}" class="download-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        Contact Now
      </a>
    `;
  }
  
  // Tags section
  const tagsHTML = post.tags && post.tags.length > 0 ? `
    <div class="post-full-tags">
      ${post.tags.map(tag => `<span class="post-full-tag">${tag}</span>`).join('')}
    </div>
  ` : '';
  
  // Add some styles for the author link and follow button
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .author-link {
      color: #067273;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s ease;
      display: inline-flex;
      align-items: center;
    }
    
    .author-link:hover {
      color: #045c66;
      text-decoration: underline;
    }
    
    .author-follow-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-left: 8px;
      border: none;
    }
    
    .author-follow-btn:not(.following) {
      background: #fac637;
      color: #067273;
    }
    
    .author-follow-btn:not(.following):hover {
      background: #f8c832;
    }
    
    .author-follow-btn.following {
      background: rgba(6, 114, 115, 0.1);
      color: #067273;
      border: 1px solid rgba(6, 114, 115, 0.3);
    }
    
    .author-follow-btn.following:hover {
      background: rgba(220, 53, 69, 0.1);
      color: #dc3545;
      border-color: rgba(220, 53, 69, 0.3);
    }
  `;
  document.head.appendChild(styleElement);
  
  container.innerHTML = `
    <div class="post-full-content">
      <div class="post-full-header">
        <div class="post-header-actions">
          <h1 class="post-full-title">${post.title}</h1>
          <div class="post-action-buttons">
            ${actionsHTML}
          </div>
        </div>
        ${metaHTML}
      </div>
      
      ${contentHTML}
      
      ${tagsHTML}
    </div>
  `;
  
  // Add close button to the post content
  addCloseButton();
}

async function loadComments(postId, postType) {
  try {
    // Load comments for this post
    const { data: comments, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        users:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('post_id', postId)
      .eq('post_type', postType)
      .is('parent_comment_id', null) // Only get top-level comments
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    postComments = comments || [];
    displayComments();
  } catch (error) {
    console.error('Error loading comments:', error);
    showCommentError('Failed to load comments. Please refresh the page to try again.');
  }
}

function displayComments() {
  const commentsListElement = document.getElementById('comments-list');
  const commentsCountElement = document.getElementById('comments-count');
  
  if (!commentsListElement || !commentsCountElement) return;
  
  // Update comments count
  commentsCountElement.textContent = postComments.length;
  
  // Display comments or show empty state
  if (postComments.length === 0) {
    commentsListElement.innerHTML = `
      <div class="empty-comments">
        <p>No comments yet. Be the first to comment!</p>
      </div>
    `;
    return;
  }
  
  const commentsHTML = postComments.map(comment => {
    const authorId = comment.user_id;
    const authorName = comment.users?.raw_user_meta_data?.display_name || 
                        comment.users?.raw_user_meta_data?.full_name || 
                        comment.users?.email?.split('@')[0] || 
                        'Community Member';
    
    const commentDate = new Date(comment.created_at).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Show delete button only if current user is the author
    const isAuthor = currentUser && currentUser.id === comment.user_id;
    const deleteButton = isAuthor ? `
      <div class="comment-actions">
        <button class="delete-comment-btn" onclick="deleteComment('${comment.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          Delete
        </button>
      </div>
    ` : '';
    
    // Add follow button if not the current user
    const followButtonHTML = currentUser && authorId && currentUser.id !== authorId ? `
      <button class="follow-comment-author-btn" data-author-id="${authorId}" onclick="followCommentAuthor(event, '${authorId}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
        Follow
      </button>
    ` : '';
    
    return `
      <div class="comment-item" data-comment-id="${comment.id}">
        <div class="comment-header">
          <div class="comment-author">
            <a href="/public-profile.html?id=${authorId}" class="comment-author-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              ${authorName}
            </a>
            ${followButtonHTML}
          </div>
          <div class="comment-time">${commentDate}</div>
        </div>
        <div class="comment-content">${comment.content}</div>
        ${deleteButton}
      </div>
    `;
  }).join('');
  
  commentsListElement.innerHTML = commentsHTML;
  
  // Add styles for author links and follow buttons
  addCommentStyles();
  
  // Initialize all follow buttons
  initializeCommentFollowButtons();
}

function addCommentStyles() {
  // Check if styles already exist
  if (document.getElementById('comment-author-styles')) return;
  
  const styleElement = document.createElement('style');
  styleElement.id = 'comment-author-styles';
  styleElement.textContent = `
    .comment-author-link {
      color: #067273;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s ease;
    }
    
    .comment-author-link:hover {
      color: #045c66;
      text-decoration: underline;
    }
    
    .follow-comment-author-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-left: 8px;
      border: none;
      background: #fac637;
      color: #067273;
    }
    
    .follow-comment-author-btn:hover {
      background: #f8c832;
    }
    
    .follow-comment-author-btn.following {
      background: rgba(6, 114, 115, 0.1);
      color: #067273;
      border: 1px solid rgba(6, 114, 115, 0.3);
    }
    
    .follow-comment-author-btn.following:hover {
      background: rgba(220, 53, 69, 0.1);
      color: #dc3545;
      border-color: rgba(220, 53, 69, 0.3);
    }
  `;
  document.head.appendChild(styleElement);
}

async function initializeCommentFollowButtons() {
  if (!currentUser) return;
  
  const followButtons = document.querySelectorAll('.follow-comment-author-btn');
  
  // Get all unique author IDs
  const authorIds = Array.from(followButtons).map(btn => btn.dataset.authorId).filter((v, i, a) => a.indexOf(v) === i);
  
  // Check follow status for all authors in a single query
  try {
    const { data: followData, error } = await supabase
      .from('user_follows')
      .select('followed_id')
      .eq('follower_id', currentUser.id)
      .in('followed_id', authorIds);
    
    if (error) throw error;
    
    // Create a set of followed user IDs for easy lookup
    const followedUserIds = new Set(followData?.map(f => f.followed_id) || []);
    
    // Update button states
    followButtons.forEach(btn => {
      const authorId = btn.dataset.authorId;
      const isFollowing = followedUserIds.has(authorId);
      
      if (isFollowing) {
        btn.classList.add('following');
        btn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <polyline points="17 11 19 13 23 9"/>
          </svg>
          Following
        `;
      }
    });
    
  } catch (error) {
    console.error('Error checking follow statuses:', error);
  }
}

function setupCommentForm() {
  const formContainer = document.getElementById('comment-form-container');
  if (!formContainer) return;
  
  if (!currentUser) {
    // User is not logged in, show login prompt
    formContainer.innerHTML = `
      <div class="login-to-comment">
        <p>Please sign in to leave a comment</p>
        <a href="/login.html?returnTo=${encodeURIComponent(window.location.href)}" class="login-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Sign In to Comment
        </a>
      </div>
    `;
    return;
  }
  
  // User is logged in, show comment form
  formContainer.innerHTML = `
    <div class="comment-form">
      <h3 class="comment-form-title">Leave a Comment</h3>
      <textarea id="comment-text" class="comment-textarea" placeholder="Share your thoughts or ask a question about this post..."></textarea>
      <div class="comment-form-actions">
        <button type="button" id="cancel-comment" class="comment-cancel-btn">Cancel</button>
        <button type="button" id="submit-comment" class="comment-submit-btn">Post Comment</button>
      </div>
      <div id="comment-notification" class="comment-notification"></div>
    </div>
  `;
  
  // Add event listeners
  const commentText = document.getElementById('comment-text');
  const submitButton = document.getElementById('submit-comment');
  const cancelButton = document.getElementById('cancel-comment');
  
  if (commentText && submitButton) {
    // Enable/disable submit button based on content
    commentText.addEventListener('input', () => {
      submitButton.disabled = !commentText.value.trim();
    });
    
    // Initialize submit button state
    submitButton.disabled = true;
    
    // Submit comment
    submitButton.addEventListener('click', handleCommentSubmit);
  }
  
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      if (commentText) commentText.value = '';
      if (submitButton) submitButton.disabled = true;
    });
  }
}

async function handleCommentSubmit() {
  if (!currentUser || !currentPost) return;
  
  // Check terms acceptance first
  if (!await checkTermsAcceptance()) {
    return;
  }
  
  const commentText = document.getElementById('comment-text');
  const submitButton = document.getElementById('submit-comment');
  const notification = document.getElementById('comment-notification');
  
  if (!commentText || !submitButton || !notification) return;
  
  const content = commentText.value.trim();
  if (!content) return;
  
  // Disable submit button and show loading state
  submitButton.disabled = true;
  submitButton.textContent = 'Posting...';
  
  try {
    // Insert comment into forum_posts table
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: currentUser.id,
        content: content,
        post_id: currentPost.id,
        post_type: currentPost.type,
        title: null // No title for comments
      })
      .select();
    
    if (error) throw error;
    
    // Clear form
    commentText.value = '';
    
    // Show success message
    showCommentNotification('Comment posted successfully!', 'success');
    
    // Reload comments
    await loadComments(currentPost.id, currentPost.type);
    
  } catch (error) {
    console.error('Error posting comment:', error);
    showCommentNotification('Failed to post comment. Please try again.', 'error');
  } finally {
    // Reset submit button
    submitButton.disabled = false;
    submitButton.textContent = 'Post Comment';
  }
}

// Global function for deleting comments
window.deleteComment = async function(commentId) {
  if (!currentUser || !commentId) return;
  
  if (!confirm('Are you sure you want to delete this comment?')) return;
  
  try {
    // Delete comment from database
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', commentId)
      .eq('user_id', currentUser.id); // Safety check to ensure user can only delete their own comments
    
    if (error) throw error;
    
    // Remove comment from UI
    const commentElement = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    if (commentElement) commentElement.remove();
    
    // Update comment count
    const commentsCountElement = document.getElementById('comments-count');
    if (commentsCountElement) {
      const currentCount = parseInt(commentsCountElement.textContent) || 0;
      commentsCountElement.textContent = Math.max(0, currentCount - 1);
    }
    
    // Show success message
    showCommentNotification('Comment deleted successfully!', 'success');
    
    // Filter out the deleted comment from our array
    postComments = postComments.filter(comment => comment.id !== commentId);
    
    // Show empty state if no comments left
    if (postComments.length === 0) {
      const commentsListElement = document.getElementById('comments-list');
      if (commentsListElement) {
        commentsListElement.innerHTML = `
          <div class="empty-comments">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        `;
      }
    }
    
  } catch (error) {
    console.error('Error deleting comment:', error);
    showCommentNotification('Failed to delete comment. Please try again.', 'error');
  }
};

// Global function for following comment authors
window.followCommentAuthor = async function(event, authorId) {
  // Stop event propagation to prevent clicking the comment author link
  event.stopPropagation();
  
  if (!currentUser) {
    alert('Please sign in to follow users');
    window.location.href = '/login.html';
    return;
  }
  
  if (currentUser.id === authorId) {
    alert("You can't follow yourself!");
    return;
  }
  
  // Check terms acceptance before following
  if (!await checkTermsAcceptance()) {
    return;
  }
  
  const buttons = document.querySelectorAll(`.follow-comment-author-btn[data-author-id="${authorId}"]`);
  const isFollowing = buttons[0]?.classList.contains('following');
  
  try {
    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('followed_id', authorId);
      
      if (error) throw error;
      
      // Update all buttons for this author
      buttons.forEach(btn => {
        btn.classList.remove('following');
        btn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          Follow
        `;
      });
      
      showCommentNotification('You unfollowed this user', 'info');
      
    } else {
      // Follow
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: currentUser.id,
          followed_id: authorId
        });
      
      if (error) throw error;
      
      // Update all buttons for this author
      buttons.forEach(btn => {
        btn.classList.add('following');
        btn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <polyline points="17 11 19 13 23 9"/>
          </svg>
          Following
        `;
      });
      
      showCommentNotification('You are now following this user', 'success');
    }
  } catch (error) {
    console.error('Error toggling follow status:', error);
    showCommentNotification('Failed to update follow status', 'error');
  }
};

// Global function for following the author of the post
window.followAuthor = async function(authorId) {
  if (!currentUser) {
    alert('Please sign in to follow users');
    window.location.href = '/login.html';
    return;
  }
  
  if (currentUser.id === authorId) {
    alert("You can't follow yourself!");
    return;
  }
  
  // Check terms acceptance before following
  if (!await checkTermsAcceptance()) {
    return;
  }
  
  const button = document.querySelector('.author-follow-btn');
  if (!button) return;
  
  try {
    if (isFollowingAuthor) {
      // Unfollow
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('followed_id', authorId);
      
      if (error) throw error;
      
      // Update button
      button.classList.remove('following');
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
        Follow
      `;
      
      isFollowingAuthor = false;
      showCommentNotification('You unfollowed this user', 'info');
      
    } else {
      // Follow
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: currentUser.id,
          followed_id: authorId
        });
      
      if (error) throw error;
      
      // Update button
      button.classList.add('following');
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <polyline points="17 11 19 13 23 9"/>
        </svg>
        Following
      `;
      
      isFollowingAuthor = true;
      showCommentNotification('You are now following this user', 'success');
    }
  } catch (error) {
    console.error('Error toggling follow status:', error);
    showCommentNotification('Failed to update follow status', 'error');
  }
};

function showCommentNotification(message, type) {
  const notification = document.getElementById('comment-notification');
  if (!notification) return;
  
  notification.textContent = message;
  notification.className = `comment-notification ${type}`;
  
  // Hide notification after 4 seconds
  setTimeout(() => {
    notification.className = 'comment-notification';
  }, 4000);
}

function showCommentError(message) {
  const commentsListElement = document.getElementById('comments-list');
  if (!commentsListElement) return;
  
  commentsListElement.innerHTML = `
    <div class="empty-comments" style="color: #dc3545;">
      <p>${message}</p>
    </div>
  `;
}

// Global functions for button interactions
window.toggleFavorite = async function(postId, postType, buttonElement) {
  if (!currentUser) {
    alert('Please sign in to add favorites.');
    window.location.href = '/login.html';
    return;
  }
  
  // Check terms acceptance first
  if (!await checkTermsAcceptance()) {
    return;
  }
  
  try {
    const isFavorited = buttonElement.classList.contains('favorited');
    
    if (isFavorited) {
      // Remove from favorites
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('post_id', postId)
        .eq('post_type', postType);
      
      if (error) throw error;
      
      buttonElement.classList.remove('favorited');
      buttonElement.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        Add to Favorites
      `;
      
    } else {
      // Add to favorites
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: currentUser.id,
          post_id: postId,
          post_type: postType,
          post_title: currentPost.title,
          post_data: {
            description: currentPost.description || currentPost.content,
            ai_model: currentPost.ai_model,
            tags: currentPost.tags,
            contact_email: currentPost.contact_email
          }
        });
      
      if (error) throw error;
      
      buttonElement.classList.add('favorited');
      buttonElement.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        Remove from Favorites
      `;
    }
    
  } catch (error) {
    console.error('Error toggling favorite:', error);
    alert('Failed to update favorites. Please try again.');
  }
};

window.downloadPost = async function(postId) {
  if (!currentPost || currentPost.id !== postId) return;
  
  // Check if user is logged in
  if (!currentUser) {
    alert('Please sign in to download content.');
    window.location.href = '/login.html?returnTo=' + encodeURIComponent(window.location.href);
    return;
  }
  
  // Check terms acceptance before downloading
  if (!await checkTermsAcceptance()) {
    return;
  }
  
  // UPDATED: Handle URL posts differently
  if (currentPost.embed_url) {
    // For URL posts, open the URL in a new tab
    window.open(currentPost.embed_url, '_blank');
    
    // Record the action
    recordPageVisit({
      type: currentPost.type,
      title: currentPost.title,
      url: window.location.href,
      postId: currentPost.id,
      metadata: { action: 'opened_link' }
    });
    
    return;
  }
  
  // For text content, continue with the download functionality
  let content = `Title: ${currentPost.title}\n`;
  content += `Type: ${currentPost.type.toUpperCase()} Post\n`;
  content += `Created: ${new Date(currentPost.created_at).toLocaleDateString()}\n`;
  
  if (currentPost.ai_model) {
    content += `AI Model: ${currentPost.ai_model}\n`;
  }
  
  if (currentPost.tags && currentPost.tags.length > 0) {
    content += `Tags: ${currentPost.tags.join(', ')}\n`;
  }
  
  content += '\n--- Content ---\n\n';
  
  if (currentPost.content) {
    content += currentPost.content;
  } else if (currentPost.description) {
    content += currentPost.description;
  }
  
  if (currentPost.prompt && currentPost.prompt_is_public) {
    content += '\n\n--- Original Prompt ---\n\n';
    content += currentPost.prompt;
  }
  
  if (currentPost.contact_email) {
    content += '\n\n--- Contact ---\n\n';
    content += `Email: ${currentPost.contact_email}`;
  }
  
  // Create and download file
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentPost.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Record download
  recordPageVisit({
    type: currentPost.type,
    title: currentPost.title,
    url: window.location.href,
    postId: currentPost.id,
    metadata: { action: 'downloaded' }
  });
};

function showError(message) {
  const container = document.getElementById('post-content');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Post</h3>
        <p>${message}</p>
        <a href="/" class="back-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          Back to Home
        </a>
      </div>
    `;
  }
}