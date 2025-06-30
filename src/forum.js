import { createClient } from '@supabase/supabase-js';
import { initMenu } from './utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './utils/activityTracker.js';
import { restrictAllDateInputs } from './utils/dateRestriction.js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let currentUser = null;
let discussionTags = [];
let isLoading = false;

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
  
  // Load forum discussions
  await loadForumDiscussions();
  
  // Setup event listeners
  setupEventListeners();
});

async function loadForumDiscussions() {
  if (isLoading) return;
  
  isLoading = true;
  showLoading();
  
  try {
    const { data: discussions, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        users:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .is('parent_comment_id', null) // Only get top-level discussions
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Get reply counts for each discussion
    if (discussions) {
      for (let discussion of discussions) {
        const { data: replies } = await supabase
          .from('forum_posts')
          .select('id')
          .eq('parent_comment_id', discussion.id);
        discussion.reply_count = replies ? replies.length : 0;
      }
    }
    
    await displayDiscussions(discussions || []);
    updateStats(discussions?.length || 0);
    
  } catch (error) {
    console.error('Error loading discussions:', error);
    showError('Failed to load discussions. Please try again.');
  } finally {
    isLoading = false;
  }
}

async function displayDiscussions(discussions) {
  const container = document.getElementById('discussions-container');
  
  if (discussions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>No discussions yet</h3>
        <p>Be the first to start a conversation! Share your thoughts about archive posts, ask questions, or discuss collaboration opportunities.</p>
        <button class="new-discussion-btn" onclick="openNewDiscussionModal()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14"/>
            <path d="M5 12h14"/>
          </svg>
          Start First Discussion
        </button>
      </div>
    `;
    return;
  }
  
  const discussionsList = document.createElement('div');
  discussionsList.className = 'discussions-list';
  
  for (const discussion of discussions) {
    const discussionElement = await createDiscussionElement(discussion);
    discussionsList.appendChild(discussionElement);
  }
  
  container.innerHTML = '';
  container.appendChild(discussionsList);
}

async function createDiscussionElement(discussion) {
  // Get author name
  const authorName = discussion.users?.raw_user_meta_data?.display_name || 
                    discussion.users?.raw_user_meta_data?.full_name || 
                    discussion.users?.email?.split('@')[0] || 
                    'Community Member';
  
  // Format date
  const discussionDate = new Date(discussion.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Get related post info if available
  let relatedPostInfo = '';
  if (discussion.post_id && discussion.post_type) {
    try {
      const table = discussion.post_type === 'archive' ? 'archive_posts' : 'collab_posts';
      const { data: relatedPost } = await supabase
        .from(table)
        .select('title')
        .eq('id', discussion.post_id)
        .single();
      
      if (relatedPost) {
        relatedPostInfo = `
          <div class="discussion-type-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${discussion.post_type === 'archive' 
                ? '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>'
                : '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'
              }
            </svg>
            ${discussion.post_type.toUpperCase()}: ${relatedPost.title.substring(0, 30)}${relatedPost.title.length > 30 ? '...' : ''}
          </div>
        `;
      }
    } catch (error) {
      console.error('Error fetching related post:', error);
    }
  } else {
    // General discussion badge
    relatedPostInfo = `
      <div class="discussion-type-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        GENERAL DISCUSSION
      </div>
    `;
  }
  
  // Create tags HTML if discussion has tags
  const tagsHTML = discussion.tags && discussion.tags.length > 0 ? `
    <div class="discussion-tags">
      ${discussion.tags.map(tag => `<span class="discussion-tag">${tag}</span>`).join('')}
    </div>
  ` : '';
  
  // Check if current user is the author to show delete button
  const isAuthor = currentUser && currentUser.id === discussion.user_id;
  
  const div = document.createElement('div');
  div.className = 'discussion-item';
  div.dataset.discussionId = discussion.id;
  const discussionTitle = discussion.title || 'Untitled Discussion';
  
  div.innerHTML = `
    <div class="discussion-header">
      <div class="discussion-meta">
        ${relatedPostInfo}
        <span>💬 ${discussionTitle}</span>
        <span>•</span>
        <span>${discussionDate}</span>
      </div>
      ${isAuthor ? `
        <button class="delete-post-btn" onclick="handleDeletePost('${discussion.id}', 'discussion')" title="Delete this discussion">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
          </svg>
        </button>
      ` : ''}
    </div>
    
    <div class="discussion-content">
      ${discussion.content}
    </div>
    
    ${tagsHTML}
    
    <div class="discussion-footer">
      <div class="discussion-author">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6"/>
        </svg>
        ${authorName}
      </div>
      <div class="discussion-actions">
        <div class="reply-count">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          ${discussion.reply_count || 0} ${discussion.reply_count === 1 ? 'reply' : 'replies'}
        </div>
        <button class="reply-btn" onclick="toggleReplyForm('${discussion.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          Reply
        </button>
      </div>
    </div>
    
    <!-- Replies Section -->
    <div class="replies-section" id="replies-${discussion.id}" style="display: none;">
      <div class="replies-header">
        <h4 class="replies-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Replies
        </h4>
        <button class="toggle-replies-btn" onclick="toggleRepliesVisibility('${discussion.id}')">
          <span id="toggle-text-${discussion.id}">Show Replies</span>
        </button>
      </div>
      
      <div class="replies-list" id="replies-list-${discussion.id}">
        <!-- Replies will be loaded here -->
      </div>
      
      <!-- Reply Form -->
      <div class="reply-form" id="reply-form-${discussion.id}">
        <textarea placeholder="Write your reply..." id="reply-content-${discussion.id}"></textarea>
        <div class="reply-form-actions">
          <button class="reply-cancel-btn" onclick="hideReplyForm('${discussion.id}')">Cancel</button>
          <button class="reply-submit-btn" onclick="submitReply('${discussion.id}')">Post Reply</button>
        </div>
      </div>
    </div>
  `;
  
  return div;
}

// Global function for deleting posts
window.handleDeletePost = async function(postId, postType) {
  if (!currentUser) {
    alert('You must be signed in to delete posts.');
    return;
  }
  
  // Confirm deletion
  const confirmMessage = postType === 'discussion' 
    ? 'Are you sure you want to delete this discussion? This action cannot be undone and will also delete all replies to this discussion.'
    : 'Are you sure you want to delete this reply? This action cannot be undone.';
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  try {
    // Delete the post from database
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', currentUser.id); // Extra security check
    
    if (error) throw error;
    
    if (postType === 'discussion') {
      // Remove the entire discussion element
      const discussionElement = document.querySelector(`[data-discussion-id="${postId}"]`);
      if (discussionElement) {
        discussionElement.remove();
        
        // Update stats
        const remainingDiscussions = document.querySelectorAll('.discussion-item').length;
        updateStats(remainingDiscussions);
      }
    } else if (postType === 'reply') {
      // Remove the reply element and update reply count
      const replyElement = document.querySelector(`[data-reply-id="${postId}"]`);
      if (replyElement) {
        const discussionId = replyElement.dataset.discussionId;
        replyElement.remove();
        
        // Update reply count for the parent discussion
        if (discussionId) {
          await updateReplyCount(discussionId);
        }
      }
    }
    
    showNotification(`${postType === 'discussion' ? 'Discussion' : 'Reply'} deleted successfully!`, 'success');
    
  } catch (error) {
    console.error('Error deleting post:', error);
    showNotification('Failed to delete post. Please try again.', 'error');
  }
};

// Global functions for reply functionality
window.toggleReplyForm = async function(discussionId) {
  if (!currentUser) {
    alert('Please sign in to reply to discussions.');
    window.location.href = '/login.html';
    return;
  }
  
  const repliesSection = document.getElementById(`replies-${discussionId}`);
  const replyForm = document.getElementById(`reply-form-${discussionId}`);
  
  // Show replies section if hidden
  if (repliesSection.style.display === 'none') {
    repliesSection.style.display = 'block';
    await loadReplies(discussionId);
  }
  
  // Toggle reply form
  replyForm.classList.toggle('active');
  
  if (replyForm.classList.contains('active')) {
    document.getElementById(`reply-content-${discussionId}`).focus();
  }
};

window.toggleRepliesVisibility = async function(discussionId) {
  const repliesList = document.getElementById(`replies-list-${discussionId}`);
  const toggleText = document.getElementById(`toggle-text-${discussionId}`);
  
  if (repliesList.children.length === 0) {
    await loadReplies(discussionId);
  }
  
  if (repliesList.style.display === 'none' || !repliesList.style.display) {
    repliesList.style.display = 'block';
    toggleText.textContent = 'Hide Replies';
  } else {
    repliesList.style.display = 'none';
    toggleText.textContent = 'Show Replies';
  }
};

window.hideReplyForm = function(discussionId) {
  const replyForm = document.getElementById(`reply-form-${discussionId}`);
  replyForm.classList.remove('active');
  
  // Clear the textarea
  document.getElementById(`reply-content-${discussionId}`).value = '';
};

window.submitReply = async function(discussionId) {
  if (!currentUser) {
    alert('Please sign in to reply to discussions.');
    return;
  }
  
  const content = document.getElementById(`reply-content-${discussionId}`).value.trim();
  
  if (!content) {
    alert('Please enter a reply before submitting.');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: currentUser.id,
        parent_comment_id: discussionId,
        content: content
      });
    
    if (error) throw error;
    
    // Clear form and hide it
    hideReplyForm(discussionId);
    
    // Reload replies
    await loadReplies(discussionId);
    
    // Update reply count in the UI
    await updateReplyCount(discussionId);
    
    showNotification('Reply posted successfully!', 'success');
    
  } catch (error) {
    console.error('Error posting reply:', error);
    showNotification('Failed to post reply. Please try again.', 'error');
  }
};

async function loadReplies(discussionId) {
  try {
    const { data: replies, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        users:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .eq('parent_comment_id', discussionId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    const repliesList = document.getElementById(`replies-list-${discussionId}`);
    
    if (!replies || replies.length === 0) {
      repliesList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No replies yet. Be the first to reply!</p>';
      return;
    }
    
    repliesList.innerHTML = replies.map(reply => {
      const authorName = reply.users?.raw_user_meta_data?.display_name || 
                        reply.users?.raw_user_meta_data?.full_name || 
                        reply.users?.email?.split('@')[0] || 
                        'Community Member';
      
      const replyDate = new Date(reply.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Check if current user is the author to show delete button
      const isAuthor = currentUser && currentUser.id === reply.user_id;
      
      return `
        <div class="reply-item" data-reply-id="${reply.id}" data-discussion-id="${discussionId}">
          <div class="reply-header">
            <div class="reply-content">${reply.content}</div>
            ${isAuthor ? `
              <button class="delete-reply-btn" onclick="handleDeletePost('${reply.id}', 'reply')" title="Delete this reply">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
                </svg>
              </button>
            ` : ''}
          </div>
          <div class="reply-meta">
            <span class="reply-author">${authorName}</span>
            <span>${replyDate}</span>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading replies:', error);
    const repliesList = document.getElementById(`replies-list-${discussionId}`);
    repliesList.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Failed to load replies.</p>';
  }
}

async function updateReplyCount(discussionId) {
  try {
    const { data: replies } = await supabase
      .from('forum_posts')
      .select('id')
      .eq('parent_comment_id', discussionId);
    
    const replyCount = replies ? replies.length : 0;
    
    // Update the reply count in the UI
    const discussionItem = document.querySelector(`[data-discussion-id="${discussionId}"]`);
    if (discussionItem) {
      const replyCountElement = discussionItem.querySelector('.reply-count');
      if (replyCountElement) {
        replyCountElement.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}
        `;
      }
    }
    
  } catch (error) {
    console.error('Error updating reply count:', error);
  }
}

function setupEventListeners() {
  // Search functionality
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }
  
  // New discussion modal
  const newDiscussionBtn = document.getElementById('new-discussion-btn');
  if (newDiscussionBtn) {
    newDiscussionBtn.addEventListener('click', openNewDiscussionModal);
  }
  
  const modalClose = document.getElementById('modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', closeNewDiscussionModal);
  }
  
  const cancelDiscussion = document.getElementById('cancel-discussion');
  if (cancelDiscussion) {
    cancelDiscussion.addEventListener('click', closeNewDiscussionModal);
  }
  
  // Modal overlay click to close
  const modalOverlay = document.getElementById('new-discussion-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeNewDiscussionModal();
      }
    });
  }
  
  // Discussion form submission
  const discussionForm = document.getElementById('new-discussion-form');
  if (discussionForm) {
    discussionForm.addEventListener('submit', handleNewDiscussion);
  }
  
  // Tag functionality
  setupTagFunctionality();
  
  // Related post search functionality
  setupRelatedPostSearch();
}

function setupRelatedPostSearch() {
  const searchInput = document.getElementById('related-post-search');
  const resultsContainer = document.getElementById('related-post-results');
  const selectedContainer = document.getElementById('related-post-selected');
  const selectedType = document.getElementById('related-post-selected-type');
  const selectedTitle = document.getElementById('related-post-selected-title');
  const removeButton = document.getElementById('related-post-remove');
  const postIdInput = document.getElementById('related-post-id');
  const postTypeInput = document.getElementById('related-post-type');
  
  if (searchInput && resultsContainer) {
    // Add input event listener with debounce
    searchInput.addEventListener('input', debounce((e) => {
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        resultsContainer.classList.remove('active');
        return;
      }
      
      // Show loading state
      resultsContainer.classList.add('active');
      resultsContainer.innerHTML = '<div class="related-post-loading">Searching...</div>';
      
      // Search for posts
      searchRelatedPosts(query);
    }, 500));
    
    // Add focus event to show results if there's text
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length >= 2) {
        resultsContainer.classList.add('active');
      }
    });
    
    // Add click event listener for results
    resultsContainer.addEventListener('click', (e) => {
      const item = e.target.closest('.related-post-result-item');
      if (!item) return;
      
      const postId = item.dataset.postId;
      const postType = item.dataset.postType;
      const postTitle = item.querySelector('.related-post-result-title').textContent;
      
      // Set the selected post
      selectRelatedPost(postId, postType, postTitle);
      
      // Hide results
      resultsContainer.classList.remove('active');
    });
    
    // Add click handler for remove button
    if (removeButton) {
      removeButton.addEventListener('click', (e) => {
        e.preventDefault();
        clearSelectedPost();
      });
    }
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
        resultsContainer.classList.remove('active');
      }
    });
  }
}

// Select a related post
function selectRelatedPost(postId, postType, postTitle) {
  const selectedContainer = document.getElementById('related-post-selected');
  const selectedType = document.getElementById('related-post-selected-type');
  const selectedTitle = document.getElementById('related-post-selected-title');
  const postIdInput = document.getElementById('related-post-id');
  const postTypeInput = document.getElementById('related-post-type');
  
  if (selectedContainer && selectedType && selectedTitle && postIdInput && postTypeInput) {
    // Set the hidden inputs
    postIdInput.value = postId;
    postTypeInput.value = postType;
    
    // Update the selected post display
    selectedType.textContent = postType.toUpperCase();
    selectedTitle.textContent = postTitle;
    
    // Show the selected post container
    selectedContainer.classList.add('active');
    
    // Clear the search input
    document.getElementById('related-post-search').value = '';
  }
}

// Clear the selected post
function clearSelectedPost() {
  const selectedContainer = document.getElementById('related-post-selected');
  const postIdInput = document.getElementById('related-post-id');
  const postTypeInput = document.getElementById('related-post-type');
  
  if (selectedContainer && postIdInput && postTypeInput) {
    // Clear the hidden inputs
    postIdInput.value = '';
    postTypeInput.value = '';
    
    // Hide the selected post container
    selectedContainer.classList.remove('active');
  }
}

// Search for related posts
async function searchRelatedPosts(query) {
  const resultsContainer = document.getElementById('related-post-results');
  
  if (!resultsContainer) return;
  
  try {
    // Search archive posts
    const { data: archivePosts, error: archiveError } = await supabase
      .from('archive_posts')
      .select('id, title, created_at')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (archiveError) throw archiveError;
    
    // Search collab posts
    const { data: collabPosts, error: collabError } = await supabase
      .from('collab_posts')
      .select('id, title, created_at')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (collabError) throw collabError;
    
    // Combine results
    const combinedResults = [
      ...(archivePosts || []).map(post => ({ ...post, type: 'archive' })),
      ...(collabPosts || []).map(post => ({ ...post, type: 'collab' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Display results
    if (combinedResults.length === 0) {
      resultsContainer.innerHTML = '<div class="related-post-no-results">No posts found matching your search</div>';
    } else {
      resultsContainer.innerHTML = combinedResults.map(post => `
        <div class="related-post-result-item" data-post-id="${post.id}" data-post-type="${post.type}">
          <div class="related-post-result-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${post.type === 'archive' 
                ? '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>'
                : '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'
              }
            </svg>
          </div>
          <div class="related-post-result-title">${post.title}</div>
          <div class="related-post-result-type">${post.type}</div>
        </div>
      `).join('');
    }
    
  } catch (error) {
    console.error('Error searching posts:', error);
    resultsContainer.innerHTML = '<div class="related-post-no-results">Error searching for posts</div>';
  }
}

function openNewDiscussionModal() {
  if (!currentUser) {
    alert('Please sign in to start a discussion.');
    window.location.href = '/login.html';
    return;
  }
  
  const modal = document.getElementById('new-discussion-modal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('discussion-title').focus();
  }
}

function closeNewDiscussionModal() {
  const modal = document.getElementById('new-discussion-modal');
  if (modal) {
    modal.classList.remove('active');
    
    // Reset form
    const form = document.getElementById('new-discussion-form');
    if (form) {
      form.reset();
      discussionTags = [];
      updateTagsDisplay('discussion');
      clearSelectedPost();
    }
  }
}

// Make openNewDiscussionModal globally available
window.openNewDiscussionModal = openNewDiscussionModal;

async function handleNewDiscussion(e) {
  e.preventDefault();
  
  if (!currentUser) {
    alert('Please sign in to start a discussion.');
    return;
  }
  
  const title = document.getElementById('discussion-title').value.trim();
  const content = document.getElementById('discussion-content').value.trim();
  const postId = document.getElementById('related-post-id').value;
  const postType = document.getElementById('related-post-type').value;
  
  if (!title || !content) {
    alert('Please fill in both title and content.');
    return;
  }
  
  try {
    const submitBtn = document.getElementById('submit-discussion');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';
    
    const { error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: currentUser.id,
        title: title,
        content: content,
        post_id: postId || null,
        post_type: postType || null,
        tags: discussionTags.length > 0 ? discussionTags : null
      });
    
    if (error) throw error;
    
    // Close modal and reload discussions
    closeNewDiscussionModal();
    await loadForumDiscussions();
    
    showNotification('Discussion posted successfully!', 'success');
    
  } catch (error) {
    console.error('Error posting discussion:', error);
    showNotification('Failed to post discussion. Please try again.', 'error');
  } finally {
    const submitBtn = document.getElementById('submit-discussion');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post Discussion';
    }
  }
}

function setupTagFunctionality() {
  const tagInput = document.getElementById('discussion-tag-input');
  const addTagBtn = document.getElementById('discussion-add-tag');
  
  if (tagInput && addTagBtn) {
    addTagBtn.addEventListener('click', () => addTag('discussion'));
    tagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag('discussion');
      }
    });
  }
}

function addTag(type) {
  const input = document.getElementById(`${type}-tag-input`);
  const errorElement = document.getElementById(`${type}-tag-error`);
  
  if (!input) return;
  
  const tagText = input.value.trim().toLowerCase();
  
  // Clear previous error
  if (errorElement) {
    errorElement.classList.remove('visible');
    errorElement.textContent = '';
  }
  
  // Validation
  if (!tagText) {
    showTagError(errorElement, 'Please enter a tag');
    return;
  }
  
  if (tagText.length > 20) {
    showTagError(errorElement, 'Tag must be 20 characters or less');
    return;
  }
  
  if (!/^[a-zA-Z0-9\s-]+$/.test(tagText)) {
    showTagError(errorElement, 'Tag can only contain letters, numbers, spaces, and hyphens');
    return;
  }
  
  if (discussionTags.includes(tagText)) {
    showTagError(errorElement, 'Tag already added');
    return;
  }
  
  if (discussionTags.length >= 5) {
    showTagError(errorElement, 'Maximum 5 tags allowed');
    return;
  }
  
  // Add tag
  discussionTags.push(tagText);
  input.value = '';
  updateTagsDisplay(type);
}

function updateTagsDisplay(type) {
  const display = document.getElementById(`${type}-tags-display`);
  const count = document.getElementById(`${type}-tag-count`);
  
  if (!display) return;
  
  if (discussionTags.length === 0) {
    display.className = 'tags-display empty';
    display.textContent = 'Add tags to help categorize your discussion (optional).';
  } else {
    display.className = 'tags-display';
    display.innerHTML = discussionTags.map(tag => `
      <div class="tag-item">
        ${tag}
        <button type="button" class="tag-remove" onclick="removeTag('${type}', '${tag}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `).join('');
  }
  
  if (count) {
    count.textContent = `${discussionTags.length} tags added`;
  }
}

// Make removeTag globally available
window.removeTag = function(type, tag) {
  const index = discussionTags.indexOf(tag);
  if (index > -1) {
    discussionTags.splice(index, 1);
    updateTagsDisplay(type);
  }
};

function showTagError(errorElement, message) {
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('visible');
  }
}

function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase().trim();
  const discussionItems = document.querySelectorAll('.discussion-item');
  
  discussionItems.forEach(item => {
    const title = item.querySelector('.discussion-content')?.textContent.toLowerCase() || '';
    const content = item.querySelector('.discussion-meta')?.textContent.toLowerCase() || '';
    
    if (title.includes(searchTerm) || content.includes(searchTerm)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

function updateStats(count) {
  const statsElement = document.getElementById('forum-stats');
  if (statsElement) {
    statsElement.innerHTML = `<p>Showing ${count} ${count === 1 ? 'discussion' : 'discussions'}</p>`;
  }
}

function showLoading() {
  const container = document.getElementById('discussions-container');
  if (container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading forum discussions...</p>
      </div>
    `;
  }
}

function showError(message) {
  const container = document.getElementById('discussions-container');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Discussions</h3>
        <p>${message}</p>
        <button class="back-button" onclick="window.location.reload()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          Try Again
        </button>
      </div>
    `;
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

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}