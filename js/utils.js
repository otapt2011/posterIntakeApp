// Utility Functions
class Utils {
  static truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
  
  static formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  static isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  
  static isValidURL(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
  
  static copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      Toast.show('Copied to clipboard', 'success');
    }).catch(err => {
      console.error('Copy failed:', err);
      Toast.show('Copy failed', 'error');
    });
  }
}

// Toast Notification System
class Toast {
  static show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
      console.log(`[${type.toUpperCase()}] ${message}`);
      return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle',
      confirm: 'fas fa-question-circle'
    };
    
    toast.innerHTML = `
            <i class="${icons[type] || 'fas fa-info-circle'} toast-icon"></i>
            <div class="toast-content">${message}</div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
    
    container.appendChild(toast);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.animation = 'fadeOut 0.3s ease';
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
    
    return toast;
  }
  
  static confirm(message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
      const container = document.getElementById('toastContainer');
      if (!container) {
        resolve(confirm(message));
        return;
      }
      
      const toast = document.createElement('div');
      toast.className = 'toast confirm';
      
      toast.innerHTML = `
                <i class="fas fa-question-circle toast-icon"></i>
                <div class="toast-content">
                    ${message}
                    <div class="toast-actions">
                        <button class="toast-action-btn cancel">${cancelText}</button>
                        <button class="toast-action-btn confirm">${confirmText}</button>
                    </div>
                </div>
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            `;
      
      container.appendChild(toast);
      
      // Close button
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
        resolve(false);
      });
      
      // Cancel button
      toast.querySelector('.cancel').addEventListener('click', () => {
        toast.remove();
        resolve(false);
      });
      
      // Confirm button
      toast.querySelector('.confirm').addEventListener('click', () => {
        toast.remove();
        resolve(true);
      });
    });
  }
}

// Make classes available globally
window.Utils = Utils;
window.Toast = Toast;