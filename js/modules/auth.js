import CONFIG from '../config.js';

export async function login(name, email, password) {
    if (!name || !email || !password) return false;

    const cleanEmail = email.trim().toLowerCase();

    // Verify credentials with backend
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), email: cleanEmail, password: password })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            return false; // Authentication completely failed
        }

        const user = {
            name: name.trim(),
            email: cleanEmail,
            token: data.token || 'simulated-token',
            joinedAt: new Date().toISOString()
        };

        // Store current user session securely locally
        localStorage.setItem('currentUser', JSON.stringify(user));

        const userKey = `progress_${cleanEmail}`;
        if (!localStorage.getItem(userKey)) {
            const initialProgress = {
                interviews: [],
                totalScore: 0,
                modulesCompleted: 0,
                level: 1,
                xp: 0,
                streak: 0,
                lastActivity: new Date().toISOString(),
                courseProgress: {} // { moduleId: videoIndex }
            };
            localStorage.setItem(userKey, JSON.stringify(initialProgress));
        }

        return true;
    } catch (err) {
        console.error("Login verification failed due to network error:", err);
        throw err; // Form handler will alert user of server block
    }
}

export function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

export function getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

export function ensureAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

export function getProgress() {
    const user = getCurrentUser();
    if (!user) return null;

    const userKey = `progress_${user.email.trim().toLowerCase()}`;
    const data = localStorage.getItem(userKey);
    return data ? JSON.parse(data) : {
        interviews: [],
        totalScore: 0,
        modulesCompleted: 0,
        level: 1,
        xp: 0,
        streak: 0,
        lastActivity: null
    };
}

export function saveProgress(newData) {
    const user = getCurrentUser();
    if (!user) return;

    const userKey = `progress_${user.email.trim().toLowerCase()}`;
    const current = getProgress();

    // Merge logic
    const updated = { ...current, ...newData };

    // Auto-level up logic (mock)
    if (updated.xp > updated.level * 1000) {
        updated.level++;
        updated.xp = updated.xp - (updated.level * 1000); // Carry over remainder? Simplified reset for now
    }

    localStorage.setItem(userKey, JSON.stringify(updated));
    return updated;
}

export function addInterviewResult(result) {
    const progress = getProgress();
    progress.interviews.push({
        date: new Date().toISOString(),
        score: result.score,
        company: result.company,
        type: result.type
    });

    // Update aggregate stats
    progress.totalScore += result.score;
    progress.xp += 500; // XP per interview
    progress.modulesCompleted++; // Counting interview as module for now

    saveProgress(progress);
}
