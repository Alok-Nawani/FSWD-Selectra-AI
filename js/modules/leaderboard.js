import { getCurrentUser } from './auth.js';
import CONFIG from '../config.js';

export function initLeaderboard() {
    console.log("Initializing Leaderboard");
    
    // Listen for tab switch to potentially re-render
    window.addEventListener('section-changed', (e) => {
        if (e.detail.targetId === 'leaderboard') {
            renderLeaderboard();
        }
    });

    renderLeaderboard();
}

async function renderLeaderboard() {
    const user = getCurrentUser();
    const userXp = user ? (user.xp || 0) : 0;

    document.getElementById('user-xp-display').innerText = userXp;

    try {
        const response = await fetch(`${CONFIG.API_URL}/api/leaderboard`);
        const data = await response.json();
        
        if (data.success && data.leaderboard) {
            const leaderboard = data.leaderboard;

            // Render Podium (top 3)
            const podiumContainer = document.getElementById('leaderboard-podium');
            if (podiumContainer) {
                const top3 = leaderboard.slice(0, 3);
                // order: 2nd, 1st, 3rd for visual podium
                const podiumOrder = [];
                if (top3[1]) podiumOrder.push(top3[1]);
                if (top3[0]) podiumOrder.push(top3[0]);
                if (top3[2]) podiumOrder.push(top3[2]);
                
                podiumContainer.innerHTML = podiumOrder.map((p) => {
                    const isFirst = p.rank === 1;
                    const isSecond = p.rank === 2;
                    const height = isFirst ? '200px' : isSecond ? '160px' : '130px';
                    const color = isFirst ? '#f59e0b' : isSecond ? '#94a3b8' : '#b45309';
                    const shadow = isFirst ? '0 0 30px rgba(245, 158, 11, 0.3)' : 'none';
                    const isUser = user && (p._id === user._id || p.name === user.name);

                    return `
                        <div style="display: flex; flex-direction: column; align-items: center; width: 120px; transition: transform 0.3s; cursor: default;" onmouseover="this.style.transform='translateY(-10px)'" onmouseout="this.style.transform='translateY(0)'">
                            <div style="position: relative; margin-bottom: 1rem;">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.name)}" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid ${color}; background: #334155; box-shadow: ${shadow};">
                                <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); background: ${color}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 900; border: 2px solid #0f172a;">${p.rank}</div>
                            </div>
                            <div style="background: linear-gradient(180deg, ${color}44 0%, transparent 100%); width: 100%; height: ${height}; border-radius: 12px 12px 0 0; border: 1px solid ${color}33; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding-bottom: 1rem;">
                                <span style="font-weight: 800; color: ${isUser ? 'var(--accent-cyan)' : 'white'}; font-size: 0.8rem; text-align: center; padding: 0 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${p.name.split(' ')[0]}${isUser ? ' (You)' : ''}</span>
                                <span style="color: ${color}; font-weight: 900; font-family: monospace; font-size: 1rem;">${p.xp}</span>
                                <span style="font-size: 0.65rem; color: #a1a1aa; margin-top: 2px;"><i class="fa-solid fa-fire" style="color: #f97316;"></i> ${p.currentStreak}d</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            const tbody = document.getElementById('leaderboard-body');
            if (tbody) {
                // The table shows all remaining players (from rank 4 onwards)
                const remaining = leaderboard.slice(3);
                
                if (remaining.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" style="padding: 2rem; text-align: center; color: #64748b;">
                                Keep solving daily challenges to climb the ranks!
                            </td>
                        </tr>
                    `;
                } else {
                    tbody.innerHTML = remaining.map(p => {
                        const isUser = user && (p._id === user._id || p.name === user.name);
                        return `
                            <tr style="${isUser ? 'background: rgba(6, 182, 212, 0.1);' : ''}; transition: transform 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='${isUser ? 'rgba(6, 182, 212, 0.1)' : 'transparent'}'">
                                <td style="padding: 1.2rem; color: #64748b; font-weight: 800;">#${p.rank}</td>
                                <td style="padding: 1.2rem; display: flex; align-items: center; gap: 1rem;">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.name)}" style="width: 32px; height: 32px; border-radius: 50%; background: #334155;">
                                    <span style="font-weight: ${isUser ? '800' : '500'}; color: ${isUser ? 'var(--accent-cyan)' : 'white'}">${p.name} ${isUser ? '(You)' : ''}</span>
                                </td>
                                <td style="padding: 1.2rem; color: white; font-weight: 800; font-family: monospace;">${p.xp}</td>
                                <td style="padding: 1.2rem; color: #f97316; font-weight: 700; font-family: monospace;">
                                    <i class="fa-solid fa-fire"></i> ${p.currentStreak}d <span style="font-size: 0.75rem; color: #64748b; font-weight: normal;">(max: ${p.maxStreak})</span>
                                </td>
                                <td style="padding: 1.2rem; color: #38bdf8; font-weight: 700; font-family: monospace;">${p.challengesCompleted || 0}</td>
                                <td style="padding: 1.2rem;"><span class="badge" style="background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.75rem;">${p.title}</span></td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        }
    } catch (e) {
        console.error("Failed to render leaderboard from API:", e);
    }

    renderBadges(userXp);
}

function renderBadges(xp) {
    const container = document.getElementById('badges-container');
    if (!container) return;

    const ALL_BADGES = [
        { threshold: 100, icon: 'fa-seedling', name: 'First Steps', color: '#10b981' },
        { threshold: 500, icon: 'fa-code', name: 'Code Warrior', color: '#3b82f6' },
        { threshold: 1000, icon: 'fa-brain', name: 'Logic Wizard', color: '#8b5cf6' },
        { threshold: 1500, icon: 'fa-crown', name: 'DSA Master', color: '#f59e0b' },
    ];

    container.innerHTML = ALL_BADGES.map(badge => {
        const unlocked = xp >= badge.threshold;
        return `
            <div style="flex: 1; min-width: 120px; text-align: center; padding: 1.5rem; background: rgba(255,255,255,0.05); border-radius: 8px; opacity: ${unlocked ? '1' : '0.4'}; filter: ${unlocked ? 'none' : 'grayscale(100%)'}; border: ${unlocked ? '1px solid ' + badge.color : '1px solid transparent'}; transition: all 0.3s;">
                <i class="fa-solid ${badge.icon}" style="font-size: 2.5rem; color: ${badge.color}; margin-bottom: 0.5rem;"></i>
                <h4 style="font-size: 0.9rem; margin-bottom: 0.25rem;">${badge.name}</h4>
                <p style="font-size: 0.7rem; color: var(--text-secondary);">${badge.threshold} XP</p>
                ${unlocked ? '<div style="margin-top: 0.5rem; font-size: 0.7rem; color: #10b981;"><i class="fa-solid fa-unlock"></i> Unlocked</div>' : '<div style="margin-top: 0.5rem; font-size: 0.7rem; color: #ef4444;"><i class="fa-solid fa-lock"></i> Locked</div>'}
            </div>
        `;
    }).join('');
}
