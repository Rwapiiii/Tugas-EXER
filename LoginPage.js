
document.addEventListener('DOMContentLoaded', () => {
    setupFormListeners();
});

function setupFormListeners() {
    const form = document.querySelector('form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const forgotLink = document.querySelector('.forgot-password');

    if (form) form.addEventListener('submit', handleFormSubmit);
    if (forgotLink) forgotLink.addEventListener('click', handleForgotPassword);

    usernameInput.addEventListener('blur', validateUsernameField);
    passwordInput.addEventListener('blur', validatePasswordField);

    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('focus', () => input.parentElement.classList.add('focused'));
        input.addEventListener('blur', () => input.parentElement.classList.remove('focused'));
    });
}

function validateUsernameField() {
    const username = document.getElementById('username').value.trim();

    if (username.length === 0) {
        showFieldError(document.getElementById('username'), 'Username is required');
        return false;
    }

    if (username.length < 3) {
        showFieldError(document.getElementById('username'), 'Username must be at least 3 characters');
        return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showFieldError(document.getElementById('username'), 'Username can only contain letters, numbers, and underscores');
        return false;
    }

    clearFieldError(document.getElementById('username'));
    return true;
}

function validatePasswordField() {
    const password = document.getElementById('password').value;

    if (password.length === 0) {
        showFieldError(document.getElementById('password'), 'Password is required');
        return false;
    }

    if (password.length < 6) {
        showFieldError(document.getElementById('password'), 'Password must be at least 6 characters');
        return false;
    }

    clearFieldError(document.getElementById('password'));
    return true;
}

function showFieldError(element, message) {
    clearFieldError(element);
    element.style.borderColor = '#ef4444';
    element.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.3)';

    const errorDiv = document.createElement('div');
    errorDiv.id = `${element.id}-error`;
    errorDiv.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 5px;';
    errorDiv.textContent = message;

    element.parentElement.appendChild(errorDiv);
}

function clearFieldError(element) {
    element.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    element.style.boxShadow = 'none';

    const error = document.getElementById(`${element.id}-error`);
    if (error) error.remove();
}

function handleFormSubmit(event) {
    event.preventDefault();

    if (!validateUsernameField() || !validatePasswordField()) return;

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    performLogin(username, password);
}

async function performLogin(username, password) {
    try {
        const btn = document.querySelector('.login-btn');
        btn.disabled = true;
        btn.textContent = 'Logging in...';

        const { data: users, error: userError } = await supabaseClient
            .from('users')
            .select('email')
            .eq('username', username);

        if (userError) throw new Error(userError.message);
        if (!users || users.length === 0) {
            showFieldError(document.getElementById('username'), 'User not found');
            btn.disabled = false;
            btn.textContent = 'Login';
            return;
        }

        const email = users[0].email;

        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) {
            if (authError.message.includes('Invalid login credentials')) {
                showFieldError(document.getElementById('password'), 'Invalid username or password');
            } else if (authError.message.includes('Email not confirmed')) {
                showNotification('Please verify your email first. Check your email for a verification link.', 'error');
            } else {
                throw new Error(authError.message);
            }
            btn.disabled = false;
            btn.textContent = 'Login';
            return;
        }

        const { data: userProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError) throw new Error(profileError.message);

        localStorage.setItem('currentUser', JSON.stringify(userProfile));
        localStorage.setItem('supabaseUser', JSON.stringify(authData.user));

        showNotification('Login successful! Redirecting...', 'success');

        setTimeout(() => {
            window.location.href = 'Dashboard.html';
        }, 1500);
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message, 'error');
        document.querySelector('.login-btn').disabled = false;
        document.querySelector('.login-btn').textContent = 'Login';
    }
}

function handleForgotPassword(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();

    if (!username) {
        alert('Please enter your username');
        return;
    }

    alert('Password reset functionality coming soon');
}

function showNotification(message, type = 'info') {
    const div = document.createElement('div');

    const colors = {
        success: 'linear-gradient(90deg, #22c55e, #16a34a)',
        error: 'linear-gradient(90deg, #ef4444, #dc2626)',
        info: 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
    };

    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 2000;
        animation: slideIn 0.3s ease forwards;
    `;
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => div.remove(), 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);
