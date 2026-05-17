// User Dashboard JavaScript

// Toast Notification System
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  
  let bgClass = 'bg-blue-500';
  if (type === 'success') bgClass = 'bg-green-500';
  if (type === 'error') bgClass = 'bg-red-500';
  if (type === 'warning') bgClass = 'bg-yellow-500';

  toast.className = `flex items-center w-full max-w-xs p-4 mb-4 text-white ${bgClass} rounded-lg shadow fade-in`;
  toast.innerHTML = `
    <div class="ml-3 text-sm font-normal">${message}</div>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.remove('fade-in');
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'fixed top-5 right-5 z-50 flex flex-col gap-2';
  document.body.appendChild(container);
  return container;
}

document.addEventListener('DOMContentLoaded', function() {
  // Navigation
  const navButtons = document.querySelectorAll('.dashboard-nav-btn');
  const contentSections = document.querySelectorAll('.content-section');
  const pageTitle = document.getElementById('page-title');
  const headerUser = document.getElementById('header-user');
  const profileSection = document.getElementById('profile-section');
  const userLogoutBtn = document.getElementById('user-logout-btn');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.dashboard-sidebar');

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', function() {
      sidebar.classList.toggle('open');
    });
  }

  navButtons.forEach(button => {
    button.addEventListener('click', function() {
      navButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');

      contentSections.forEach(section => section.classList.add('hidden'));

      const targetId = this.id.replace('-btn', '-section');
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('fade-in');
      }

      const buttonText = this.textContent.trim();
      pageTitle.textContent = buttonText;
      
      if (window.innerWidth <= 1024 && sidebar) {
        sidebar.classList.remove('open');
      }
    });
  });

  if (headerUser && profileSection) {
    headerUser.addEventListener('click', function () {
      navButtons.forEach(btn => btn.classList.remove('active'));
      contentSections.forEach(section => section.classList.add('hidden'));
      profileSection.classList.remove('hidden');
      profileSection.classList.add('fade-in');
      pageTitle.textContent = 'Profile Settings';
    });
  }

  if (userLogoutBtn) {
    userLogoutBtn.addEventListener('click', function () {
      window.location.href = '/logout';
    });
  }

  // Fetch Profile
  async function fetchProfile() {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const user = await res.json();
        const nameEl = document.querySelector('.dashboard-user-name');
        if (nameEl) nameEl.textContent = user.name;
        
        // Update profile form if elements exist
        const nameInput = document.getElementById('profile-name');
        const usernameInput = document.getElementById('profile-username');
        const emailInput = document.getElementById('profile-email');
        if (nameInput) nameInput.value = user.name;
        if (usernameInput) usernameInput.value = user.username;
        if (emailInput) emailInput.value = user.email;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Sales functionality
  let cart = [];
  let products = {}; // Dictionary by ID

  const productSearch = document.getElementById('product-search');
  const productList = document.getElementById('product-list');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const amountTendered = document.getElementById('amount-tendered');
  const changeAmount = document.getElementById('change-amount');
  const checkoutBtn = document.getElementById('checkout-btn');

  // Session Management
  let sessionActive = false;
  const startSessionBtn = document.getElementById('start-session-btn');
  const endSessionBtn = document.getElementById('end-session-btn');
  const sessionInfo = document.getElementById('session-info');
  const sessionTimeEl = document.getElementById('session-time');

  let currentSessionId = null;

  if (startSessionBtn && endSessionBtn) {
    startSessionBtn.addEventListener('click', function() {
      sessionActive = true;
      currentSessionId = 'SESS-' + Date.now();
      startSessionBtn.classList.add('hidden');
      endSessionBtn.classList.remove('hidden');
      sessionInfo.classList.remove('hidden');
      sessionTimeEl.textContent = new Date().toLocaleTimeString();
      showToast('Sale session started.', 'success');
    });

    endSessionBtn.addEventListener('click', function() {
      if (cart.length > 0) {
        if (!confirm('You have items in your cart. Ending the session will clear the cart. Continue?')) {
          return;
        }
      }
      sessionActive = false;
      currentSessionId = null;
      cart = [];
      updateCart();
      amountTendered.value = '';
      startSessionBtn.classList.remove('hidden');
      endSessionBtn.classList.add('hidden');
      sessionInfo.classList.add('hidden');
      showToast('Sale session ended.', 'info');
    });
  }

  // Fetch Products
  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const fetchedProducts = await res.json();
        products = {};
        fetchedProducts.forEach(p => products[p.id] = p);
        renderProductList();
      }
    } catch (err) {
      showToast('Error loading products', 'error');
    }
  }

  function renderProductList() {
    productList.innerHTML = '';
    Object.values(products).forEach(product => {
      const el = document.createElement('div');
      el.className = 'product-item border rounded-lg p-3 cursor-pointer hover:bg-gray-50';
      el.dataset.id = product.id;
      
      const inStock = product.stock > 0;
      const stockColor = inStock ? 'text-gray-600' : 'text-red-500 font-bold';
      const stockText = inStock ? `Stock: ${product.stock}` : 'Out of Stock';

      el.innerHTML = `
        <div class="font-medium">${product.name}</div>
        <div class="text-sm ${stockColor}">Price: $${product.price.toFixed(2)} | ${stockText}</div>
      `;
      productList.appendChild(el);
    });
  }

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

  productList.addEventListener('click', function(e) {
    if (!sessionActive) {
      showToast('Please start a sale session first.', 'warning');
      return;
    }

    const productItem = e.target.closest('.product-item');
    if (productItem) {
      const productId = parseInt(productItem.dataset.id);
      const product = products[productId];

      if (product.stock <= 0) {
        showToast('This item is out of stock.', 'warning');
        return;
      }

      const existingItem = cart.find(item => item.id === productId);

      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          showToast(`Cannot add more. Only ${product.stock} items available.`, 'warning');
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
          <button class="quantity-btn bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded" onclick="changeQuantity(${item.id}, -1)">-</button>
          <span class="quantity-display">${item.quantity}</span>
          <button class="quantity-btn bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded" onclick="changeQuantity(${item.id}, 1)">+</button>
        </div>
        <div class="item-price">$${itemTotal.toFixed(2)}</div>
        <button class="remove-btn" onclick="removeFromCart(${item.id})">
          <i class="bx bx-trash text-lg"></i>
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
        showToast(`Cannot exceed stock limit of ${product.stock}.`, 'warning');
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

  checkoutBtn.addEventListener('click', async function() {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tendered = parseFloat(amountTendered.value) || 0;

    if (tendered < total) {
      showToast('Amount tendered is insufficient.', 'error');
      return;
    }

    checkoutBtn.disabled = true;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, tendered, session_id: currentSessionId })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Sale completed! Change: $${data.change.toFixed(2)}`, 'success');
        
        // Clear cart and inputs
        cart = [];
        const amountTenderedValue = amountTendered.value;
        amountTendered.value = '';
        updateCart();

        // Fetch updated transactions from backend
        fetchTransactions();

        // Refresh products to get updated stock
        fetchProducts();

        // Check auto-print setting and print if enabled
        try {
          const settingsRes = await fetch('/api/settings');
          if (settingsRes.ok) {
            const settings = await settingsRes.json();
            if (settings.auto_print === 'true') {
              printReceipt(data.sale_id, data.total, amountTenderedValue, data.change, data.created_at);
            }
          }
        } catch (e) {
          console.error("Auto-print check failed", e);
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Checkout failed', 'error');
      }
    } catch (err) {
      showToast('An error occurred during checkout', 'error');
    } finally {
      checkoutBtn.disabled = cart.length === 0;
    }
  });

  async function fetchTransactions() {
    try {
      const res = await fetch('/api/sales');
      if (res.ok) {
        const sales = await res.json();
        const transactionsContainer = document.querySelector('#transactions-section .space-y-4');
        if (!transactionsContainer) return;
        
        transactionsContainer.innerHTML = '';
        if (sales.length === 0) {
          transactionsContainer.innerHTML = '<p class="text-gray-500">No transactions found.</p>';
          return;
        }

        sales.forEach(sale => {
          const transactionElement = document.createElement('div');
          transactionElement.className = 'border rounded-lg p-4 transaction-card';
          transactionElement.innerHTML = `
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-semibold">${sale.display_id && sale.display_id.startsWith('SESS') ? 'Session' : 'Transaction'} #${sale.display_id}</h4>
                <p class="text-gray-600">${new Date(sale.created_at).toLocaleString()}</p>
              </div>
              <span class="text-green-600 font-semibold">$${sale.total_amount.toFixed(2)}</span>
            </div>
            <div class="flex justify-between items-center mt-2">
              <p class="text-sm text-gray-600">Sale Completed</p>
              <button class="text-blue-500 hover:text-blue-700 text-sm" onclick="printReceipt('${sale.display_id}', ${sale.total_amount}, ${sale.tendered}, ${sale.change_amount}, '${sale.created_at}')">
                <i class="fas fa-print mr-1"></i>Print Receipt
              </button>
            </div>
          `;
          transactionsContainer.appendChild(transactionElement);
        });
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }

  // Print Receipt functionality
  window.printReceipt = async function(saleId, total, tendered, change, date) {
    try {
      // Fetch settings and sale details in parallel
      const [settingsRes, saleRes] = await Promise.all([
        fetch('/api/settings'),
        fetch(`/api/sales/${saleId}`)
      ]);
      
      let settings = {
        store_name: 'Retail POS Store',
        store_address: '123 Main St, City, State',
        store_contact: '(555) 123-4567',
        store_footer: 'Thank you for your purchase!'
      };
      
      if (settingsRes.ok) {
        const fetchedSettings = await settingsRes.json();
        settings = { ...settings, ...fetchedSettings };
      }

      let itemsHtml = '<p><em>Error loading items</em></p>';
      
      if (saleRes.ok) {
        const items = await saleRes.json();
        itemsHtml = `
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
            <thead style="border-bottom: 1px solid #000;">
              <tr>
                <th style="text-align: left; padding: 5px 0;">Item</th>
                <th style="text-align: right; padding: 5px 0;">Qty</th>
                <th style="text-align: right; padding: 5px 0;">Price</th>
                <th style="text-align: right; padding: 5px 0;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td style="padding: 5px 0;">${item.name}</td>
                  <td style="text-align: right; padding: 5px 0;">${item.quantity}</td>
                  <td style="text-align: right; padding: 5px 0;">$${Number(item.price).toFixed(2)}</td>
                  <td style="text-align: right; padding: 5px 0;">$${(Number(item.price) * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      const printWindow = window.open('', '_blank', 'width=400,height=600');
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${saleId}</title>
            <style>
              @page { margin: 0; size: ${settings.paper_size && settings.paper_size !== 'auto' ? settings.paper_size : 'auto'}; }
              body { font-family: 'Courier New', Courier, monospace; margin: 10px; font-size: 14px; width: ${settings.paper_size ? settings.paper_size.split(' ')[0] : 'auto'}; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
              .details { margin-bottom: 20px; }
              .totals { border-top: 1px dashed #000; padding-top: 10px; }
              .totals-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .footer { text-align: center; margin-top: 20px; font-size: 0.9em; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${settings.store_name || 'Retail POS'}</h2>
              ${settings.store_address ? `<p>${settings.store_address}</p>` : ''}
              ${settings.store_contact ? `<p>${settings.store_contact}</p>` : ''}
              <p style="margin-top: 10px;">Receipt #${saleId}</p>
              <p>${new Date(date).toLocaleString()}</p>
            </div>
            <div class="details">
              ${itemsHtml}
            </div>
            <div class="totals">
              <div class="totals-row"><span><strong>Total Amount:</strong></span> <span>$${Number(total).toFixed(2)}</span></div>
              <div class="totals-row"><span><strong>Tendered:</strong></span> <span>$${Number(tendered).toFixed(2)}</span></div>
              <div class="totals-row"><span><strong>Change:</strong></span> <span>$${Number(change).toFixed(2)}</span></div>
            </div>
            <div class="footer">
              <p>${settings.store_footer || 'Thank you for your purchase!'}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      // Delay printing slightly to ensure content is fully loaded
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (err) {
      showToast('Error generating receipt', 'error');
    }
  };

  // Profile Form update handling
  const profileForms = document.querySelectorAll('#profile-section form');
  if (profileForms.length > 0) {
    profileForms[0].addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('profile-name').value;
      const username = document.getElementById('profile-username').value;
      const email = document.getElementById('profile-email').value;

      try {
        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, email })
        });
        if (res.ok) {
          showToast('Profile updated!', 'success');
          fetchProfile(); // Refresh Header
        } else {
          showToast('Failed to update profile', 'error');
        }
      } catch (err) {
        showToast('Error', 'error');
      }
    });
  }

  if (profileForms.length > 1) {
    profileForms[1].addEventListener('submit', async function(e) {
      e.preventDefault();
      const inputs = this.querySelectorAll('input');
      const currentPassword = inputs[0].value;
      const newPassword = inputs[1].value;
      const confirmPassword = inputs[2].value;

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
      }

      try {
        const res = await fetch('/api/user/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
        });
        if (res.ok) {
          showToast('Password updated!', 'success');
          this.reset();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update password', 'error');
        }
      } catch (err) {
        showToast('Error updating password', 'error');
      }
    });
  }

  // Initialize
  fetchProfile();
  fetchProducts();
  fetchTransactions();
});
