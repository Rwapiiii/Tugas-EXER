const SUPABASE_URL = 'https://ekfjbcowweliqnthgjcp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MoyHP5HCLpcd_KlDuPeC6A_en_-YXEQ';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function registerUserSupabase(username, email, password) {
    try {
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (authError) {
            throw new Error(authError.message);
        }

        const { data, error } = await supabaseClient
            .from('users')
            .insert([
                {
                    id: authData.user.id,
                    username: username,
                    email: email,
                    full_name: username,
                    avatar_url: `https://via.placeholder.com/100/${getRandomColor()}/${getRandomColor()}?text=${username.substring(0, 2).toUpperCase()}`,
                    bio: 'Welcome to my profile!',
                    followers: 0,
                    following: 0,
                    created_at: new Date()
                }
            ]);

        if (error) {
            throw new Error(error.message);
        }

        return { success: true, data: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loginUserSupabase(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw new Error(error.message);
        }

        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (userError) {
            throw new Error(userError.message);
        }

        return { success: true, user: userData, authUser: data.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function logoutUserSupabase() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            throw new Error(error.message);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserProfile(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return { success: true, user: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateUserProfile(userId, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (error) {
            throw new Error(error.message);
        }

        return { success: true, data: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getAllUsers() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*');

        if (error) {
            throw new Error(error.message);
        }

        return { success: true, users: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function createPost(userId, content) {
    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .insert([
                {
                    user_id: userId,
                    content: content,
                    created_at: new Date()
                }
            ]);

        if (error) {
            throw new Error(error.message);
        }

        return { success: true, post: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getPosts() {
    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*, users(id, username, avatar_url, full_name)')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return { success: true, posts: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserPosts(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return { success: true, posts: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deletePost(postId) {
    try {
        const { error } = await supabaseClient
            .from('posts')
            .delete()
            .eq('id', postId);

        if (error) {
            throw new Error(error.message);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function likePost(postId, userId) {
    try {
        const { data, error } = await supabaseClient
            .from('likes')
            .insert([
                {
                    post_id: postId,
                    user_id: userId
                }
            ]);

        if (error) {
            throw new Error(error.message);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function unlikePost(postId, userId) {
    try {
        const { error } = await supabaseClient
            .from('likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId);

        if (error) {
            throw new Error(error.message);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function addComment(postId, userId, content) {
    try {
        const { data, error } = await supabaseClient
            .from('comments')
            .insert([
                {
                    post_id: postId,
                    user_id: userId,
                    content: content,
                    created_at: new Date()
                }
            ]);

        if (error) {
            throw new Error(error.message);
        }

        return { success: true, comment: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getPostComments(postId) {
    try {
        const { data, error } = await supabaseClient
            .from('comments')
            .select('*, users(id, username, avatar_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return { success: true, comments: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function followUser(followerId, followingId) {
    try {
        const { data, error } = await supabaseClient
            .from('follows')
            .insert([
                {
                    follower_id: followerId,
                    following_id: followingId
                }
            ]);

        if (error) {
            throw new Error(error.message);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function unfollowUser(followerId, followingId) {
    try {
        const { error } = await supabaseClient
            .from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', followingId);

        if (error) {
            throw new Error(error.message);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getRandomColor() {
    const colors = ['3b82f6', '22c55e', 'f59e0b', 'ec4899', '8b5cf6'];
    return colors[Math.floor(Math.random() * colors.length)];
}
