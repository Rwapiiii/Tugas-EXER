
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let allUsers = [];
let allPosts = [];
let viewingUser = null;
let viewingPost = null;

if (!currentUser) {
    window.location.href = 'LoginPage.html';
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadAllData();
});

function setupEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToSection(link.dataset.section);
        });
    });

    document.getElementById('postInput').addEventListener('input', updateCharCount);
    document.getElementById('postBtn').addEventListener('click', createPost);

    document.getElementById('editProfileBtn').addEventListener('click', openProfileEditModal);
    document.getElementById('editProfileBtn2').addEventListener('click', openProfileEditModal);
    document.getElementById('closeEditModal').addEventListener('click', closeProfileEditModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeProfileEditModal);
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfileChanges);

    document.getElementById('closeUserModal').addEventListener('click', closeUserProfileModal);
    document.getElementById('followUnfollowBtn').addEventListener('click', toggleFollowUser);

    document.getElementById('closePostModal').addEventListener('click', closePostDetailModal);
    document.getElementById('submitCommentBtn').addEventListener('click', submitNewComment);

    document.getElementById('searchBtn').addEventListener('click', performUserSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performUserSearch();
    });

    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
}

async function loadAllData() {
    try {
        const [usersResponse, postsResponse] = await Promise.all([
            supabaseClient.from('users').select('*'),
            supabaseClient
                .from('posts')
                .select('*, users(id, username, avatar_url, full_name)')
                .order('created_at', { ascending: false })
        ]);

        if (usersResponse.error) throw new Error(usersResponse.error.message);
        if (postsResponse.error) throw new Error(postsResponse.error.message);

        allUsers = usersResponse.data || [];

        allPosts = await enrichPostsWithCounts(postsResponse.data || []);

        updateUIComponents();
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorNotification(error.message);
    }
}

async function enrichPostsWithCounts(posts) {
    return await Promise.all(
        posts.map(async (post) => {
            const likeCount = await getPostLikeCount(post.id);
            const commentCount = await getPostCommentCount(post.id);

            return {
                ...post,
                like_count: likeCount,
                comment_count: commentCount
            };
        })
    );
}

async function getPostLikeCount(postId) {
    const { count } = await supabaseClient
        .from('likes')
        .select('*', { count: 'exact' })
        .eq('post_id', postId);
    return count || 0;
}

async function getPostCommentCount(postId) {
    const { count } = await supabaseClient
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('post_id', postId);
    return count || 0;
}

function navigateToSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

    document.getElementById(`${section}-section`).classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === section);
    });

    if (section === 'profile') displayUserProfile(currentUser);
    else if (section === 'explore') displayTrendingUsers();
    else if (section === 'notifications') displayNotifications();
}

function createPost() {
    const content = document.getElementById('postInput').value.trim();

    if (!content) {
        alert('Please write something before posting!');
        return;
    }

    submitPostToSupabase(content);
}

async function submitPostToSupabase(content) {
    try {
        const btn = document.getElementById('postBtn');
        btn.disabled = true;
        btn.textContent = 'Posting...';

        const { error } = await supabaseClient
            .from('posts')
            .insert([
                {
                    user_id: currentUser.id,
                    content: content
                }
            ]);

        if (error) throw new Error(error.message);

        document.getElementById('postInput').value = '';
        updateCharCount();
        showSuccessNotification('Post created successfully!');
        loadAllData();

        btn.disabled = false;
        btn.textContent = 'Post';
    } catch (error) {
        console.error('Error creating post:', error);
        showErrorNotification(error.message);
        document.getElementById('postBtn').disabled = false;
        document.getElementById('postBtn').textContent = 'Post';
    }
}

function displayFeed() {
    const feed = document.getElementById('postsFeed');
    feed.innerHTML = '';

    if (allPosts.length === 0) {
        feed.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><p>No posts yet. Be the first to post!</p></div>';
        return;
    }

    allPosts.forEach(post => {
        const postElement = buildPostElement(post);
        if (postElement) feed.appendChild(postElement);
    });
}

function buildPostElement(post) {
    const user = post.users || currentUser;
    if (!user) return null;

    const isOwnPost = post.user_id === currentUser.id;

    const div = document.createElement('div');
    div.className = 'post';
    div.id = `post-${post.id}`;

    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div class="post-header-info" onclick="viewUserProfile('${user.id}')">
                <img src="${user.avatar_url}" alt="${user.full_name}" class="post-author-avatar">
                <div class="post-author-info">
                    <h4>${user.full_name}</h4>
                    <p>@${user.username} · ${formatTimeAgo(post.created_at)}</p>
                </div>
            </div>
            ${isOwnPost ? `<button class="post-delete-btn" onclick="deletePost('${post.id}')">Delete</button>` : ''}
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-actions-bar">
            <button class="action-btn" onclick="likePost('${post.id}')">
                <span>🤍</span>
                <span class="like-count-${post.id}">${post.like_count || 0}</span>
            </button>
            <button class="action-btn" onclick="openPostDetail('${post.id}')">
                <span>💬</span>
                <span class="comment-count-${post.id}">${post.comment_count || 0}</span>
            </button>
            <button class="action-btn">
                <span>↗️</span>
                <span>0</span>
            </button>
        </div>
    `;

    return div;
}

function updateCharCount() {
    const input = document.getElementById('postInput');
    document.getElementById('charCount').textContent = `${input.value.length}/500`;
}

async function likePost(postId) {
    try {
        const { data: existingLike } = await supabaseClient
            .from('likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', currentUser.id)
            .single();

        if (existingLike) {
            await supabaseClient
                .from('likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', currentUser.id);
        } else {
            await supabaseClient
                .from('likes')
                .insert([
                    {
                        post_id: postId,
                        user_id: currentUser.id
                    }
                ]);
        }

        const likeCount = await getPostLikeCount(postId);
        const likeElement = document.querySelector(`.like-count-${postId}`);
        if (likeElement) likeElement.textContent = likeCount;
    } catch (error) {
        console.error('Error liking post:', error);
        showErrorNotification(error.message);
    }
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
        const { error } = await supabaseClient
            .from('posts')
            .delete()
            .eq('id', postId);

        if (error) throw new Error(error.message);

        showSuccessNotification('Post deleted successfully');
        loadAllData();
    } catch (error) {
        console.error('Error deleting post:', error);
        showErrorNotification(error.message);
    }
}

async function openPostDetail(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    viewingPost = post;

    const user = post.users || currentUser;
    const modal = document.getElementById('postDetailModal');
    const content = document.getElementById('postDetailContent');

    content.innerHTML = `
        <div class="post-detail-author">
            <img src="${user.avatar_url}" alt="${user.full_name}">
            <div class="post-detail-author-info">
                <h4>${user.full_name}</h4>
                <p>@${user.username}</p>
            </div>
        </div>
        <div class="post-detail-text">${escapeHtml(post.content)}</div>
        <div class="post-detail-stats">
            <span>${post.like_count || 0} Likes</span>
            <span>${post.comment_count || 0} Comments</span>
            <span>${formatTimeAgo(post.created_at)}</span>
        </div>
    `;

    await loadAndDisplayComments(postId);

    document.getElementById('commentInput').value = '';
    modal.classList.add('active');
}

async function loadAndDisplayComments(postId) {
    try {
        const { data: comments, error } = await supabaseClient
            .from('comments')
            .select('*, users(id, username, avatar_url, full_name)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);

        const commentsList = document.getElementById('commentsList');

        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<p style="text-align: center; color: #94a3b8;">No comments yet. Be the first!</p>';
            return;
        }

        commentsList.innerHTML = comments
            .map(comment => buildCommentElement(comment))
            .join('');
    } catch (error) {
        console.error('Error loading comments:', error);
        document.getElementById('commentsList').innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading comments</p>';
    }
}

function buildCommentElement(comment) {
    return `
        <div class="comment" style="padding: 12px; background: #1e293b; border-radius: 8px; margin-bottom: 10px;">
            <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                <img src="${comment.users.avatar_url}" alt="${comment.users.full_name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${comment.users.full_name}</div>
                    <div style="font-size: 13px; color: #64748b;">@${comment.users.username} · ${formatTimeAgo(comment.created_at)}</div>
                </div>
            </div>
            <div style="color: #e2e8f0;">${escapeHtml(comment.content)}</div>
        </div>
    `;
}

function submitNewComment() {
    const input = document.getElementById('commentInput');
    const content = input.value.trim();

    if (!content) {
        alert('Please write a comment!');
        return;
    }

    if (!viewingPost) return;

    addCommentToPost(viewingPost.id, content);
    input.value = '';
}

async function addCommentToPost(postId, content) {
    try {
        const { error } = await supabaseClient
            .from('comments')
            .insert([
                {
                    post_id: postId,
                    user_id: currentUser.id,
                    content: content
                }
            ]);

        if (error) throw new Error(error.message);

        showSuccessNotification('Comment added successfully!');

        const newCount = await getPostCommentCount(postId);
        const countElement = document.querySelector(`.comment-count-${postId}`);
        if (countElement) countElement.textContent = newCount;

        await openPostDetail(postId);
    } catch (error) {
        console.error('Error adding comment:', error);
        showErrorNotification(error.message);
    }
}

function closePostDetailModal() {
    document.getElementById('postDetailModal').classList.remove('active');
    viewingPost = null;
}

function displayUserProfile(user) {
    document.getElementById('profileName').textContent = user.full_name;
    document.getElementById('profileHandle').textContent = `@${user.username}`;
    document.getElementById('profileBio').textContent = user.bio || 'No bio yet';
    document.getElementById('profileAvatar').src = user.avatar_url;

    const userPosts = allPosts.filter(p => p.user_id === user.id);
    document.getElementById('profilePostsCount').textContent = userPosts.length;
    document.getElementById('profileFollowersCount').textContent = user.followers || 0;
    document.getElementById('profileFollowingCount').textContent = user.following || 0;

    const feed = document.getElementById('myPostsFeed');
    feed.innerHTML = '';

    if (userPosts.length === 0) {
        feed.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><p>No posts yet</p></div>';
        return;
    }

    userPosts.forEach(post => {
        const element = buildPostElement(post);
        if (element) feed.appendChild(element);
    });
}

function openProfileEditModal() {
    document.getElementById('editName').value = currentUser.full_name || '';
    document.getElementById('editHandle').value = currentUser.username || '';
    document.getElementById('editBio').value = currentUser.bio || '';
    document.getElementById('editAvatar').value = currentUser.avatar_url || '';
    document.getElementById('editProfileModal').classList.add('active');
}

function closeProfileEditModal() {
    document.getElementById('editProfileModal').classList.remove('active');
}

function saveProfileChanges() {
    const updates = {
        full_name: document.getElementById('editName').value.trim(),
        username: document.getElementById('editHandle').value.trim(),
        bio: document.getElementById('editBio').value.trim(),
        avatar_url: document.getElementById('editAvatar').value.trim()
    };

    if (!updates.full_name || !updates.username) {
        alert('Please fill in all required fields');
        return;
    }

    updateProfileInSupabase(updates);
}

async function updateProfileInSupabase(updates) {
    try {
        const { error } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', currentUser.id);

        if (error) throw new Error(error.message);

        Object.assign(currentUser, updates);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showSuccessNotification('Profile updated successfully');
        closeProfileEditModal();
        updateUIComponents();
    } catch (error) {
        console.error('Error updating profile:', error);
        showErrorNotification(error.message);
    }
}

async function viewUserProfile(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    viewingUser = user;

    const modal = document.getElementById('userProfileModal');
    document.getElementById('modalUserName').textContent = user.full_name;
    document.getElementById('modalUserHandle').textContent = `@${user.username}`;
    document.getElementById('modalUserBio').textContent = user.bio || 'No bio yet';
    document.getElementById('modalUserAvatar').src = user.avatar_url;
    document.getElementById('modalUserFollowers').textContent = `${user.followers || 0} Followers`;
    document.getElementById('modalUserFollowing').textContent = `${user.following || 0} Following`;

    const userPosts = allPosts.filter(p => p.user_id === user.id);
    document.getElementById('modalUserPostsCount').textContent = `${userPosts.length} Posts`;

    await updateFollowButton(user.id);

    const postsDiv = document.getElementById('modalUserPostsFeed');
    postsDiv.innerHTML = '';

    if (userPosts.length === 0) {
        postsDiv.innerHTML = '<div class="empty-state"><p>No posts yet</p></div>';
    } else {
        userPosts.forEach(post => {
            const element = buildPostElement(post);
            if (element) postsDiv.appendChild(element);
        });
    }

    modal.classList.add('active');
}

async function updateFollowButton(userId) {
    try {
        const { data: followStatus } = await supabaseClient
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', userId);

        const btn = document.getElementById('followUnfollowBtn');

        if (followStatus && followStatus.length > 0) {
            btn.textContent = 'Unfollow';
            btn.classList.add('following');
        } else {
            btn.textContent = 'Follow';
            btn.classList.remove('following');
        }
    } catch (error) {
        const btn = document.getElementById('followUnfollowBtn');
        btn.textContent = 'Follow';
        btn.classList.remove('following');
    }
}

function closeUserProfileModal() {
    document.getElementById('userProfileModal').classList.remove('active');
    viewingUser = null;
}

async function toggleFollowUser() {
    if (!viewingUser) return;

    try {
        const { data: existingFollows } = await supabaseClient
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', viewingUser.id);

        const isFollowing = existingFollows && existingFollows.length > 0;

        if (isFollowing) {
            await supabaseClient
                .from('follows')
                .delete()
                .eq('follower_id', currentUser.id)
                .eq('following_id', viewingUser.id);
            showSuccessNotification(`You unfollowed @${viewingUser.username}`);
        } else {
            await supabaseClient
                .from('follows')
                .insert([
                    {
                        follower_id: currentUser.id,
                        following_id: viewingUser.id
                    }
                ]);
            showSuccessNotification(`You followed @${viewingUser.username}`);
        }

        await viewUserProfile(viewingUser.id);
        loadAllData();
    } catch (error) {
        console.error('Error toggling follow:', error);
        showErrorNotification(error.message);
    }
}

function displayTrendingUsers() {
    const container = document.querySelector('#trendingUsers .users-grid');
    if (!container) return;

    container.innerHTML = '';

    allUsers
        .filter(user => user.id !== currentUser.id)
        .slice(0, 10)
        .forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card-search';
            userCard.innerHTML = `
                <img src="${user.avatar_url}" alt="${user.full_name}">
                <h3>${user.full_name}</h3>
                <p>@${user.username}</p>
                <button class="follow-btn" onclick="viewUserProfile('${user.id}')">View Profile</button>
            `;
            container.appendChild(userCard);
        });
}

function performUserSearch() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();

    if (!query) {
        alert('Please enter a search term');
        return;
    }

    const results = allUsers.filter(user =>
        user.username.toLowerCase().includes(query) ||
        user.full_name.toLowerCase().includes(query)
    );

    displaySearchResults(results);
}

function displaySearchResults(users) {
    const container = document.querySelector('.search-results');
    if (!container) return;

    container.innerHTML = '';

    if (users.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8;">No users found</p>';
        return;
    }

    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card-search';
        userCard.innerHTML = `
            <img src="${user.avatar_url}" alt="${user.full_name}">
            <h3>${user.full_name}</h3>
            <p>@${user.username}</p>
            <button class="follow-btn" onclick="viewUserProfile('${user.id}')">View Profile</button>
        `;
        container.appendChild(userCard);
    });
}

function displayNotifications() {
    const container = document.querySelector('.notifications-list');
    if (!container) return;

    container.innerHTML = '<p style="text-align: center; color: #94a3b8;">No notifications yet</p>';
}

function updateUIComponents() {
    updateSidebar();
    displayFeed();
    displaySuggestedUsers();
}

function updateSidebar() {
    document.getElementById('sidebarUsername').textContent = currentUser.full_name;
    document.getElementById('sidebarHandle').textContent = `@${currentUser.username}`;
    document.getElementById('sidebarAvatar').src = currentUser.avatar_url;
}

function displaySuggestedUsers() {
    const container = document.getElementById('suggestedUsers');
    if (!container) return;

    container.innerHTML = '';

    allUsers
        .filter(user => user.id !== currentUser.id)
        .slice(0, 5)
        .forEach(user => {
            const div = document.createElement('div');
            div.className = 'suggested-user';
            div.innerHTML = `
                <img src="${user.avatar_url}" alt="${user.full_name}">
                <div class="suggested-user-info">
                    <h4>${user.full_name}</h4>
                    <p>@${user.username}</p>
                </div>
                <button class="suggest-follow-btn" onclick="viewUserProfile('${user.id}')">View</button>
            `;
            container.appendChild(div);
        });
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'unknown';

    const utcDate = new Date(timestamp);
    const localDate = new Date(
        utcDate.getTime() - utcDate.getTimezoneOffset() * 60000
    );

    const now = new Date();
    const diffMs = now - localDate;

    if (diffMs < 0) return 'just now';

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffSecs < 30) return 'just now';
    if (diffMins < 1) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return localDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}


function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
}

function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(90deg, #22c55e, #16a34a);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        z-index: 2000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}

function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(90deg, #ef4444, #dc2626);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        z-index: 2000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}

function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('supabaseUser');
        window.location.href = 'LoginPage.html';
    }
}
