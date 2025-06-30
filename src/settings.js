import { initMenu } from './utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './utils/activityTracker.js';
import { restrictAllDateInputs } from './utils/dateRestriction.js';
import supabase from './utils/supabaseClient.js';

let currentUser = null;

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
  
  // Load user data and setup event listeners
  await loadUserData();
  setupEventListeners();
  
  // Load following list
  await loadFollowing();
  
  // Check for hash in URL to set active tab
  const hash = window.location.hash;
  if (hash) {
    const section = hash.substring(1);
    const navLink = document.querySelector(`.settings-nav-link[href="#${section}"]`);
    if (navLink) {
      navLink.click();
    }
  }
});

async function loadUserData() {
  if (!currentUser) return;
  
  try {
    // Get user data from public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (userError) throw userError;
    
    // Populate form fields
    populateFormFields(userData);
    
  } catch (error) {
    console.error('Error loading user data:', error);
    showNotification('Failed to load user data', 'error');
  }
}

function populateFormFields(userData) {
  // Display name
  const displayNameInput = document.getElementById('display-name');
  if (displayNameInput) {
    displayNameInput.value = userData?.raw_user_meta_data?.display_name || '';
  }
  
  // Email (read-only)
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.value = userData?.email || currentUser.email || '';
    emailInput.disabled = true; // Email should not be editable
  }
  
  // Date of birth
  const dobInput = document.getElementById('date-of-birth');
  if (dobInput) {
    dobInput.value = userData?.raw_user_meta_data?.date_of_birth || '';
  }
  
  // Location
  const locationInput = document.getElementById('location');
  if (locationInput) {
    locationInput.value = userData?.raw_user_meta_data?.location || '';
  }
  
  // Website
  const websiteInput = document.getElementById('website');
  if (websiteInput) {
    websiteInput.value = userData?.raw_user_meta_data?.website || '';
  }
  
  // Bio
  const bioInput = document.getElementById('bio');
  if (bioInput) {
    bioInput.value = userData?.raw_user_meta_data?.bio || '';
  }
  
  // Notification preferences
  populateNotificationPreferences(userData?.notification_preferences || {});
}

function populateNotificationPreferences(preferences) {
  // Get default values (true if not specified)
  const newPostEnabled = preferences.new_post !== false;
  const newFollowerEnabled = preferences.new_follower !== false;
  const commentsEnabled = preferences.comments !== false;
  
  // Set checkbox states
  const newPostCheckbox = document.getElementById('new-post-notifications');
  if (newPostCheckbox) {
    newPostCheckbox.checked = newPostEnabled;
  }
  
  const followerCheckbox = document.getElementById('follower-notifications');
  if (followerCheckbox) {
    followerCheckbox.checked = newFollowerEnabled;
  }
  
  const commentCheckbox = document.getElementById('comment-notifications');
  if (commentCheckbox) {
    commentCheckbox.checked = commentsEnabled;
  }
}

function setupEventListeners() {
  // Close button
  const closeBtn = document.getElementById('settings-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.history.back();
    });
  }
  
  // Navigation links
  const navLinks = document.querySelectorAll('.settings-nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Show corresponding section
      const sectionId = link.dataset.section;
      const sections = document.querySelectorAll('.settings-section');
      sections.forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
      });
      
      // Update URL hash
      const hash = link.getAttribute('href');
      window.history.pushState(null, '', hash);
    });
  });
  
  // Profile form submission
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileUpdate);
  }
  
  // Notifications form submission
  const notificationsForm = document.getElementById('notifications-form');
  if (notificationsForm) {
    notificationsForm.addEventListener('submit', handleNotificationsUpdate);
  }
  
  // Delete account functionality
  const deleteConfirmationInput = document.getElementById('delete-confirmation');
  const deleteAccountBtn = document.getElementById('delete-account');
  
  if (deleteConfirmationInput && deleteAccountBtn) {
    deleteConfirmationInput.addEventListener('input', () => {
      const isValid = deleteConfirmationInput.value === 'DELETE MY ACCOUNT';
      deleteAccountBtn.disabled = !isValid;
    });
    
    deleteAccountBtn.addEventListener('click', handleAccountDeletion);
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  
  if (!currentUser) return;
  
  const submitBtn = e.target.querySelector('.submit-button');
  const originalText = submitBtn.textContent;
  
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    // Collect form data
    const displayName = document.getElementById('display-name').value.trim();
    const dateOfBirth = document.getElementById('date-of-birth').value;
    const location = document.getElementById('location').value.trim();
    const website = document.getElementById('website').value.trim();
    const bio = document.getElementById('bio').value.trim();
    
    // Get current user metadata
    const { data: currentUserData } = await supabase
      .from('users')
      .select('raw_user_meta_data')
      .eq('id', currentUser.id)
      .single();
    
    const currentMetadata = currentUserData?.raw_user_meta_data || {};
    
    // Update user metadata
    const updatedMetadata = {
      ...currentMetadata,
      display_name: displayName,
      date_of_birth: dateOfBirth,
      location: location,
      website: website,
      bio: bio,
      updated_at: new Date().toISOString()
    };
    
    // Update auth user
    const { error: authError } = await supabase.auth.updateUser({
      data: updatedMetadata
    });
    
    if (authError) throw authError;
    
    showNotification('Profile updated successfully!', 'success');
    
  } catch (error) {
    console.error('Error updating profile:', error);
    showNotification('Failed to update profile. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function handleNotificationsUpdate(e) {
  e.preventDefault();
  
  if (!currentUser) return;
  
  const submitBtn = e.target.querySelector('.submit-button');
  const originalText = submitBtn.textContent;
  
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    // Collect notification preferences
    const newPostNotifications = document.getElementById('new-post-notifications').checked;
    const followerNotifications = document.getElementById('follower-notifications').checked;
    const commentNotifications = document.getElementById('comment-notifications').checked;
    
    // Update notification preferences in database
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('notification_preferences')
      .eq('id', currentUser.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const currentPreferences = userData?.notification_preferences || {};
    
    const updatedPreferences = {
      ...currentPreferences,
      new_post: newPostNotifications,
      new_follower: followerNotifications,
      comments: commentNotifications
    };
    
    const { error: updateError } = await supabase
      .from('users')
      .update({
        notification_preferences: updatedPreferences
      })
      .eq('id', currentUser.id);
    
    if (updateError) throw updateError;
    
    showNotification('Notification preferences updated!', 'success');
    
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    showNotification('Failed to update preferences. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function loadFollowing() {
  if (!currentUser) return;
  
  const followingList = document.getElementById('following-list');
  if (!followingList) return;
  
  try {
    // Get users that the current user is following
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
    
    const followedUsers = followingData?.map(item => item.followed) || [];
    
    if (followedUsers.length === 0) {
      followingList.innerHTML = `
        <div class="empty-subscriptions">
          You are not following anyone yet. Find interesting users to follow in the community!
        </div>
      `;
      return;
    }
    
    // Create HTML for each followed user
    const followingHTML = followedUsers.map(user => {
      const displayName = user?.raw_user_meta_data?.display_name || 
                         user?.raw_user_meta_data?.full_name || 
                         user?.email?.split('@')[0] || 
                         'User';
      
      const avatarUrl = user?.raw_user_meta_data?.avatar_url || 'https://i.imgur.com/zcLQ3gB.png';
      
      const followDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      return `
        <div class="subscription-item" data-user-id="${user.id}">
          <div class="subscription-avatar">
            <img src="${avatarUrl}" alt="${displayName}">
          </div>
          <div class="subscription-info">
            <div class="subscription-name">${displayName}</div>
            <div class="subscription-meta">Following since ${followDate}</div>
          </div>
          <button class="unsubscribe-btn" data-user-id="${user.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="18" y1="8" x2="23" y2="13"/>
              <line x1="23" y1="8" x2="18" y2="13"/>
            </svg>
            Unfollow
          </button>
        </div>
      `;
    }).join('');
    
    followingList.innerHTML = followingHTML;
    
    // Add event listeners for unsubscribe buttons
    const unsubscribeButtons = followingList.querySelectorAll('.unsubscribe-btn');
    unsubscribeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        handleUnfollow(button.dataset.userId);
      });
    });
    
    // Add event listeners for user items (navigate to profile)
    const userItems = followingList.querySelectorAll('.subscription-item');
    userItems.forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.unsubscribe-btn')) {
          window.location.href = `/public-profile.html?id=${item.dataset.userId}`;
        }
      });
    });
    
  } catch (error) {
    console.error('Error loading following:', error);
    followingList.innerHTML = `
      <div class="empty-subscriptions" style="color: #dc3545;">
        Failed to load following list. Please try again later.
      </div>
    `;
  }
}

async function handleUnfollow(userId) {
  if (!currentUser || !userId) return;
  
  if (!confirm('Are you sure you want to unfollow this user?')) {
    return;
  }
  
  try {
    // Delete the follow relationship
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', currentUser.id)
      .eq('followed_id', userId);
    
    if (error) throw error;
    
    // Remove item from UI
    const item = document.querySelector(`.subscription-item[data-user-id="${userId}"]`);
    if (item) {
      item.style.height = '0';
      item.style.opacity = '0';
      item.style.marginBottom = '0';
      item.style.overflow = 'hidden';
      
      setTimeout(() => {
        item.remove();
        
        // Check if list is now empty
        const list = document.getElementById('following-list');
        if (list && !list.querySelector('.subscription-item')) {
          list.innerHTML = `
            <div class="empty-subscriptions">
              You are not following anyone yet. Find interesting users to follow in the community!
            </div>
          `;
        }
      }, 300);
    }
    
    showNotification('Successfully unfollowed user.', 'success');
    
  } catch (error) {
    console.error('Error unfollowing user:', error);
    showNotification('Failed to unfollow user. Please try again.', 'error');
  }
}

async function handleAccountDeletion() {
  if (!currentUser) return;
  
  const confirmationInput = document.getElementById('delete-confirmation');
  if (confirmationInput.value !== 'DELETE MY ACCOUNT') {
    showNotification('Please type "DELETE MY ACCOUNT" to confirm', 'error');
    return;
  }
  
  // Final confirmation
  const finalConfirm = confirm(
    'Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently delete all your posts, favorites, and account data.'
  );
  
  if (!finalConfirm) return;
  
  const deleteBtn = document.getElementById('delete-account');
  const originalText = deleteBtn.textContent;
  
  try {
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';
    
    // Call the delete_user function
    const { error } = await supabase.rpc('delete_user');
    
    if (error) throw error;
    
    showNotification('Account deleted successfully. You will be redirected shortly.', 'success');
    
    // Sign out and redirect after a delay
    setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.href = '/';
    }, 2000);
    
  } catch (error) {
    console.error('Error deleting account:', error);
    showNotification('Failed to delete account. Please try again or contact support.', 'error');
    
    deleteBtn.disabled = false;
    deleteBtn.textContent = originalText;
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