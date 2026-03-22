import { fetchData } from '../utils.js';
import { getProgress } from './auth.js';

export async function initDashboard() {
    console.log('Initializing Dashboard');

    // 2. Fetch User Progress (Dynamic)
    const userData = getProgress();

    // Clear static heatmap if new user
    const heatmapGrid = document.querySelector('.skill-grid');
    if (heatmapGrid && (!userData || !userData.interviews || userData.interviews.length === 0)) {
        heatmapGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fa-solid fa-chart-simple" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Complete assessments to generate your skill heatmap.</p>
            </div>
        `;
    }

    // 3. Logic: Calculate Readiness Score based on Course Progress & Interviews
    let readinessScore = 0;

    // Config for max videos per module (Approximate from learning.js)
    const moduleMax = {
        'dsa': 30, 'dbms': 30, 'os': 30, 'cn': 30, 'oop': 30, 'ai': 23, 'ml': 23
    };

    let totalProgress = 0;
    let totalModules = 0;

    // Per-Subject Scores for Chart
    // Map internal IDs to Chart Labels
    // DSA, DBMS, OS, CN, OOP, AI/ML
    const subjectScores = {
        'DSA': 0, 'DBMS': 0, 'OS': 0, 'CN': 0, 'OOP': 0, 'AI/ML': 0
    };

    if (userData) {
        // A. Course Progress Contribution (50% weight)
        if (userData.courseProgress) {
            for (const [modId, count] of Object.entries(userData.courseProgress)) {
                let max = moduleMax[modId] || 30;
                let percent = Math.min(100, Math.round((count / max) * 100));

                // Add to total
                totalProgress += percent;
                totalModules++;

                // Map to Chart Keys
                if (modId === 'dsa') subjectScores['DSA'] = percent;
                if (modId === 'dbms') subjectScores['DBMS'] = percent;
                if (modId === 'os') subjectScores['OS'] = percent;
                if (modId === 'cn') subjectScores['CN'] = percent;
                if (modId === 'oop') subjectScores['OOP'] = percent;
                if (modId === 'ai' || modId === 'ml') subjectScores['AI/ML'] = Math.max(subjectScores['AI/ML'], percent); // Take max of AI or ML
            }
        }

        // B. Interview/Quiz Score Contribution (50% weight)
        // If we had quiz scores in userData, we'd add them here. 
        // For now using totalScore as a proxy for holistic "XP"
        const xpScore = Math.min(100, Math.floor(userData.totalScore / 50)); // 5000 XP = 100%

        // Combined Readiness
        // If valid modules, average them. Then average with XP.
        const avgCourseProgress = totalModules > 0 ? (totalProgress / totalModules) : 0;

        // Final Score: 60% Course Progress + 40% XP/Interviews
        readinessScore = Math.round((avgCourseProgress * 0.6) + (xpScore * 0.4));
    }

    // Update UI - Readiness
    const readinessLabel = document.querySelector('.percentage');
    if (readinessLabel) readinessLabel.innerHTML = `${readinessScore}%`;

    const circularChart = document.querySelector('.circular-chart');
    if (circularChart) circularChart.style.setProperty('--percentage', readinessScore);

    // 4. Setup Chart.js (Dynamic based on User Data)
    const ctx = document.getElementById('subjectChart');
    if (ctx && window.Chart) {
        const subjects = Object.keys(subjectScores);
        const scores = Object.values(subjectScores);
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: subjects,
                datasets: [{
                    label: 'Proficiency %',
                    data: scores,
                    backgroundColor: colors.map(c => c + 'B3'),
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // 5. Update History Table (Only User Data)
    const historyBody = document.querySelector('.history-card tbody');
    if (historyBody) {
        let historyItems = [];

        // Load User Interviews
        if (userData && userData.interviews && userData.interviews.length > 0) {
            historyItems = userData.interviews.map(interview => ({
                date: new Date(interview.date).toLocaleDateString(),
                module: `${interview.company.toUpperCase()} Interview`,
                type: 'Interview',
                result: `${interview.score}%`,
                status: interview.score > 70 ? 'success' : (interview.score > 40 ? 'warning' : 'error')
            })).reverse(); // Newest first
        }

        if (historyItems.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="5" style="text-align:center; opacity:0.6;">No recent activity. Start an interview to see progress here.</td></tr>`;
        } else {
            historyBody.innerHTML = historyItems.map(item => `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.module}</td>
                    <td>${item.type}</td>
                    <td>${item.result}</td>
                    <td><span class="status-pill ${item.status}">${(item.status || 'unknown').toUpperCase()}</span></td>
                </tr>
            `).join('');
        }
    }
}
