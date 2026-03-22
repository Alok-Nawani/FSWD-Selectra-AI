import { initNavigation } from './modules/navigation.js';
import { initInterview } from './modules/interview.js';
import { ensureAuth, logout } from './modules/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('TM1: Home & Interview Bootstrapping...');

    const user = ensureAuth();
    if (!user) return;

    initNavigation();
    initInterview();

    // Logout Handler
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
});
