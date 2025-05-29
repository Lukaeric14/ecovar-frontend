// Card product quantity selector functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize quantity buttons
  initQuantityButtons();
  
  // Set up event delegation for dynamically loaded content
  document.body.addEventListener('click', function(e) {
    // Handle decrease button clicks
    if (e.target.classList.contains('quantity-btn') && e.target.classList.contains('decrease')) {
      e.preventDefault();
      e.stopPropagation();
      
      const productId = e.target.getAttribute('data-product-id');
      const input = document.getElementById(`quantity-${productId}`);
      if (input) {
        let value = parseInt(input.value, 10);
        if (value > 1) {
          input.value = value - 1;
        }
      }
    }
    
    // Handle increase button clicks
    if (e.target.classList.contains('quantity-btn') && e.target.classList.contains('increase')) {
      e.preventDefault();
      e.stopPropagation();
      
      const productId = e.target.getAttribute('data-product-id');
      const input = document.getElementById(`quantity-${productId}`);
      if (input) {
        let value = parseInt(input.value, 10);
        input.value = value + 1;
      }
    }
    
    // Handle add to cart button clicks
    if (e.target.classList.contains('product-card__button') && e.target.hasAttribute('data-product-id')) {
      const variantId = e.target.getAttribute('data-product-id');
      const productUrl = e.target.getAttribute('data-product-url');
      
      // Only intercept if it's not already being processed
      if (!e.target.disabled && !e.target.classList.contains('processing')) {
        e.preventDefault();
        addToCartWithQuantity(variantId, productUrl, e.target);
      }
    }
  });
  
  // Initialize all quantity buttons on the page
  function initQuantityButtons() {
    // Input change handlers to ensure valid quantities
    const quantityInputs = document.querySelectorAll('.quantity-input input');
    quantityInputs.forEach(input => {
      input.addEventListener('change', function() {
        if (parseInt(this.value, 10) < 1 || isNaN(parseInt(this.value, 10))) {
          this.value = 1;
        }
      });
    });
  }
});

// Function to add item to cart with the selected quantity
function addToCartWithQuantity(variantId, productUrl, buttonElement) {
  // If buttonElement is not provided, find it
  const addButton = buttonElement || document.querySelector(`.product-card__button[data-product-id="${variantId}"]`);
  if (!addButton) {
    console.error('Add button not found for variant:', variantId);
    return;
  }
  
  const quantityInput = document.getElementById(`quantity-${variantId}`);
  if (!quantityInput) {
    console.error('Quantity input not found for variant:', variantId);
    // Fall back to product page if we can't find the quantity
    if (productUrl) {
      window.location.href = productUrl;
    }
    return;
  }
  
  const quantity = parseInt(quantityInput.value, 10);
  if (quantity < 1 || isNaN(quantity)) {
    alert('Please select a valid quantity');
    return;
  }
  
  // Show loading state
  const originalText = addButton.textContent.trim();
  addButton.textContent = 'Adding...';
  addButton.disabled = true;
  addButton.classList.add('processing');
  
  // Add to cart using Shopify AJAX API
  fetch('/cart/add.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      id: variantId,
      quantity: quantity
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    // Success - update cart count and show feedback
    updateCartCounter();
    
    // Show success state
    addButton.textContent = 'Added!';
    addButton.classList.add('added');
    
    // Show toast notification
    showToast(`${quantity} item(s) added to cart`, 'success');
    
    // Reset button after 2 seconds
    setTimeout(() => {
      addButton.textContent = originalText;
      addButton.disabled = false;
      addButton.classList.remove('processing');
      addButton.classList.remove('added');
    }, 2000);
  })
  .catch(error => {
    console.error('Error adding to cart:', error);
    
    // Show error state
    addButton.textContent = 'Try Again';
    
    // Show toast notification for error
    showToast('Could not add to cart. Please try again.', 'error');
    
    // Reset button after 2 seconds
    setTimeout(() => {
      addButton.textContent = originalText;
      addButton.disabled = false;
      addButton.classList.remove('processing');
    }, 2000);
  });
}

// Update the cart counter
function updateCartCounter() {
  fetch('/cart.js')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(cart => {
      // Find all cart count elements and update them
      const cartCountElements = document.querySelectorAll('.cart-count-bubble');
      if (cartCountElements.length > 0) {
        cartCountElements.forEach(element => {
          element.textContent = cart.item_count;
          if (cart.item_count > 0) {
            element.style.display = '';
          }
        });
      } else {
        // If we couldn't find any cart count elements, try to refresh the page
        // as a fallback to update the UI
        window.location.reload();
      }
    })
    .catch(error => {
      console.error('Error updating cart count:', error);
    });
}

// Toast notification system
function showToast(message, type = 'success') {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
    
    // Add styles to the document if they don't exist
    if (!document.getElementById('toast-styles')) {
      const styles = document.createElement('style');
      styles.id = 'toast-styles';
      styles.textContent = `
        #toast-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
        }
        
        .toast {
          min-width: 250px;
          margin-bottom: 10px;
          padding: 15px 20px;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: space-between;
          animation: slideInRight 0.3s, fadeOut 0.5s 2.5s forwards;
          pointer-events: auto;
        }
        
        .toast.success {
          background-color: #8F9A5B;
          color: white;
        }
        
        .toast.error {
          background-color: #e22120;
          color: white;
        }
        
        .toast-content {
          margin-right: 10px;
          flex: 1;
        }
        
        .toast-close {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 16px;
          opacity: 0.8;
        }
        
        .toast-close:hover {
          opacity: 1;
        }
        
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(styles);
    }
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Create content and close button
  const content = document.createElement('div');
  content.className = 'toast-content';
  content.textContent = message;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  });
  
  // Assemble and add to container
  toast.appendChild(content);
  toast.appendChild(closeBtn);
  toastContainer.appendChild(toast);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}
