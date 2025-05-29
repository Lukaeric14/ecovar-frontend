// Quantity selector functionality for product cards
document.addEventListener('DOMContentLoaded', function() {
  initializeQuantityButtons();
});

// Initialize all quantity buttons on the page
function initializeQuantityButtons() {
  // Get all quantity selectors
  const decreaseButtons = document.querySelectorAll('.quantity-btn.decrease');
  const increaseButtons = document.querySelectorAll('.quantity-btn.increase');
  
  // Add event listeners to decrease buttons
  decreaseButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault(); // Prevent any default actions
      e.stopPropagation(); // Stop event from bubbling up
      
      const productId = this.getAttribute('data-product-id');
      const input = document.getElementById(`quantity-${productId}`);
      let value = parseInt(input.value, 10);
      
      // Don't allow values less than 1
      if (value > 1) {
        input.value = value - 1;
      }
    });
  });
  
  // Add event listeners to increase buttons
  increaseButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault(); // Prevent any default actions
      e.stopPropagation(); // Stop event from bubbling up
      
      const productId = this.getAttribute('data-product-id');
      const input = document.getElementById(`quantity-${productId}`);
      let value = parseInt(input.value, 10);
      
      // Increase the value
      input.value = value + 1;
    });
  });
  
  // Also handle manual input changes
  const quantityInputs = document.querySelectorAll('.quantity-input input');
  quantityInputs.forEach(input => {
    input.addEventListener('change', function() {
      // Ensure value is at least 1
      if (parseInt(this.value, 10) < 1 || isNaN(parseInt(this.value, 10))) {
        this.value = 1;
      }
    });
  });
};

// Function to add item to cart with the selected quantity
function addToCartWithQuantity(variantId, productUrl) {
  const quantityInput = document.getElementById(`quantity-${variantId}`);
  if (!quantityInput) {
    console.error('Quantity input not found for variant:', variantId);
    return;
  }
  
  const quantity = parseInt(quantityInput.value, 10);
  
  if (quantity < 1 || isNaN(quantity)) {
    alert('Please select a valid quantity');
    return;
  }
  
  // Find the button that triggered this action
  const addButton = document.querySelector(`.product-card__button[data-product-id="${variantId}"]`);
  if (!addButton) {
    console.error('Add to cart button not found for variant:', variantId);
    return;
  }
  
  // Show loading state
  const originalText = addButton.textContent.trim();
  addButton.textContent = 'Adding...';
  addButton.disabled = true;
  
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
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // Success - update cart count and show feedback
    updateCartCounter();
    
    // Show success message
    addButton.textContent = 'Added!';
    addButton.classList.add('added');
    
    // Create a confirmation message that appears above the button
    const confirmMessage = document.createElement('div');
    confirmMessage.className = 'cart-confirmation';
    confirmMessage.textContent = `${quantity} item(s) added to cart`;
    
    // Insert the confirmation message before the button
    addButton.parentNode.insertBefore(confirmMessage, addButton);
    
    // Remove the confirmation message after 3 seconds
    setTimeout(() => {
      if (confirmMessage.parentNode) {
        confirmMessage.parentNode.removeChild(confirmMessage);
      }
      addButton.textContent = originalText;
      addButton.disabled = false;
      addButton.classList.remove('added');
    }, 3000);
  })
  .catch(error => {
    console.error('Error adding to cart:', error);
    addButton.textContent = 'Try Again';
    addButton.disabled = false;
    
    // Show error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'cart-error';
    errorMessage.textContent = 'Could not add to cart. Please try again.';
    
    // Insert the error message before the button
    addButton.parentNode.insertBefore(errorMessage, addButton);
    
    // Remove the error message after 3 seconds
    setTimeout(() => {
      if (errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
      }
    }, 3000);
  });
}

// Update the cart counter
function updateCartCounter() {
  fetch('/cart.js')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(cart => {
      // Find all cart count elements and update them
      const cartCountElements = document.querySelectorAll('.cart-count-bubble');
      if (cartCountElements && cartCountElements.length > 0) {
        cartCountElements.forEach(element => {
          // Update the cart count
          element.textContent = cart.item_count;
          // Make sure it's visible
          element.classList.remove('hide');
          // If it doesn't exist, create it
          if (cart.item_count > 0) {
            element.style.display = 'flex';
          }
        });
      } else {
        // If we couldn't find any cart count elements, try to find the cart icon
        const cartIcons = document.querySelectorAll('.header__icon--cart');
        cartIcons.forEach(icon => {
          // Look for a cart count bubble or create one if it doesn't exist
          let countBubble = icon.querySelector('.cart-count-bubble');
          if (!countBubble && cart.item_count > 0) {
            countBubble = document.createElement('div');
            countBubble.className = 'cart-count-bubble';
            countBubble.textContent = cart.item_count;
            icon.appendChild(countBubble);
          }
          if (countBubble) {
            countBubble.textContent = cart.item_count;
          }
        });
      }
    })
    .catch(error => console.error('Error fetching cart:', error));
}
