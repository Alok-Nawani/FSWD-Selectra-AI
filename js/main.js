import { initLearning } from './modules/learning.js';
import { initNavigation } from './modules/navigation.js';
import { initResume } from './modules/resume.js';
import { initInterview } from './modules/interview.js';
import { initArena } from './modules/arena.js';
import CONFIG from './config.js';
import { ensureAuth, logout } from './modules/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Selectra AI App Bootstrapping...');

    // Load remote config before initializing modules to ensure API keys are available
    await CONFIG.loadRemoteConfig();

    const user = ensureAuth();
    if (!user) return;

    initNavigation();
    initLearning();
    initResume();
    initInterview();
    initArena();

    // Logout Handler
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
});
