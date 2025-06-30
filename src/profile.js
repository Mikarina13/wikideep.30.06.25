import { initMenu } from './utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './utils/activityTracker.js';
import { restrictAllDateInputs } from './utils/dateRestriction.js';
import supabase from './utils/supabaseClient.js';

let currentUser = null;
let currentTab = 'archive';
let followersCount = 0;
let followingCount = 0;

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
  
  if (!currentUser) {
    // Redirect to login if not authenticated
    window.location.href = '/login.html?returnTo=' + encodeURIComponent(window.location.href);
    return;
  }
  
  // Load user profile and setup event listeners
  await loadUserProfile();
  setupEventListeners();
  await loadUserPosts();
  await getFollowCounts();
});

async function loadUserProfile() {
  if (!currentUser) return;
  
  try {
    // Get user data from public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (userError) throw userError;
    
    // Update profile display
    updateProfileDisplay(userData);
    
  } catch (error) {
    console.error('Error loading user profile:', error);
    showNotification('Failed to load profile data', 'error');
  }
}

function updateProfileDisplay(userData) {
  // Update profile name
  const profileName = document.getElementById('profile-name');
  if (profileName) {
    const displayName = userData?.raw_user_meta_data?.display_name || 
                       userData?.raw_user_meta_data?.full_name || 
                       userData?.email?.split('@')[0] || 
                       'User';
    profileName.textContent = displayName;
  }
  
  // Update profile email
  const profileEmail = document.getElementById('profile-email');
  if (profileEmail) {
    profileEmail.textContent = userData?.email || currentUser.email || 'No email';
  }
  
  // Update bio
  const profileBio = document.getElementById('profile-bio');
  if (profileBio) {
    const bio = userData?.raw_user_meta_data?.bio;
    profileBio.textContent = bio || 'No bio yet';
  }
  
  // Update metadata
  const profileLocation = document.getElementById('profile-location');
  if (profileLocation) {
    const location = userData?.raw_user_meta_data?.location;
    const metaText = profileLocation.querySelector('.meta-text');
    if (metaText) {
      metaText.textContent = location || 'Location not set';
    }
  }
  
  const profileWebsite = document.getElementById('profile-website');
  if (profileWebsite) {
    const website = userData?.raw_user_meta_data?.website;
    const metaText = profileWebsite.querySelector('.meta-text');
    if (metaText && website) {
      metaText.innerHTML = `<a href="${website}" target="_blank" rel="noopener noreferrer">${website}</a>`;
    } else if (metaText) {
      metaText.innerHTML = '<a href="/settings.html">Add website</a>';
    }
  }
  
  // Update avatar if available
  const profileImage = document.getElementById('profile-image');
  if (profileImage && userData?.raw_user_meta_data?.avatar_url) {
    profileImage.src = userData.raw_user_meta_data.avatar_url;
  }
}

async function getFollowCounts() {
  try {
    // Get followers count
    const { count: followers, error: followersError } = await supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('followed_id', currentUser.id);
    
    if (followersError) throw followersError;
    
    followersCount = followers || 0;
    
    // Get following count
    const { count: following, error: followingError } = await supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', currentUser.id);
    
    if (followingError) throw followingError;
    
    followingCount = following || 0;
    
    // Update UI with counts
    updateFollowCounts();
    
  } catch (error) {
    console.error('Error getting follow counts:', error);
  }
}

function updateFollowCounts() {
  // If elements exist for followers/following counts, update them
  const followersElement = document.querySelector('.profile-meta .followers-count');
  if (followersElement) {
    followersElement.textContent = followersCount;
  }
  
  const followingElement = document.querySelector('.profile-meta .following-count');
  if (followingElement) {
    followingElement.textContent = followingCount;
  }
}

function setupEventListeners() {
  // Close button
  const closeBtn = document.getElementById('profile-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.history.back();
    });
  }
  
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      switchTab(tab);
    });
  });
  
  // Avatar upload
  const avatarContainer = document.getElementById('avatar-container');
  const avatarUpload = document.getElementById('avatar-upload');
  const editAvatarBtn = document.getElementById('edit-avatar-btn');
  
  if (avatarContainer && avatarUpload) {
    avatarContainer.addEventListener('click', () => {
      avatarUpload.click();
    });
    
    avatarUpload.addEventListener('change', handleAvatarUpload);
  }
  
  if (editAvatarBtn && avatarUpload) {
    editAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarUpload.click();
    });
  }
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
  
  // Update sections
  const sections = document.querySelectorAll('.posts-section');
  sections.forEach(section => {
    if (section.id === `${tabName}-section`) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });
  
  // Load content based on active tab
  if (tabName === 'archive' || tabName === 'collab') {
    loadUserPosts();
  } else if (tabName === 'following') {
    loadFollowing();
  }
}

async function loadUserPosts() {
  if (!currentUser) return;
  
  const containerName = currentTab === 'archive' ? 'archive-posts' : 'collab-posts';
  const container = document.getElementById(containerName);
  
  if (!container) return;
  
  try {
    // Show loading state
    container.innerHTML = '<p class="empty-state">Loading posts...</p>';
    
    let query;
    if (currentTab === 'archive') {
      query = supabase
        .from('archive_posts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    } else {
      query = supabase
        .from('collab_posts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    }
    
    const { data: posts, error } = await query;
    
    if (error) throw error;
    
    displayUserPosts(posts || [], containerName);
    
  } catch (error) {
    console.error('Error loading user posts:', error);
    container.innerHTML = '<p class="empty-state">Failed to load posts</p>';
  }
}

function displayUserPosts(posts, containerName) {
  const container = document.getElementById(containerName);
  if (!container) return;
  
  if (posts.length === 0) {
    const postType = currentTab === 'archive' ? 'archive' : 'collaboration';
    container.innerHTML = `
      <div class="empty-posts">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
          ${currentTab === 'archive' 
            ? '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>'
            : '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'
          }
        </svg>
        <h4>No ${postType} posts yet</h4>
        <p>You haven't created any ${postType} posts yet. Start sharing your insights with the community!</p>
        <a href="/publish.html?tab=${currentTab}" class="create-post-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14"/>
            <path d="M5 12h14"/>
          </svg>
          Create ${postType === 'archive' ? 'Archive' : 'Collaboration'} Post
        </a>
      </div>
    `;
    return;
  }
  
  const postsHTML = posts.map(post => createPostHTML(post, currentTab)).join('');
  container.innerHTML = postsHTML;
}

function createPostHTML(post, type) {
  const date = new Date(post.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const tagsHTML = post.tags && post.tags.length > 0 ? 
    post.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('') : '';
  
  let contentHTML = '';
  let metaHTML = '';
  
  if (type === 'archive') {
    const content = post.content || 'Content available via link';
    const truncatedContent = content.length > 200 ? content.substring(0, 200) + '...' : content;
    
    contentHTML = `<div class="post-content">${truncatedContent}</div>`;
    
    if (post.prompt && post.prompt_is_public) {
      const truncatedPrompt = post.prompt.length > 100 ? post.prompt.substring(0, 100) + '...' : post.prompt;
      contentHTML += `
        <div class="post-prompt">
          <strong>Original Prompt:</strong>
          <p>${truncatedPrompt}</p>
        </div>
      `;
    }
    
    metaHTML = `
      <span>🤖 ${post.ai_model}</span>
      <span>•</span>
      <span>👁️ ${post.views || 0} views</span>
      <span>•</span>
      <span>⬇️ ${post.downloads || 0} downloads</span>
      <span>•</span>
      <span>❤️ ${post.favorites_count || 0} favorites</span>
    `;
  } else {
    contentHTML = `<div class="post-content">${post.description}</div>`;
    
    contentHTML += `
      <div class="contact-info">
        <strong>Contact Email:</strong>
        <a href="mailto:${post.contact_email}">${post.contact_email}</a>
      </div>
    `;
    
    metaHTML = `
      <div class="collab-type-badge">
        ${post.type === 'request' ? '🔍 Looking for Collaboration' : '🤝 Offering to Collaborate'}
      </div>
      <span>👁️ ${post.views || 0} views</span>
      <span>•</span>
      <span>❤️ ${post.favorites_count || 0} favorites</span>
    `;
  }
  
  return `
    <div class="post-item">
      <div class="post-item-header">
        <h4>${post.title}</h4>
        <div class="post-actions">
          <a href="/view-post.html?type=${type}&id=${post.id}" class="view-post-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h6v6"/>
              <path d="M10 14L21 3"/>
              <path d="M21 9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11"/>
            </svg>
            View
          </a>
          <button class="edit-post-btn" onclick="editPost('${post.id}', '${type}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
        </div>
      </div>
      
      <div class="post-meta">
        ${metaHTML}
      </div>
      
      ${contentHTML}
      
      ${tagsHTML ? `<div class="post-tags">${tagsHTML}</div>` : ''}
      
      <div class="post-footer">
        <span class="post-date">Posted on ${date}</span>
      </div>
    </div>
  `;
}

async function loadFollowing() {
  if (!currentUser) return;
  
  const followingList = document.getElementById('following-list');
  if (!followingList) return;
  
  try {
    // Show loading state
    followingList.innerHTML = '<p class="empty-state">Loading users you follow...</p>';
    
    console.log('Fetching following data for user:', currentUser.id);
    
    // Get users this profile is following
    const { data: followingData, error } = await supabase
      .from('user_follows')
      .select(`
        followed_id,
        followed:followed_id (
          id,
          email,
          raw_user_meta_data,
          created_at
        )
      `)
      .eq('follower_id', currentUser.id);
    
    if (error) throw error;
    
    console.log('Following data retrieved:', followingData);
    
    // Extract user data
    const followedUsers = followingData?.map(item => item.followed) || [];
    
    if (followedUsers.length === 0) {
      followingList.innerHTML = `
        <div class="empty-posts">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          <h4>Not following anyone</h4>
          <p>You're not following anyone yet. Discover interesting users by browsing the archives or collaborations!</p>
          <a href="/browse-archive.html" class="create-post-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            Discover Users
          </a>
        </div>
      `;
      return;
    }
    
    console.log('Followed users:', followedUsers.length);
    
    // Create HTML for each followed user
    const followingHTML = followedUsers.map(user => {
      if (!user) return ''; // Skip null/undefined entries
      
      const displayName = user?.raw_user_meta_data?.display_name || 
                          user?.raw_user_meta_data?.full_name || 
                          user?.email?.split('@')[0] || 
                          'User';
      
      const avatarUrl = user?.raw_user_meta_data?.avatar_url || 'https://i.imgur.com/zcLQ3gB.png';
      const bio = user?.raw_user_meta_data?.bio || 'No bio available';
      
      return `
        <div class="following-item" onclick="window.location.href='/public-profile.html?id=${user.id}'">
          <div class="following-avatar">
            <img src="${avatarUrl}" alt="${displayName}">
          </div>
          <div class="following-info">
            <div class="following-name">${displayName}</div>
            <div class="following-meta">${truncateText(bio, 60)}</div>
          </div>
        </div>
      `;
    }).join('');
    
    followingList.innerHTML = followingHTML || '<p class="empty-state">No users found</p>';
    
  } catch (error) {
    console.error('Error loading following:', error);
    followingList.innerHTML = '<p class="empty-state">Failed to load users you follow. Please try again.</p>';
  }
}

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

async function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file || !currentUser) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showNotification('Please select an image file', 'error');
    return;
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showNotification('Image size must be less than 5MB', 'error');
    return;
  }
  
  try {
    const avatarContainer = document.getElementById('avatar-container');
    const uploadProgress = document.getElementById('upload-progress');
    
    // Show uploading state
    if (avatarContainer) {
      avatarContainer.classList.add('avatar-uploading');
    }
    if (uploadProgress) {
      uploadProgress.style.display = 'block';
    }
    
    // Create file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    // Update user metadata with new avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl }
    });
    
    if (updateError) throw updateError;
    
    // Update the displayed avatar
    const profileImage = document.getElementById('profile-image');
    if (profileImage) {
      profileImage.src = publicUrl;
    }
    
    showNotification('Avatar updated successfully!', 'success');
    
  } catch (error) {
    console.error('Error uploading avatar:', error);
    showNotification('Failed to upload avatar. Please try again.', 'error');
  } finally {
    // Hide uploading state
    const avatarContainer = document.getElementById('avatar-container');
    const uploadProgress = document.getElementById('upload-progress');
    
    if (avatarContainer) {
      avatarContainer.classList.remove('avatar-uploading');
    }
    if (uploadProgress) {
      uploadProgress.style.display = 'none';
    }
  }
}

// Make editPost globally available
window.editPost = function(postId, postType) {
  // Redirect to edit page (could be implemented later)
  window.location.href = `/publish.html?tab=${postType}&edit=${postId}`;
};

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