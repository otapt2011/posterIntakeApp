// UI Interactions Management
class UIManager {
  static init(app) {
    this.app = app;
    this.initializeModals();
    this.initializeButtons();
    this.initializeToasts();
    this.preventZoomOnFocus();
  }
  
  static initializeModals() {
    // Preview Modal
    const previewModal = document.getElementById('previewModal');
    const closeModal = document.getElementById('closeModal');
    const previewBtn = document.getElementById('previewBtn');
    const screenshotBtn = document.getElementById('screenshotBtn');
    
    // Preview Button
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        const progress = FormManager.getProgress();
        
        if (previewModal) {
          previewModal.style.display = 'flex';
          this.generatePreview(progress);
          
          if (progress < 100) {
            Toast.show(`Form is ${progress}% complete. Some fields are missing.`, 'warning', 4000);
            this.highlightMissingFields();
          } else {
            Toast.show('Preview generated!', 'info', 4000);
          }
        }
      });
    }
    
    // Close Preview Modal
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        previewModal.style.display = 'none';
      });
    }
    
    // Close modal when clicking outside
    if (previewModal) {
      previewModal.addEventListener('click', (event) => {
        if (event.target === previewModal) {
          previewModal.style.display = 'none';
        }
      });
    }
    
    // Screenshot Button
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', () => {
        Toast.show('Ready for screenshot!', 'info', 3000);
      });
    }
  }
  
  static initializeButtons() {
    // Clear Button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        const confirmed = await Toast.confirm(
          'Clear all form data?',
          'Clear All',
          'Cancel'
        );
        
        if (confirmed) {
          FormManager.clearForm();
          Toast.show('Form cleared', 'success');
        }
      });
    }
    
    // History Button
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        const historyModal = document.getElementById('historyModal');
        if (historyModal) {
          historyModal.style.display = 'flex';
          HistoryManager.loadSubmissions();
        }
      });
    }
  }
  
  static initializeToasts() {
    // Toast class is already defined in utils.js
    // Just ensure it's available
    if (typeof Toast === 'undefined') {
      console.warn('Toast class not found');
    }
  }
  
  static generatePreview(progress) {
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    
    const formData = FormManager.getFormData();
    
    // Map display names
    const goalMap = {
      'sell_tickets': 'Sell Tickets',
      'drive_registrations': 'Drive Registrations',
      'build_awareness': 'Build Awareness',
      'product_launch': 'Product Launch',
      'brand_promotion': 'Brand Promotion'
    };
    
    const moodMap = {
      'elegant_formal': 'Elegant & Formal',
      'energetic_playful': 'Energetic & Playful',
      'modern_minimal': 'Modern & Minimal',
      'vintage_retro': 'Vintage & Retro',
      'bold_edgy': 'Bold & Edgy',
      'friendly_warm': 'Friendly & Warm'
    };
    
    let previewHTML = '';
    
    if (progress < 100) {
      previewHTML += `
                <div class="preview-warning">
                    <h3><i class="fas fa-exclamation-triangle"></i> Incomplete Form (${progress}%)</h3>
                    <p>Some required fields are missing. Preview may be incomplete.</p>
                </div>
            `;
    }
    
    previewHTML += `
            <div class="preview-section">
                <h3><i class="fas fa-info-circle"></i> Project Overview</h3>
                <div class="preview-grid">
                    <div class="preview-item">
                        <h4>Project Name</h4>
                        <p>${formData.projectName || '<em class="empty-field">Not provided</em>'}</p>
                    </div>
                    <div class="preview-item">
                        <h4>Tagline</h4>
                        <p>${formData.tagline || '<em class="empty-field">Not provided</em>'}</p>
                    </div>
                    <div class="preview-item">
                        <h4>Date & Time</h4>
                        <p>${formData.eventDate || '<em class="empty-field">Not set</em>'} ${formData.eventTime ? 'at ' + formData.eventTime : ''}</p>
                    </div>
                    <div class="preview-item">
                        <h4>Venue / Link</h4>
                        <p>${formData.venueLink || '<em class="empty-field">Not provided</em>'}</p>
                    </div>
                    <div class="preview-item">
                        <h4>Primary Goal</h4>
                        <p>${goalMap[formData.primaryGoal] || '<em class="empty-field">Not selected</em>'}</p>
                    </div>
                    <div class="preview-item">
                        <h4>Call-to-Action</h4>
                        <p>${formData.ctaText || '<em class="empty-field">Not provided</em>'}</p>
                    </div>
                </div>
            </div>
            
            <div class="preview-section">
                <h3><i class="fas fa-users"></i> Audience & Design</h3>
                <div class="preview-grid">
                    <div class="preview-item">
                        <h4>Target Audience</h4>
                        <p>${formData.targetAudience || '<em class="empty-field">Not provided</em>'}</p>
                    </div>
                    <div class="preview-item">
                        <h4>Design Mood</h4>
                        <p>${moodMap[formData.designMood] || '<em class="empty-field">Not selected</em>'}</p>
                    </div>
                    <div class="preview-item">
                        <h4>Brand Colors</h4>
                        <p>${formData.brandColors || '<em class="empty-field">Not provided</em>'}</p>
                    </div>
                    <div class="preview-item">
                        <h4>Brand Fonts</h4>
                        <p>${formData.brandFonts || '<em class="empty-field">Not provided</em>'}</p>
                    </div>
                </div>
            </div>
        `;
    
    modalBody.innerHTML = previewHTML;
  }
  
  static highlightMissingFields() {
    const requiredFields = [
      'projectName', 'tagline', 'eventDate', 'eventTime', 'venueLink', 'primaryGoal',
      'targetAudience', 'designMood', 'ctaText', 'brandColors', 'brandFonts',
      'posterDimensions', 'finalDeadline'
    ];
    
    // Remove previous highlights
    document.querySelectorAll('.missing-field').forEach(el => {
      el.classList.remove('missing-field');
    });
    
    // Highlight missing required fields
    requiredFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        let isEmpty = false;
        
        if (field.type === 'file') {
          isEmpty = field.files.length === 0;
        } else if (field.type === 'checkbox' || field.type === 'radio') {
          return;
        } else {
          isEmpty = !field.value || field.value.trim() === '';
        }
        
        if (isEmpty) {
          field.classList.add('missing-field');
          
          setTimeout(() => {
            field.classList.remove('missing-field');
          }, 3000);
        }
      }
    });
  }
  
  static preventZoomOnFocus() {
    document.addEventListener('touchstart', function(event) {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
        event.target.style.fontSize = '14px';
      }
    }, { passive: true });
  }
}

// Make UIManager available globally
window.UIManager = UIManager;