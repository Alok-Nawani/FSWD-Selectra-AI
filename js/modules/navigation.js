export function initNavigation() {
    console.log('Initializing Navigation');

    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('main section');

    // Handle Navigation Clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href.startsWith('#')) return; // Allow normal navigation for external links

            e.preventDefault();
            const targetId = href.substring(1);

            // Hide all sections
            sections.forEach(section => {
                section.classList.add('hidden');
            });

            // Show target section
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
            }

            // Update active state
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');

            // Close Sidebar on Mobile
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.remove('open');

            // Dispatch event for other modules (like Arena refresh)
            window.dispatchEvent(new CustomEvent('section-changed', { detail: { targetId } }));
        });
    });

    // Mobile Toggle
    const navToggle = document.getElementById('nav-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (navToggle && sidebar) {
        navToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') &&
                !sidebar.contains(e.target) &&
                !navToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }
    // Desktop Toggle
    const desktopToggle = document.getElementById('desktop-nav-toggle');
    if (desktopToggle && sidebar) {
        desktopToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            // Optional: Rotate icon or change styling when collapsed
            if (sidebar.classList.contains('collapsed')) {
                // desktopToggle.innerHTML = '<i class="fa-solid fa-bars"></i>'; // Change icon if needed
            } else {
                // desktopToggle.innerHTML = '<i class="fa-solid fa-graduation-cap"></i>';
            }
        });
    }

    // Desktop: Closer Button inside Sidebar
    const closeSidebarBtn = document.getElementById('sidebar-close-btn');
    if (closeSidebarBtn && sidebar) {
        closeSidebarBtn.addEventListener('click', () => {
            sidebar.classList.add('collapsed');
        });
    }
}
