// User Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Navigation
  const navButtons = document.querySelectorAll('.dashboard-nav-btn');
  const contentSections = document.querySelectorAll('.content-section');
  const pageTitle = document.getElementById('page-title');
  const headerUser = document.getElementById('header-user');
  const profileSection = document.getElementById('profile-section');
  const userLogoutBtn = document.getElementById('user-logout-btn');

  navButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      navButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');

      // Hide all sections
      contentSections.forEach(section => section.classList.add('hidden'));

      // Show corresponding section
      const targetId = this.id.replace('-btn', '-section');
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('fade-in');
      }

      // Update page title
      const buttonText = this.textContent.trim();
      pageTitle.textContent = buttonText;
    });
  });

  // Header user click → open profile section
  if (headerUser && profileSection) {
    headerUser.addEventListener('click', function () {
      // Clear active state from sidebar nav
      navButtons.forEach(btn => btn.classList.remove('active'));

      // Hide all sections
      contentSections.forEach(section => section.classList.add('hidden'));

      // Show profile section
      profileSection.classList.remove('hidden');
      profileSection.classList.add('fade-in');

      // Update title
      pageTitle.textContent = 'Profile Settings';
    });
  }

  // Logout
  if (userLogoutBtn) {
    userLogoutBtn.addEventListener('click', function () {
      window.location.href = 'login.html';
    });
  }

  // Sales functionality
  let cart = [];
  // selectedProductId was unused; keeping state minimal for backend integration
  const products = {
    1: { name: 'Laptop', price: 999.99, stock: 15 },
    2: { name: 'Mouse', price: 25.99, stock: 50 },
    3: { name: 'Keyboard', price: 49.99, stock: 30 },
    4: { name: 'Monitor', price: 299.99, stock: 8 },
    5: { name: 'Headphones', price: 79.99, stock: 20 }
  };

  const productSearch = document.getElementById('product-search');
  const productList = document.getElementById('product-list');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const amountTendered = document.getElementById('amount-tendered');
  const changeAmount = document.getElementById('change-amount');
  const checkoutBtn = document.getElementById('checkout-btn');

  // Product search functionality
  productSearch.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const productItems = productList.querySelectorAll('.product-item');

    productItems.forEach(item => {
      const productName = item.querySelector('.font-medium').textContent.toLowerCase();
      if (productName.includes(searchTerm)) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  });

  // Product selection - automatically add to cart
  productList.addEventListener('click', function(e) {
    const productItem = e.target.closest('.product-item');
    if (productItem) {
      const productId = productItem.dataset.id;
      const product = products[productId];

      // Check if item is in stock
      if (product.stock <= 0) {
        alert('This item is out of stock.');
        return;
      }

      // Check if already in cart
      const existingItem = cart.find(item => item.id === productId);

      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          alert(`Cannot add more items. Only ${product.stock} items available in stock.`);
          return;
        }
        existingItem.quantity += 1;
      } else {
        cart.push({
          id: productId,
          name: product.name,
          price: product.price,
          quantity: 1
        });
      }

      updateCart();

      // Visual feedback
      productItem.style.transform = 'scale(0.95)';
      setTimeout(() => {
        productItem.style.transform = 'scale(1)';
      }, 150);
    }
  });

  function updateCart() {
    cartItems.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;

      const itemElement = document.createElement('div');
      itemElement.className = 'cart-item';
      itemElement.innerHTML = `
        <div class="item-info">
          <div class="font-medium">${item.name}</div>
          <div class="text-sm text-gray-600">$${item.price.toFixed(2)} each</div>
        </div>
        <div class="flex items-center space-x-2">
          <button class="quantity-btn bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded" onclick="changeQuantity('${item.id}', -1)">-</button>
          <span class="quantity-display">${item.quantity}</span>
          <button class="quantity-btn bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded" onclick="changeQuantity('${item.id}', 1)">+</button>
        </div>
        <div class="item-price">$${itemTotal.toFixed(2)}</div>
        <button class="remove-btn" onclick="removeFromCart('${item.id}')">
          <i class="fas fa-trash"></i>
        </button>
      `;
      cartItems.appendChild(itemElement);
    });

    cartTotal.textContent = `$${total.toFixed(2)}`;
    checkoutBtn.disabled = cart.length === 0;
    calculateChange();
  }

  window.changeQuantity = function(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
      const newQuantity = item.quantity + change;
      const product = products[productId];

      if (newQuantity < 1) {
        removeFromCart(productId);
        return;
      }

      if (newQuantity > product.stock) {
        alert(`Cannot exceed stock limit of ${product.stock}.`);
        return;
      }

      item.quantity = newQuantity;
      updateCart();
    }
  };

  window.removeFromCart = function(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
  };

  // Amount tendered and change calculation
  amountTendered.addEventListener('input', calculateChange);

  function calculateChange() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tendered = parseFloat(amountTendered.value) || 0;
    const change = tendered - total;

    if (change < 0) {
      changeAmount.textContent = 'Insufficient funds';
      changeAmount.classList.add('text-red-600');
      changeAmount.classList.remove('text-green-600');
      checkoutBtn.disabled = true;
    } else {
      changeAmount.textContent = `$${change.toFixed(2)}`;
      changeAmount.classList.remove('text-red-600');
      changeAmount.classList.add('text-green-600');
      checkoutBtn.disabled = cart.length === 0;
    }
  }

  checkoutBtn.addEventListener('click', function() {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tendered = parseFloat(amountTendered.value) || 0;

    if (tendered < total) {
      alert('Amount tendered is insufficient.');
      return;
    }

    const change = tendered - total;
    const saleItems = cart.map(item => ({ ...item }));
    alert(`Sale completed successfully!\nTotal: $${total.toFixed(2)}\nTendered: $${tendered.toFixed(2)}\nChange: $${change.toFixed(2)}`);

    // Clear cart and inputs
    cart = [];
    updateCart();
    amountTendered.value = '';

    // Add to transactions (mock)
    addTransaction(saleItems, total);
  });

  function addTransaction(items, total) {
    const transactionElement = document.createElement('div');
    transactionElement.className = 'border rounded-lg p-4 transaction-card';
    transactionElement.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h4 class="font-semibold">Transaction #${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}</h4>
          <p class="text-gray-600">${new Date().toLocaleString()}</p>
        </div>
        <span class="text-green-600 font-semibold">$${total.toFixed(2)}</span>
      </div>
      <p class="text-sm text-gray-600 mt-2">Items: ${items.map(item => item.name).join(', ')}</p>
    `;

    const transactionsContainer = document.querySelector('#transactions-section .space-y-4');
    transactionsContainer.insertBefore(transactionElement, transactionsContainer.firstChild);
  }

  // Session management
  const startSessionBtn = document.getElementById('start-session-btn');
  const endSessionBtn = document.getElementById('end-session-btn');
  const sessionInfo = document.getElementById('session-info');
  const sessionTime = document.getElementById('session-time');
  const startAmountSpan = document.getElementById('start-amount');
  let sessionStartTime = null;
  let startAmount = 0;

  startSessionBtn.addEventListener('click', function() {
    const amount = prompt('Enter start amount (default is 0):', '0');
    startAmount = parseFloat(amount) || 0;

    sessionStartTime = new Date();
    sessionTime.textContent = sessionStartTime.toLocaleTimeString();
    startAmountSpan.textContent = startAmount.toFixed(2);

    startSessionBtn.classList.add('hidden');
    endSessionBtn.classList.remove('hidden');
    sessionInfo.classList.remove('hidden');

    alert(`Sale session started with $${startAmount.toFixed(2)}.`);
  });

  endSessionBtn.addEventListener('click', function() {
    if (sessionStartTime) {
      const endTime = new Date();
      const duration = Math.round((endTime - sessionStartTime) / (1000 * 60)); // minutes

      // Calculate session summary (mock)
      const totalSales = 0; // In real app, would calculate from transactions
      const finalAmount = startAmount + totalSales;

      alert(`Session ended!\nDuration: ${duration} minutes\nStart Amount: $${startAmount.toFixed(2)}\nFinal Amount: $${finalAmount.toFixed(2)}\nTotal Sales: $${totalSales.toFixed(2)}`);

      // Reset session
      sessionStartTime = null;
      startAmount = 0;

      startSessionBtn.classList.remove('hidden');
      endSessionBtn.classList.add('hidden');
      sessionInfo.classList.add('hidden');
    }
  });

  // NOTE: Removed global submit handler; backend forms should submit normally.

  // Initialize
  updateCart();
});
