// Staff Dashboard JavaScript

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
  const headerProfile = document.getElementById('header-profile');
  const logoutBtn = document.getElementById('logout-btn');
  const profileSection = document.getElementById('profile-section');
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

  if (headerProfile && profileSection) {
    headerProfile.addEventListener('click', function () {
      navButtons.forEach(btn => btn.classList.remove('active'));
      contentSections.forEach(section => section.classList.add('hidden'));
      profileSection.classList.remove('hidden');
      profileSection.classList.add('fade-in');
      pageTitle.textContent = 'Profile Settings';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      window.location.href = '/logout';
    });
  }

  // State
  let products = [];
  let users = [];
  let currentStockFilter = 'all'; 

  // Fetch Profile
  async function fetchProfile() {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const user = await res.json();
        const nameEl = document.querySelector('.dashboard-user-name');
        if (nameEl) nameEl.textContent = user.name;
        
        // Update profile form if elements exist
        const nameInput = document.querySelector('#profile-section input[type="text"]');
        const emailInput = document.querySelector('#profile-section input[type="email"]');
        if (nameInput) nameInput.value = user.name;
        if (emailInput) emailInput.value = user.email;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Fetch Products
  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        products = await res.json();
        updateProductsTable();
        updateStockOverview();
      }
    } catch (err) {
      showToast('Error loading products', 'error');
    }
  }

  // Fetch Sales
  async function fetchSales() {
    try {
      const res = await fetch('/api/sales');
      if (res.ok) {
        const sales = await res.json();
        const tbody = document.getElementById('sales-table-body');
        if (tbody) {
          tbody.innerHTML = '';
          if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">No sales found</td></tr>';
          } else {
            sales.forEach(sale => {
              const row = document.createElement('tr');
              row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${sale.display_id && sale.display_id.startsWith('SESS') ? 'Session' : 'Sale'} #${sale.display_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(sale.created_at).toLocaleString()}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${sale.user_name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${sale.total_amount.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button class="text-blue-600 hover:text-blue-900 mr-3 view-sale-btn" data-id="${sale.display_id}" data-date="${sale.created_at}" data-cashier="${sale.user_name}">View Details</button>
                </td>
              `;
              tbody.appendChild(row);
            });
          }
          
        }
      }
    } catch (err) {
      showToast('Error loading sales', 'error');
    }
  }

  // Fetch Users
  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        users = await res.json();
        const tbody = document.getElementById('users-table-body');
        if (tbody) {
          tbody.innerHTML = '';
          if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">No users found</td></tr>';
          } else {
              users.forEach(user => {
              const statusClass = user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
              const statusText = user.is_active ? 'Active' : 'Inactive';
              const toggleText = user.is_active ? 'Deactivate' : 'Activate';
              
              const row = document.createElement('tr');
              row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.role}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${statusText}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(user.created_at).toLocaleDateString()}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button class="text-blue-600 hover:text-blue-900 mr-3 edit-user-btn" data-id="${user.id}">Edit</button>
                  <button class="text-yellow-600 hover:text-yellow-900 mr-3 toggle-user-btn" data-id="${user.id}">${toggleText}</button>
                  <button class="text-red-600 hover:text-red-900 delete-user-btn" data-id="${user.id}">Delete</button>
                </td>
              `;
              tbody.appendChild(row);
            });
          }
        }
      }
    } catch (err) {
      showToast('Error loading users', 'error');
    }
  }

  // User Management Modal
  const addUserBtn = document.getElementById('add-user-btn');
  const userModal = document.getElementById('user-modal');
  const userForm = document.getElementById('user-form');
  const userModalTitle = document.getElementById('user-modal-title');
  const closeUserModal = document.querySelector('.user-close');

  let editingUserId = null;

  if (addUserBtn && userModal && userForm) {
    addUserBtn.addEventListener('click', function() {
      editingUserId = null;
      userModalTitle.textContent = 'Add User';
      userForm.reset();
      document.getElementById('user-password').required = true;
      userModal.style.display = 'block';
    });

    if (closeUserModal) {
      closeUserModal.addEventListener('click', function() {
        userModal.style.display = 'none';
      });
    }

    window.addEventListener('click', function(event) {
      if (event.target === userModal) {
        userModal.style.display = 'none';
      }
      const summaryModal = document.getElementById('summary-modal');
      if (event.target === summaryModal) {
        summaryModal.style.display = 'none';
      }
    });

    document.addEventListener('click', async function(e) {
      // Sale Details Modal
      if (e.target.classList.contains('view-sale-btn')) {
        const saleId = e.target.dataset.id;
        const saleDate = new Date(e.target.dataset.date).toLocaleString();
        const saleCashier = e.target.dataset.cashier;
        const summaryModal = document.getElementById('summary-modal');
        const summaryContent = document.getElementById('summary-content');
        
        try {
          const res = await fetch(`/api/sales/${saleId}`);
          if (res.ok) {
            const items = await res.json();
            let itemsHtml = `
              <div class="mb-4 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
                <p><strong>Date:</strong> ${saleDate}</p>
                <p><strong>Cashier:</strong> ${saleCashier}</p>
              </div>
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 border-b">
                  <tr>
                    <th class="px-4 py-2 font-medium text-gray-500">Item</th>
                    <th class="px-4 py-2 font-medium text-gray-500 text-right">Qty</th>
                    <th class="px-4 py-2 font-medium text-gray-500 text-right">Price</th>
                    <th class="px-4 py-2 font-medium text-gray-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
            `;
            
            let grandTotal = 0;
            items.forEach(item => {
              const itemTotal = item.quantity * item.price;
              grandTotal += itemTotal;
              itemsHtml += `
                <tr>
                  <td class="px-4 py-2">${item.name}</td>
                  <td class="px-4 py-2 text-right">${item.quantity}</td>
                  <td class="px-4 py-2 text-right">$${Number(item.price).toFixed(2)}</td>
                  <td class="px-4 py-2 text-right font-medium">$${itemTotal.toFixed(2)}</td>
                </tr>
              `;
            });
            
            itemsHtml += `
                </tbody>
              </table>
              <div class="mt-4 text-right">
                <p class="text-lg font-bold">Grand Total: <span class="text-green-600">$${grandTotal.toFixed(2)}</span></p>
              </div>
            `;
            summaryContent.innerHTML = itemsHtml;
            summaryModal.style.display = 'block';
            
            const exportBtn = document.getElementById('export-pdf-btn');
            if (exportBtn) {
              exportBtn.dataset.saleId = saleId;
            }
          }
        } catch (err) {
          showToast('Failed to load sale details', 'error');
        }
      }
      
      // Export PDF Button
      if (e.target.closest('#export-pdf-btn')) {
        const btn = e.target.closest('#export-pdf-btn');
        const saleId = btn.dataset.saleId;
        const element = document.getElementById('summary-content');
        if (element && saleId) {
          const opt = {
            margin:       0.5,
            filename:     `Sale_Summary_${saleId}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
          };
          html2pdf().set(opt).from(element).save();
        }
      }
      
      // Close Modal Button
      if (e.target.classList.contains('close') && e.target.closest('#summary-modal')) {
        document.getElementById('summary-modal').style.display = 'none';
      }
    });

    userForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const userData = {
        name: document.getElementById('user-name').value,
        username: document.getElementById('user-username').value,
        email: document.getElementById('user-email').value,
        role: document.getElementById('user-role').value
      };
      
      const password = document.getElementById('user-password').value;
      if (password) {
        userData.password = password;
      }

      try {
        const url = editingUserId ? `/api/users/${editingUserId}` : '/api/users';
        const method = editingUserId ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });

        if (res.ok) {
          showToast(editingUserId ? 'User updated successfully!' : 'User added successfully!', 'success');
          userModal.style.display = 'none';
          fetchUsers();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to save user', 'error');
        }
      } catch (err) {
        showToast('An error occurred', 'error');
      }
    });

    document.addEventListener('click', async function(e) {
      if (e.target.classList.contains('edit-user-btn')) {
        const userId = parseInt(e.target.dataset.id);
        const user = users.find(u => u.id === userId);

        if (user) {
          editingUserId = user.id;
          userModalTitle.textContent = 'Edit User';
          document.getElementById('user-name').value = user.name;
          document.getElementById('user-username').value = user.username;
          document.getElementById('user-email').value = user.email;
          document.getElementById('user-role').value = user.role;
          document.getElementById('user-password').value = '';
          document.getElementById('user-password').required = false;
          userModal.style.display = 'block';
        }
      }

      if (e.target.classList.contains('delete-user-btn')) {
        const userId = parseInt(e.target.dataset.id);
        if (confirm('Are you sure you want to delete this user?')) {
          try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            if (res.ok) {
              showToast('User deleted', 'success');
              fetchUsers();
            } else {
              const err = await res.json();
              showToast(err.error || 'Failed to delete user', 'error');
            }
          } catch (err) {
            showToast('An error occurred', 'error');
          }
        }
      }

      if (e.target.classList.contains('toggle-user-btn')) {
        const userId = parseInt(e.target.dataset.id);
        const user = users.find(u => u.id === userId);
        if (user) {
          try {
            const res = await fetch(`/api/users/${userId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: user.name,
                email: user.email,
                role: user.role,
                is_active: !user.is_active
              })
            });
            if (res.ok) {
              showToast(user.is_active ? 'User deactivated' : 'User activated', 'success');
              fetchUsers();
            } else {
              showToast('Failed to update user status', 'error');
            }
          } catch (err) {
            showToast('An error occurred', 'error');
          }
        }
      }
    });
  }

  const stockFilterCards = document.querySelectorAll('.stock-filter-card');
  if (stockFilterCards.length) {
    stockFilterCards.forEach(card => {
      card.addEventListener('click', function () {
        currentStockFilter = this.dataset.filter || 'all';
        stockFilterCards.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        updateProductsTable();
      });
    });
  }

  // Product Management
  const addProductBtn = document.getElementById('add-product-btn');
  const productModal = document.getElementById('product-modal');
  const productForm = document.getElementById('product-form');
  const modalTitle = document.getElementById('modal-title');
  const closeModal = document.querySelector('.close');

  let editingProductId = null;

  addProductBtn.addEventListener('click', function() {
    editingProductId = null;
    modalTitle.textContent = 'Add Product';
    productForm.reset();
    productModal.style.display = 'block';
  });

  closeModal.addEventListener('click', function() {
    productModal.style.display = 'none';
  });

  const stockSearchInput = document.getElementById('stock-search');
  if (stockSearchInput) {
    stockSearchInput.addEventListener('input', updateProductsTable);
  }

  window.addEventListener('click', function(event) {
    if (event.target === productModal) {
      productModal.style.display = 'none';
    }
  });

  productForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(productForm);
    const productData = {
      name: formData.get('product-name'),
      category: formData.get('product-category'),
      price: parseFloat(formData.get('product-price')),
      stock: parseInt(formData.get('product-stock'))
    };

    try {
      const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
      const method = editingProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      if (res.ok) {
        showToast(editingProductId ? 'Product updated successfully!' : 'Product added successfully!', 'success');
        productModal.style.display = 'none';
        fetchProducts();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save product', 'error');
      }
    } catch (err) {
      showToast('An error occurred', 'error');
    }
  });

  // Product search code was removed because it was rendering inside the Out of Stock card

  // Product table actions
  document.addEventListener('click', async function(e) {
    if (e.target.classList.contains('edit-btn')) {
      const productId = parseInt(e.target.dataset.id);
      const product = products.find(p => p.id === productId);

      if (product) {
        editingProductId = product.id;
        modalTitle.textContent = 'Edit Product';
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-stock').value = product.stock;
        productModal.style.display = 'block';
      }
    }

    if (e.target.classList.contains('delete-btn')) {
      const productId = parseInt(e.target.dataset.id);
      if (confirm('Are you sure you want to delete this product?')) {
        try {
          const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
          if (res.ok) {
            showToast('Product deleted', 'success');
            fetchProducts();
          } else {
            showToast('Failed to delete product', 'error');
          }
        } catch (err) {
          showToast('An error occurred', 'error');
        }
      }
    }
  });

  function updateProductsTable() {
    const tbody = document.querySelector('#stock-section tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filtered = products.slice();

    if (currentStockFilter === 'in') {
      filtered = filtered.filter(p => p.status === 'In Stock');
    } else if (currentStockFilter === 'low') {
      filtered = filtered.filter(p => p.status === 'Low Stock');
    } else if (currentStockFilter === 'out') {
      filtered = filtered.filter(p => p.status === 'Out of Stock');
    }

    const searchInput = document.getElementById('stock-search');
    if (searchInput && searchInput.value) {
      const q = searchInput.value.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }

    filtered.forEach(product => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${product.name}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.category}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${product.price.toFixed(2)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.stock}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(product.status)}">${product.status}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button class="text-blue-600 hover:text-blue-900 mr-3 edit-btn" data-id="${product.id}">Edit</button>
          <button class="text-red-600 hover:text-red-900 delete-btn" data-id="${product.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  function getIconForCategory(category) {
    const icons = {
      'Electronics': 'laptop',
      'Accessories': 'mouse',
      'Audio': 'headphones'
    };
    return icons[category] || 'box';
  }

  function getStatusClass(status) {
    const classes = {
      'In Stock': 'bg-green-100 text-green-800',
      'Low Stock': 'bg-yellow-100 text-yellow-800',
      'Out of Stock': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  function updateStockOverview() {
    const totalProducts = products.length;
    const inStock = products.filter(p => p.stock > 10).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
    const outOfStock = products.filter(p => p.stock === 0).length;

    const cards = document.querySelectorAll('#stock-section .grid.grid-cols-1.md\\:grid-cols-4 .text-2xl');
    if (cards.length >= 4) {
      cards[0].textContent = totalProducts;
      cards[1].textContent = inStock;
      cards[2].textContent = lowStock;
      cards[3].textContent = outOfStock;
    }
  }

  // Profile Form update handling
  const profileForms = document.querySelectorAll('#profile-section form');
  if (profileForms.length > 0) {
    profileForms[0].addEventListener('submit', async function(e) {
      e.preventDefault();
      const inputs = this.querySelectorAll('input');
      const name = inputs[0].value + ' ' + inputs[1].value;
      const email = inputs[2].value;

      try {
        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email })
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

  // Settings Logic
  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const settings = await res.json();
        const storeNameEl = document.getElementById('setting-store-name');
        const storeAddressEl = document.getElementById('setting-store-address');
        const storeContactEl = document.getElementById('setting-store-contact');
        const storeFooterEl = document.getElementById('setting-store-footer');
        
        const autoPrintEl = document.getElementById('setting-auto-print');
        const paperSizeEl = document.getElementById('setting-paper-size');
        
        if (storeNameEl && settings.store_name) storeNameEl.value = settings.store_name;
        if (storeAddressEl && settings.store_address) storeAddressEl.value = settings.store_address;
        if (storeContactEl && settings.store_contact) storeContactEl.value = settings.store_contact;
        if (storeFooterEl && settings.store_footer) storeFooterEl.value = settings.store_footer;
        
        if (autoPrintEl && settings.auto_print) autoPrintEl.checked = (settings.auto_print === 'true');
        if (paperSizeEl && settings.paper_size) paperSizeEl.value = settings.paper_size;
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  }

  const receiptSettingsForm = document.getElementById('receipt-settings-form');
  if (receiptSettingsForm) {
    receiptSettingsForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const settingsData = {
        store_name: document.getElementById('setting-store-name').value,
        store_address: document.getElementById('setting-store-address').value,
        store_contact: document.getElementById('setting-store-contact').value,
        store_footer: document.getElementById('setting-store-footer').value
      };

      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsData)
        });
        if (res.ok) {
          showToast('Receipt settings saved successfully!', 'success');
        } else {
          showToast('Failed to save settings', 'error');
        }
      } catch (err) {
        showToast('Error saving settings', 'error');
      }
    });
  }

  const printerSettingsForm = document.getElementById('printer-settings-form');
  if (printerSettingsForm) {
    printerSettingsForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const settingsData = {
        auto_print: document.getElementById('setting-auto-print').checked ? 'true' : 'false',
        paper_size: document.getElementById('setting-paper-size').value
      };

      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsData)
        });
        if (res.ok) {
          showToast('Printer settings saved successfully!', 'success');
        } else {
          showToast('Failed to save printer settings', 'error');
        }
      } catch (err) {
        showToast('Error saving printer settings', 'error');
      }
    });
  }

  // Initialize
  fetchProfile();
  fetchProducts();
  fetchSales();
  fetchUsers();
  fetchSettings();
});
