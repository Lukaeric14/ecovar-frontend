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
      return response.json().then(err => { throw err; }); // Throw with error details from Shopify
    }
    return response.json(); // This is the line item added
  })
  .then(addedItemData => {
    updateCartCounter(); // Update cart count display elsewhere on the page

    // Fetch full product details for the modal
    // Ensure productUrl is the product page URL, e.g., /products/product-handle
    const productJsonUrl = productUrl.includes('.js') ? productUrl : productUrl.split('?')[0] + '.js';

    fetch(productJsonUrl)
      .then(response => response.json())
      .then(productDataFull => {
        const productInfo = productDataFull.product || productDataFull; // Handle cases where product data might be nested or not

        // Fetch current cart state for total item count
        fetch('/cart.js')
          .then(response => response.json())
          .then(cartData => {
            const modalData = {
              message: `${quantity} × ${productInfo.title} added to cart`,
              productImage: productInfo.featured_image || (productInfo.images && productInfo.images.length > 0 ? productInfo.images[0].src : ''),
              productTitle: productInfo.title,
              productId: productInfo.id, // Added product ID for related products
              cartItemCount: cartData.item_count,
              type: 'cart'
            };

            const modalElement = document.querySelector('cascade-atc-modal-element');
            if (modalElement && typeof modalElement.open === 'function') {
              modalElement.open(modalData);
            } else {
              console.error('Cascade ATC Modal element not found or open method is not available.');
              // Fallback to original toast if modal isn't ready
              showToast(`${quantity} item(s) added to cart`, 'success');
            }

            // Reset the button on the product card
            addButton.textContent = originalText;
            addButton.disabled = false;
            addButton.classList.remove('processing');
            // No 'added' class needed on the button itself anymore
          })
          .catch(cartError => {
            console.error('Error fetching cart.js for modal:', cartError);
            showToast(`${quantity} item(s) added to cart (cart info unavailable)`, 'success');
            // Reset button even on partial failure
            addButton.textContent = originalText;
            addButton.disabled = false;
            addButton.classList.remove('processing');
          });
      })
      .catch(productError => {
        console.error('Error fetching product.js for modal:', productError);
        // Fallback: still show toast, but try to get cart count for a basic message
        fetch('/cart.js').then(r => r.json()).then(cartData => {
          showToast(`${quantity} item(s) added to cart. Cart has ${cartData.item_count} items.`, 'success');
        }).catch(() => showToast(`${quantity} item(s) added to cart`, 'success'));
        
        // Reset button even on partial failure
        addButton.textContent = originalText;
        addButton.disabled = false;
        addButton.classList.remove('processing');
      });
  })
  .catch(error => {
    console.error('Error adding to cart:', error);
    let errorMsg = 'Could not add to cart. Please try again.';
    if (error && error.description) {
        errorMsg = error.description; // Use Shopify's error message if available
    }
    showToast(errorMsg, 'error');
    
    // Reset button on error
    addButton.textContent = originalText;
    addButton.disabled = false;
    addButton.classList.remove('processing');
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
