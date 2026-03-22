import { generateText } from '../utils.js';
import CONFIG from '../config.js';

export function initResume() {
    console.log('Initializing Resume Audit Module');
    setupDragAndDrop();
    setupAnalysiser();
}

let resumeText = "";

function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('resume-upload');

    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('highlight'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFiles, false);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFile(files[0]);
}

function handleFiles(e) {
    const files = this.files;
    handleFile(files[0]);
}

async function handleFile(file) {
    if (!file) return;

    const fileNameDisplay = document.getElementById('file-name');
    fileNameDisplay.innerText = `Selected: ${file.name}`;
    fileNameDisplay.classList.remove('hidden');

    if (file.type === 'application/pdf') {
        resumeText = await extractTextFromPDF(file);
    } else if (file.type === 'text/plain') {
        resumeText = await file.text();
    } else {
        alert('Please upload a PDF or Text file.');
        resumeText = "";
    }
}

async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            text += strings.join(" ") + "\n";
        }
        return text;
    } catch (error) {
        console.error("PDF Parse Error:", error);
        return "Error extracting text from PDF.";
    }
}

function setupAnalysiser() {
    const analyzeBtn = document.getElementById('analyze-btn');
    if (!analyzeBtn) return;

    analyzeBtn.addEventListener('click', async () => {
        const jdText = document.getElementById('jd-input').value;

        if (!resumeText || !jdText) {
            alert("Please upload a resume and provide a job description.");
            return;
        }

        // Show Loading State
        analyzeBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...`;
        analyzeBtn.disabled = true;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/analyze-resume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeText, jdText })
            });
            const data = await response.json();

            if (data.success && data.analysis) {
                renderResults(data.analysis);
            } else {
                throw new Error(data.error || "Analysis failed");
            }

        } catch (e) {
            console.error(e);
            alert(`Resume analysis failed: ${e.message || "Unknown Error"}`);
            // Fallback visualization for demo if backend fails
            renderResults({
                match_score: 0,
                strong_matches: ["Error connecting to server"],
                missing_keywords: [],
                improvements: ["Please check your connection"]
            });
        }

        analyzeBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze Resume`;
        analyzeBtn.disabled = false;
    });
}

function renderResults(data) {
    const resultContainer = document.getElementById('analysis-result');
    resultContainer.classList.remove('hidden');
    resultContainer.innerHTML = ''; // Clear previous

    // Helper for colors
    const getScoreColor = (s) => s < 50 ? '#ef4444' : s < 75 ? '#f59e0b' : '#10b981';

    // 1. Header & Executive Summary
    const headerHTML = `
        <div class="resume-dashboard-header">
            <!-- Score Card -->
            <div class="score-card-main">
                <h4 class="label" style="margin-bottom: 1.5rem;">Overall Match</h4>
                <div class="circular-score-lg" style="--score-color: ${getScoreColor(data.match_score)}">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="circle" stroke-dasharray="${data.match_score}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="stroke: ${getScoreColor(data.match_score)}" />
                    </svg>
                    <div class="score-text">
                        <span style="color: ${getScoreColor(data.match_score)}">${data.match_score}%</span>
                    </div>
                </div>
                <p class="sub-label" style="margin-top: 1.5rem;">JD Relevance</p>
            </div>

            <!-- Summary Card -->
            <div class="summary-card-main">
                <h3><i class="fa-solid fa-clipboard-list"></i> Executive Summary</h3>
                <p>${data.summary || "Analysis complete."}</p>
            </div>
        </div>
    `;

    // 2. Metrics Grid
    const metricsHTML = `
        <div class="metrics-grid">
            <!-- Impact -->
            <div class="metric-card">
                <div class="metric-header">
                    <div class="icon blue"><i class="fa-solid fa-chart-line"></i></div>
                    <span class="score" style="color: ${getScoreColor(data.impact_check?.score)}">${data.impact_check?.score}/100</span>
                </div>
                <h4>Impact & Quant.</h4>
                <p class="feedback">${data.impact_check?.feedback}</p>
                 <div class="metric-details">
                    <strong>Needs Focus:</strong>
                    <ul>
                         ${(data.impact_check?.examples || []).slice(0, 2).map(e => `<li>${e}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <!-- Brevity -->
            <div class="metric-card">
                 <div class="metric-header">
                    <div class="icon purple"><i class="fa-solid fa-feather"></i></div>
                    <span class="score" style="color: ${getScoreColor(data.brevity_style?.score)}">${data.brevity_style?.score}/100</span>
                </div>
                <h4>Brevity & Style</h4>
                <p class="feedback">${data.brevity_style?.feedback}</p>
                 <div class="metric-details">
                    <strong>Weak Phrases:</strong>
                     <ul>
                         ${(data.brevity_style?.issues || []).slice(0, 2).map(e => `<li>${e}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <!-- ATS -->
            <div class="metric-card">
                 <div class="metric-header">
                    <div class="icon green"><i class="fa-solid fa-robot"></i></div>
                    <span class="score" style="color: ${getScoreColor(data.ats_compatibility?.score)}">${data.ats_compatibility?.score}/100</span>
                </div>
                <h4>ATS Check</h4>
                <p class="feedback">System readability check.</p>
                 <div class="metric-details">
                    <ul>
                        ${(data.ats_compatibility?.issues || ["All Good"]).slice(0, 2).map(i => `<li><i class="fa-solid fa-check"></i> ${i}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `;

    // 3. Keywords
    const keywordsHTML = `
        <div class="keywords-panel">
            <h3><i class="fa-solid fa-tags"></i> Keyword Analysis</h3>
            <div class="keywords-columns">
                <div class="col missing">
                    <h4>Missing (Critical)</h4>
                    <div class="tags">
                        ${(data.keywords?.missing || []).length > 0 ?
            (data.keywords?.missing || []).map(k => `<span class="tag missing">${k}</span>`).join('')
            : '<span class="empty-msg">Great job! No key skills missing.</span>'}
                    </div>
                </div>
                <div class="col present">
                     <h4>Present (Matched)</h4>
                    <div class="tags">
                        ${(data.keywords?.present || []).map(k => `<span class="tag present">${k}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    // 4. Improvements
    const improvementsHTML = `
        <div class="improvements-panel">
            <h3><i class="fa-solid fa-pen-nib"></i> Recommended Rewrites</h3>
            <div class="rewrite-list">
                ${(data.line_by_line_improvements || []).map(item => `
                    <div class="rewrite-item">
                        <div class="rewrite-grid">
                            <div class="ver old">
                                <span class="lbl">Old Version</span>
                                <p>"${item.original}"</p>
                            </div>
                            <div class="ver new">
                                <span class="lbl">New Version</span>
                                <p>"${item.improved}"</p>
                            </div>
                        </div>
                        <p class="reason"><i class="fa-solid fa-info-circle"></i> ${item.reason}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    resultContainer.innerHTML = headerHTML + metricsHTML + keywordsHTML + improvementsHTML;
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}
