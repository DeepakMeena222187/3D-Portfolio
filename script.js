// ===== TYPING ANIMATION =====
const texts = [
  'Shipping production apps to Azure...',
  'Zero stored credentials. Managed identity everywhere.',
  'Event-driven systems with Azure Service Bus...',
  'Lighthouse 97 / 100 / 100 / 100, and counting...',
  'Turning ideas into deployed, verified systems.'
];

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typingSpeed = 100;
const deletingSpeed = 50;
const pauseTime = 2000;

function typeText() {
  const typingElement = document.getElementById('typing-text');
  const currentText = texts[textIndex];
  
  if (isDeleting) {
    typingElement.textContent = currentText.substring(0, charIndex - 1);
    charIndex--;
  } else {
    typingElement.textContent = currentText.substring(0, charIndex + 1);
    charIndex++;
  }
  
  let speed = isDeleting ? deletingSpeed : typingSpeed;
  
  if (!isDeleting && charIndex === currentText.length) {
    speed = pauseTime;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    textIndex = (textIndex + 1) % texts.length;
  }
  
  setTimeout(typeText, speed);
}

// ===== SMOOTH SCROLLING FOR NAVIGATION =====
document.querySelectorAll('.navbar a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ===== SCROLL PROGRESS BAR =====
function updateScrollProgress() {
  const scrollProgress = document.querySelector('.scroll-progress');
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrollPercentage = (scrollTop / scrollHeight) * 100;
  scrollProgress.style.width = scrollPercentage + '%';
}

// ===== REVEAL SECTIONS ON SCROLL =====
function revealSections() {
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    const sectionTop = section.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;
    
    if (sectionTop < windowHeight * 0.8) {
      section.classList.add('revealed');
    }
  });
}

// ===== CONTACT FORM HANDLING =====
function handleContactForm() {
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(form);
      const name = formData.get('name');
      const email = formData.get('email');
      const subject = formData.get('subject');
      const message = formData.get('message');
      
      // Create mailto link
      const mailtoLink = `mailto:deepaksingh1712000@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
      
      // Open default email client
      window.location.href = mailtoLink;
      
      // Show success message
      showNotification('Thank you! Your email client should open now.', 'success');
      
      // Reset form
      form.reset();
    });
  }
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
      <button class="notification-close">&times;</button>
    </div>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    border-left: 4px solid ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
  `;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Close button functionality
  const closeButton = notification.querySelector('.notification-close');
  closeButton.addEventListener('click', () => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  });
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// ===== NAVBAR ACTIVE LINK HIGHLIGHTING =====
function updateActiveNavLink() {
  const sections = document.querySelectorAll('.section, .hero');
  const navLinks = document.querySelectorAll('.navbar a');
  
  let currentSection = '';
  
  sections.forEach(section => {
    const sectionTop = section.getBoundingClientRect().top;
    const sectionHeight = section.offsetHeight;
    
    if (sectionTop <= 100 && sectionTop + sectionHeight > 100) {
      currentSection = section.getAttribute('id');
    }
  });
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + currentSection) {
      link.classList.add('active');
    }
  });
}

// ===== LAZY LOADING FOR BETTER PERFORMANCE =====
function setupLazyLoading() {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const section = entry.target;
          section.classList.add('revealed');
          observer.unobserve(section);
        }
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.section').forEach(section => {
      observer.observe(section);
    });
  } else {
    // Fallback for older browsers
    revealSections();
  }
}

// ===== KEYBOARD NAVIGATION =====
function setupKeyboardNavigation() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      // Close any open modals or notifications
      const notifications = document.querySelectorAll('.notification');
      notifications.forEach(notification => notification.remove());
    }
  });
}

// ===== PROJECT CARD INTERACTIONS =====
function setupProjectCards() {
  const projectCards = document.querySelectorAll('.project-card');
  projectCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-15px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
}

// ===== THEME DETECTION AND ADAPTATION =====
function setupThemeDetection() {
  // Detect user's color scheme preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark-theme');
  }
  
  // Listen for changes in color scheme preference
  window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
    if (e.matches) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  });
}

// ===== PERFORMANCE OPTIMIZATION =====
function optimizePerformance() {
  // Throttle scroll events
  let scrollTimeout;
  window.addEventListener('scroll', function() {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(function() {
      updateScrollProgress();
      revealSections();
      updateActiveNavLink();
    }, 10);
  });
  
}

// ===== ACCESSIBILITY IMPROVEMENTS =====
function setupAccessibility() {
  // Add skip to content link
  const skipLink = document.createElement('a');
  skipLink.href = '#home';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 6px;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 10001;
    border-radius: 4px;
  `;
  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '6px';
  });
  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Add main content landmark (keep id="home" intact for nav/anchors)
  const heroSection = document.getElementById('home');
  if (heroSection) {
    heroSection.setAttribute('role', 'main');
  }
  
  // Enhance focus management
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  });
  
  document.addEventListener('mousedown', function() {
    document.body.classList.remove('keyboard-navigation');
  });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
  // Start typing animation
  typeText();
  
  // Setup all features
  setupLazyLoading();
  setupKeyboardNavigation();
  setupProjectCards();
  setupThemeDetection();
  optimizePerformance();
  setupAccessibility();
  handleContactForm();
  
  // Initial calls
  revealSections();
  updateScrollProgress();
  updateActiveNavLink();
  
  console.log('🚀 Deepak Meena Portfolio Loaded Successfully!');
  console.log('📱 Responsive design active');
  console.log('✨ All animations ready');
});

// ===== WINDOW RESIZE HANDLER =====
window.addEventListener('resize', function() {
  revealSections();
  updateActiveNavLink();
});

// ===== SERVICE WORKER REGISTRATION (FOR PWA CAPABILITIES) =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('SW registered: ', registration);
      })
      .catch(function(registrationError) {
        console.log('SW registration failed: ', registrationError);
      });
  });
}