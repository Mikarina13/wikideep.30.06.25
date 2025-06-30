import { createClient } from '@supabase/supabase-js';
import { initMenu } from './utils/menu.js';
import { recordPageVisit, getPageTitle } from './utils/activityTracker.js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let currentUser = null;
let profileUser = null;
let currentTab = 'posts';
let isFollowing = false;
let followersCount = 0;
let followingCount = 0;
let postsCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the menu
  initMenu();
  
  // Check authentication status
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  
  // Get user ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');
  
  if (!userId) {
    showError('Invalid profile URL. Missing user ID.');
    return;
  }
  
  // Load user profile
  await loadUserProfile(userId);
  
  // Setup event listeners
  setupEventListeners();
  
  // Check if current user is following profile user
  if (currentUser && profileUser) {
    await checkFollowStatus();
  }
  
  // Load initial tab content
  loadTabContent(currentTab);
  
  // Record page visit
  recordPageVisit({
    type: 'page',
    title: getPageTitle(),
    url: window.location.href
  });
});

async function loadUserProfile(userId) {
  try {
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    profileUser = userData;
    
    // Update profile display
    updateProfileDisplay(userData);
    
    // Get follower counts
    await getFollowCounts(userId);
    
    // Get post counts
    await getPostCounts(userId);
    
    // Update document title
    const displayName = getDisplayName(userData);
    document.title = `${displayName} - WikiDeep.io`;
    
  } catch (error) {
    console.error('Error loading user profile:', error);
    showError('Failed to load user profile.');
  }
}

function getDisplayName(userData) {
  return userData?.raw_user_meta_data?.display_name || 
         userData?.raw_user_meta_data?.full_name || 
         userData?.email?.split('@')[0] || 
         'User';
}

function updateProfileDisplay(userData) {
  // Update profile name
  const profileName = document.getElementById('profile-name');
  if (profileName) {
    profileName.textContent = getDisplayName(userData);
  }
  
  // Update bio
  const profileBio = document.getElementById('profile-bio');
  if (profileBio) {
    const bio = userData?.raw_user_meta_data?.bio;
    profileBio.textContent = bio || 'This user has not added a bio yet.';
  }
  
  // Update location if available
  const profileLocation = document.getElementById('profile-location');
  if (profileLocation) {
    const location = userData?.raw_user_meta_data?.location;
    if (location) {
      profileLocation.style.display = 'flex';
      const metaText = profileLocation.querySelector('.meta-text');
      if (metaText) {
        metaText.textContent = location;
      }
    }
  }
  
  // Update website if available
  const profileWebsite = document.getElementById('profile-website');
  if (profileWebsite) {
    const website = userData?.raw_user_meta_data?.website;
    if (website) {
      profileWebsite.style.display = 'flex';
      const metaText = profileWebsite.querySelector('.meta-text');
      if (metaText) {
        metaText.href = website.startsWith('http') ? website : 'https://' + website;
        metaText.textContent = website;
      }
    }
  }
  
  // Update joined date
  const profileJoined = document.getElementById('profile-joined');
  if (profileJoined) {
    const joinedDate = new Date(userData?.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const metaText = profileJoined.querySelector('.meta-text');
    if (metaText) {
      metaText.textContent = 'Joined: ' + joinedDate;
    }
  }
  
  // Update avatar if available
  const profileImage = document.getElementById('profile-image');
  if (profileImage && userData?.raw_user_meta_data?.avatar_url) {
    profileImage.src = userData.raw_user_meta_data.avatar_url;
  }
  
  // Hide follow button if viewing own profile
  if (currentUser && currentUser.id === userData.id) {
    const followButton = document.getElementById('follow-button');
    if (followButton) {
      followButton.style.display = 'none';
    }
  }
}

async function getFollowCounts(userId) {
  try {
    // Get followers count
    const { count: followers, error: followersError } = await supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('followed_id', userId);
    
    if (followersError) throw followersError;
    
    followersCount = followers || 0;
    
    // Get following count
    const { count: following, error: followingError } = await supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId);
    
    if (followingError) throw followingError;
    
    followingCount = following || 0;
    
    // Update counts in UI
    updateFollowCounts();
    
  } catch (error) {
    console.error('Error getting follow counts:', error);
  }
}

async function getPostCounts(userId) {
  try {
    // Get archive posts count
    const { count: archivePosts, error: archiveError } = await supabase
      .from('archive_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (archiveError) throw archiveError;
    
    // Get collab posts count
    const { count: collabPosts, error: collabError } = await supabase
      .from('collab_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (collabError) throw collabError;
    
    postsCount = (archivePosts || 0) + (collabPosts || 0);
    
    // Update count in UI
    const postsCountElement = document.getElementById('posts-count');
    if (postsCountElement) {
      postsCountElement.textContent = postsCount;
    }
    
  } catch (error) {
    console.error('Error getting post counts:', error);
  }
}

function updateFollowCounts() {
  // Update followers count
  const followersCountElement = document.getElementById('followers-count');
  if (followersCountElement) {
    followersCountElement.textContent = followersCount;
  }
  
  // Update following count
  const followingCountElement = document.getElementById('following-count');
  if (followingCountElement) {
    followingCountElement.textContent = followingCount;
  }
}

async function checkFollowStatus() {
  if (!currentUser || !profileUser) return;
  
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('followed_id', profileUser.id)
      .single();
    
    isFollowing = !!data;
    
    // Update follow button
    updateFollowButton();
    
  } catch (error) {
    console.error('Error checking follow status:', error);
    isFollowing = false;
    updateFollowButton();
  }
}

function updateFollowButton() {
  const followButton = document.getElementById('follow-button');
  if (!followButton) return;
  
  if (isFollowing) {
    followButton.classList.add('following');
    followButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="8.5" cy="7" r="4"/>
        <polyline points="17 11 19 13 23 9"/>
      </svg>
      Following
    `;
  } else {
    followButton.classList.remove('following');
    followButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="8.5" cy="7" r="4"/>
        <line x1="20" y1="8" x2="20" y2="14"/>
        <line x1="23" y1="11" x2="17" y2="11"/>
      </svg>
      Follow
    `;
  }
}

function setupEventListeners() {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      switchTab(tab);
    });
  });
  
  // Follow button
  const followButton = document.getElementById('follow-button');
  if (followButton) {
    followButton.addEventListener('click', handleFollowToggle);
  }
  
  // Stat items click handlers
  const followersStatItem = document.getElementById('followers-stat');
  if (followersStatItem) {
    followersStatItem.addEventListener('click', () => {
      openFollowersModal();
    });
  }
  
  const followingStatItem = document.getElementById('following-stat');
  if (followingStatItem) {
    followingStatItem.addEventListener('click', () => {
      openFollowingModal();
    });
  }
  
  // Modal close buttons
  const modalCloseButtons = document.querySelectorAll('.modal-close');
  modalCloseButtons.forEach(button => {
    button.addEventListener('click', closeModals);
  });
  
  // Close modals when clicking overlay
  const modalOverlays = document.querySelectorAll('.modal-overlay');
  modalOverlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModals();
      }
    });
  });
  
  // Close modals with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModals();
    }
  });

  // Close profile button
  const closeProfileBtn = document.getElementById('profile-close-btn');
  if (closeProfileBtn) {
    closeProfileBtn.addEventListener('click', () => {
      window.history.back();
    });
  }
}

function switchTab(tab) {
  currentTab = tab;
  
  // Update tab buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
  
  // Update tab content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tab}-tab`);
  });
  
  // Load content for the active tab
  loadTabContent(tab);
}

async function loadTabContent(tab) {
  if (!profileUser) return;
  
  const tabContentElement = document.getElementById(`${tab}-tab`);
  if (!tabContentElement) return;
  
  // Show loading state
  tabContentElement.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading ${tab}...</p>
    </div>
  `;
  
  try {
    switch (tab) {
      case 'posts':
        await loadUserPosts();
        break;
      case 'following':
        await loadUserFollowing();
        break;
      case 'followers':
        await loadUserFollowers();
        break;
    }
  } catch (error) {
    console.error(`Error loading ${tab}:`, error);
    tabContentElement.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12" y2="16"/>
        </svg>
        <h3>Error Loading Data</h3>
        <p>Failed to load ${tab}. Please try again later.</p>
      </div>
    `;
  }
}

async function loadUserPosts() {
  if (!profileUser) return;
  
  try {
    // Get archive posts
    const { data: archivePosts, error: archiveError } = await supabase
      .from('archive_posts')
      .select('*')
      .eq('user_id', profileUser.id)
      .order('created_at', { ascending: false });
    
    if (archiveError) throw archiveError;
    
    // Get collab posts
    const { data: collabPosts, error: collabError } = await supabase
      .from('collab_posts')
      .select('*')
      .eq('user_id', profileUser.id)
      .order('created_at', { ascending: false });
    
    if (collabError) throw collabError;
    
    // Combine and sort posts
    const allPosts = [
      ...(archivePosts || []).map(post => ({ ...post, type: 'archive' })),
      ...(collabPosts || []).map(post => ({ ...post, type: 'collab' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    displayUserPosts(allPosts);
    
  } catch (error) {
    console.error('Error loading posts:', error);
    throw error;
  }
}

function displayUserPosts(posts) {
  const tabContentElement = document.getElementById('posts-tab');
  if (!tabContentElement) return;
  
  if (posts.length === 0) {
    tabContentElement.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
        </svg>
        <h3>No Posts Yet</h3>
        <p>This user hasn't published any posts yet.</p>
      </div>
    `;
    return;
  }
  
  const postsHTML = `
    <div class="posts-grid">
      ${posts.map(post => createPostCard(post)).join('')}
    </div>
  `;
  
  tabContentElement.innerHTML = postsHTML;
  
  // Add click handlers to post cards
  tabContentElement.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      const postId = card.dataset.id;
      const postType = card.dataset.type;
      window.location.href = `/view-post.html?type=${postType}&id=${postId}`;
    });
  });
}

function createPostCard(post) {
  const postDate = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  let content = '';
  
  if (post.type === 'archive') {
    content = post.content || 'View this post to see the content';
  } else {
    content = post.description || 'View this post to see details';
  }
  
  // Truncate content for preview
  const excerpt = content.length > 150 ? content.substring(0, 150) + '...' : content;
  
  return `
    <div class="post-card" data-id="${post.id}" data-type="${post.type}">
      <div class="post-type-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${post.type === 'archive' 
            ? '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>'
            : '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'
          }
        </svg>
        ${post.type === 'archive' ? 'Archive' : 'Collaboration'}
      </div>
      <h3 class="post-title">${post.title}</h3>
      <div class="post-excerpt">${excerpt}</div>
      <div class="post-meta">
        <span>${postDate}</span>
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          ${post.views || 0}
        </span>
      </div>
    </div>
  `;
}

async function loadUserFollowing() {
  if (!profileUser) return;
  
  try {
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
      .eq('follower_id', profileUser.id);
    
    if (error) throw error;
    
    // Extract user data and display
    const followingUsers = followingData?.map(item => item.followed) || [];
    displayFollowingUsers(followingUsers);
    
  } catch (error) {
    console.error('Error loading following:', error);
    throw error;
  }
}

function displayFollowingUsers(users) {
  const tabContentElement = document.getElementById('following-tab');
  if (!tabContentElement) return;
  
  if (users.length === 0) {
    tabContentElement.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
          <path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <h3>Not Following Anyone</h3>
        <p>This user isn't following anyone yet.</p>
      </div>
    `;
    return;
  }
  
  const usersHTML = `
    <div class="users-grid">
      ${users.map(user => createUserCard(user)).join('')}
    </div>
  `;
  
  tabContentElement.innerHTML = usersHTML;
  
  // Add event listeners
  setupUserCardListeners(tabContentElement);
}

async function loadUserFollowers() {
  if (!profileUser) return;
  
  try {
    // Get users following this profile
    const { data: followersData, error } = await supabase
      .from('user_follows')
      .select(`
        follower_id,
        follower:follower_id (
          id,
          email,
          raw_user_meta_data,
          created_at
        )
      `)
      .eq('followed_id', profileUser.id);
    
    if (error) throw error;
    
    // Extract user data and display
    const followerUsers = followersData?.map(item => item.follower) || [];
    displayFollowerUsers(followerUsers);
    
  } catch (error) {
    console.error('Error loading followers:', error);
    throw error;
  }
}

function displayFollowerUsers(users) {
  const tabContentElement = document.getElementById('followers-tab');
  if (!tabContentElement) return;
  
  if (users.length === 0) {
    tabContentElement.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
          <path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <h3>No Followers Yet</h3>
        <p>This user doesn't have any followers yet.</p>
      </div>
    `;
    return;
  }
  
  const usersHTML = `
    <div class="users-grid">
      ${users.map(user => createUserCard(user)).join('')}
    </div>
  `;
  
  tabContentElement.innerHTML = usersHTML;
  
  // Add event listeners
  setupUserCardListeners(tabContentElement);
}

function createUserCard(user) {
  const displayName = getDisplayName(user);
  const bio = user?.raw_user_meta_data?.bio || 'No bio available';
  const avatarUrl = user?.raw_user_meta_data?.avatar_url || 'https://i.imgur.com/zcLQ3gB.png';
  
  // Skip follow button if it's the current user
  const isCurrentUser = currentUser && currentUser.id === user.id;
  const isViewingSelf = profileUser && profileUser.id === currentUser?.id;
  
  return `
    <div class="user-card" data-user-id="${user.id}">
      <div class="user-avatar">
        <img src="${avatarUrl}" alt="${displayName}">
      </div>
      <div class="user-info">
        <h3 class="user-name">${displayName}</h3>
        <div class="user-bio">${bio}</div>
      </div>
      ${(!isCurrentUser && currentUser) ? `
        <button class="user-follow-btn" data-user-id="${user.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
        </button>
      ` : ''}
    </div>
  `;
}

function setupUserCardListeners(container) {
  // User card click handler (navigate to profile)
  const userCards = container.querySelectorAll('.user-card');
  userCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't navigate if clicking on follow button
      if (e.target.closest('.user-follow-btn')) return;
      
      const userId = card.dataset.userId;
      window.location.href = `/public-profile.html?id=${userId}`;
    });
  });
  
  // Follow button click handler
  const followButtons = container.querySelectorAll('.user-follow-btn');
  followButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      if (!currentUser) {
        alert('Please sign in to follow users.');
        window.location.href = '/login.html';
        return;
      }
      
      const userId = button.dataset.userId;
      await toggleFollowUser(userId, button);
    });
    
    // Check follow status for each button
    const userId = button.dataset.userId;
    checkUserFollowStatus(userId, button);
  });
}

async function checkUserFollowStatus(userId, buttonElement) {
  if (!currentUser) return;
  
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('followed_id', userId)
      .single();
    
    const isFollowing = !!data;
    
    // Update button appearance
    if (isFollowing) {
      buttonElement.classList.add('following');
      buttonElement.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <polyline points="17 11 19 13 23 9"/>
        </svg>
      `;
    }
    
  } catch (error) {
    console.error('Error checking follow status:', error);
  }
}

async function toggleFollowUser(userId, buttonElement) {
  if (!currentUser) return;
  
  try {
    // Check if already following
    const { data: existingFollow, error: checkError } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('followed_id', userId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (existingFollow) {
      // Unfollow
      const { error: unfollowError } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('followed_id', userId);
      
      if (unfollowError) throw unfollowError;
      
      buttonElement.classList.remove('following');
      buttonElement.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
      `;
      
      // If we're viewing this user's profile, update follow status and count
      if (profileUser && profileUser.id === userId) {
        isFollowing = false;
        followersCount--;
        updateFollowButton();
        updateFollowCounts();
      }
      
      showNotification('You unfollowed this user.', 'success');
      
    } else {
      // Follow
      const { error: followError } = await supabase
        .from('user_follows')
        .insert({
          follower_id: currentUser.id,
          followed_id: userId
        });
      
      if (followError) throw followError;
      
      buttonElement.classList.add('following');
      buttonElement.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <polyline points="17 11 19 13 23 9"/>
        </svg>
      `;
      
      // If we're viewing this user's profile, update follow status and count
      if (profileUser && profileUser.id === userId) {
        isFollowing = true;
        followersCount++;
        updateFollowButton();
        updateFollowCounts();
      }
      
      showNotification('You are now following this user.', 'success');
    }
    
  } catch (error) {
    console.error('Error toggling follow status:', error);
    showNotification('Failed to update follow status. Please try again.', 'error');
  }
}

async function handleFollowToggle() {
  if (!currentUser || !profileUser) {
    alert('Please sign in to follow users.');
    window.location.href = '/login.html';
    return;
  }
  
  const followButton = document.getElementById('follow-button');
  if (!followButton) return;
  
  try {
    // Disable button during operation
    followButton.disabled = true;
    
    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('followed_id', profileUser.id);
      
      if (error) throw error;
      
      isFollowing = false;
      followersCount--;
      showNotification('You unfollowed this user.', 'success');
      
    } else {
      // Follow
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: currentUser.id,
          followed_id: profileUser.id
        });
      
      if (error) throw error;
      
      isFollowing = true;
      followersCount++;
      showNotification('You are now following this user.', 'success');
    }
    
    // Update UI
    updateFollowButton();
    updateFollowCounts();
    
  } catch (error) {
    console.error('Error toggling follow:', error);
    showNotification('Failed to update follow status. Please try again.', 'error');
  } finally {
    followButton.disabled = false;
  }
}

function openFollowersModal() {
  if (!profileUser || followersCount === 0) return;
  
  const modal = document.getElementById('followers-modal');
  const modalBody = document.getElementById('followers-modal-body');
  
  if (!modal || !modalBody) return;
  
  // Show loading state
  modalBody.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading followers...</p>
    </div>
  `;
  
  // Show modal
  modal.classList.add('active');
  
  // Load followers data
  loadModalFollowers(modalBody);
}

async function loadModalFollowers(container) {
  try {
    // Get users following this profile
    const { data: followersData, error } = await supabase
      .from('user_follows')
      .select(`
        follower_id,
        follower:follower_id (
          id,
          email,
          raw_user_meta_data,
          created_at
        )
      `)
      .eq('followed_id', profileUser.id);
    
    if (error) throw error;
    
    // Extract user data
    const followerUsers = followersData?.map(item => item.follower) || [];
    
    if (followerUsers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No followers yet.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="users-grid">
        ${followerUsers.map(user => createUserCard(user)).join('')}
      </div>
    `;
    
    // Setup listeners
    setupUserCardListeners(container);
    
  } catch (error) {
    console.error('Error loading followers:', error);
    container.innerHTML = `
      <div class="empty-state">
        <p>Error loading followers. Please try again.</p>
      </div>
    `;
  }
}

function openFollowingModal() {
  if (!profileUser || followingCount === 0) return;
  
  const modal = document.getElementById('following-modal');
  const modalBody = document.getElementById('following-modal-body');
  
  if (!modal || !modalBody) return;
  
  // Show loading state
  modalBody.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading following...</p>
    </div>
  `;
  
  // Show modal
  modal.classList.add('active');
  
  // Load following data
  loadModalFollowing(modalBody);
}

async function loadModalFollowing(container) {
  try {
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
      .eq('follower_id', profileUser.id);
    
    if (error) throw error;
    
    // Extract user data
    const followingUsers = followingData?.map(item => item.followed) || [];
    
    if (followingUsers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Not following anyone yet.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="users-grid">
        ${followingUsers.map(user => createUserCard(user)).join('')}
      </div>
    `;
    
    // Setup listeners
    setupUserCardListeners(container);
    
  } catch (error) {
    console.error('Error loading following:', error);
    container.innerHTML = `
      <div class="empty-state">
        <p>Error loading following users. Please try again.</p>
      </div>
    `;
  }
}

function closeModals() {
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(modal => {
    modal.classList.remove('active');
  });
}

function showError(message) {
  const container = document.querySelector('.profile-container');
  if (container) {
    container.innerHTML = `
      <div class="error-state" style="margin-top: 100px;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="1">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12" y2="16"/>
        </svg>
        <h2 style="color: #dc3545;">Error Loading Profile</h2>
        <p>${message}</p>
        <a href="/" class="back-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          Go to Home
        </a>
      </div>
    `;
  }
}

function showNotification(message, type = 'info') {
  // Check if a notification already exists and remove it
  const existingNotification = document.querySelector('.profile-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `profile-notification ${type}`;
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