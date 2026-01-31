
document.addEventListener('DOMContentLoaded', () => {
    setupFormListeners();
});

function setupFormListeners() {
    const form = document.querySelector('form');
    const fields = [
        document.getElementById('username'),
        document.getElementById('email'),
        document.getElementById('password'),
        document.getElementById('confirm-password')
    ];

    if (form) form.addEventListener('submit', handleFormSubmit);

    fields.forEach(field => {
        field.addEventListener('blur', () => validateField(field));
        field.addEventListener('input', () => {
            if (field.id === 'password') showPasswordStrength();
        });
        field.addEventListener('focus', () => field.parentElement.classList.add('focused'));
        field.addEventListener('blur', () => field.parentElement.classList.remove('focused'));
    });
}

function validateField(element) {
    switch (element.id) {
        case 'username':
            return validateUsernameField();
        case 'email':
            return validateEmailField();
        case 'password':
            return validatePasswordField();
        case 'confirm-password':
            return validateConfirmPasswordField();
        default:
            return true;
    }
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

function validateEmailField() {
    const email = document.getElementById('email').value.trim();

    if (email.length === 0) {
        showFieldError(document.getElementById('email'), 'Email is required');
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showFieldError(document.getElementById('email'), 'Please enter a valid email');
        return false;
    }

    clearFieldError(document.getElementById('email'));
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

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
        showFieldError(document.getElementById('password'), 'Password must contain uppercase, lowercase, and numbers');
        return false;
    }

    clearFieldError(document.getElementById('password'));
    return true;
}

function validateConfirmPasswordField() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (confirmPassword.length === 0) {
        showFieldError(document.getElementById('confirm-password'), 'Please confirm your password');
        return false;
    }

    if (password !== confirmPassword) {
        showFieldError(document.getElementById('confirm-password'), 'Passwords do not match');
        return false;
    }

    clearFieldError(document.getElementById('confirm-password'));
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

function showPasswordStrength() {
    const password = document.getElementById('password').value;
    let strength = 0;

    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

    const strengthTexts = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const strengthColors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#16a34a'];

    let indicator = document.getElementById('password-strength');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'password-strength';
        indicator.style.cssText = 'font-size: 12px; margin-top: 5px;';
        document.getElementById('password').parentElement.appendChild(indicator);
    }

    indicator.textContent = `Strength: ${strengthTexts[strength]}`;
    indicator.style.color = strengthColors[strength];
}

function handleFormSubmit(event) {
    event.preventDefault();

    const allValid = [
        validateUsernameField(),
        validateEmailField(),
        validatePasswordField(),
        validateConfirmPasswordField()
    ].every(v => v);

    if (!allValid) return;

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    performRegistration(username, email, password);
}

async function performRegistration(username, email, password) {
    try {
        const btn = document.querySelector('.login-btn');
        btn.disabled = true;
        btn.textContent = 'Registering...';

        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (authError) {
            if (authError.message.includes('rate')) {
                throw new Error('Too many registration attempts. Please wait a few minutes and try again.');
            }
            if (authError.message.includes('already')) {
                throw new Error('Email already registered. Please use a different email or login.');
            }
            throw new Error(authError.message);
        }

        const { error: profileError } = await supabaseClient
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
                    created_at: new Date().toISOString()
                }
            ]);

        if (profileError) throw new Error(profileError.message);

        showNotification('Account created successfully!', 'success');

        setTimeout(() => {
            alert('Registration successful! You can now login with your credentials.');
            window.location.href = 'LoginPage.html';
        }, 1500);
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(error.message, 'error');
        document.querySelector('.login-btn').disabled = false;
        document.querySelector('.login-btn').textContent = 'Register';
    }
}

function getRandomColor() {
    const colors = ['3b82f6', '22c55e', 'f59e0b', 'ec4899', '8b5cf6'];
    return colors[Math.floor(Math.random() * colors.length)];
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

    .input-group.focused input {
        border-color: #4ade80 !important;
        box-shadow: 0 0 10px rgba(74, 222, 128, 0.2) !important;
    }
`;
document.head.appendChild(style);
