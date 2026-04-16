// Staff Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Navigation
  const navButtons = document.querySelectorAll('.dashboard-nav-btn');
  const contentSections = document.querySelectorAll('.content-section');
  const pageTitle = document.getElementById('page-title');
  const headerProfile = document.getElementById('header-profile');
  const logoutBtn = document.getElementById('logout-btn');
  const profileSection = document.getElementById('profile-section');

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

  // Header profile click → open profile section
  if (headerProfile && profileSection) {
    headerProfile.addEventListener('click', function () {
      // Clear active state from sidebar nav
      navButtons.forEach(btn => btn.classList.remove('active'));

      // Hide all content sections
      contentSections.forEach(section => section.classList.add('hidden'));

      // Show profile section
      profileSection.classList.remove('hidden');
      profileSection.classList.add('fade-in');

      // Update title
      pageTitle.textContent = 'Profile Settings';
    });
  }

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      // Simple mock logout: redirect to login page if available
      window.location.href = 'login.html';
    });
  }

  // Mock data
  let products = [
    { id: 1, name: 'Laptop', category: 'Electronics', price: 999.99, stock: 15, status: 'In Stock' },
    { id: 2, name: 'Mouse', category: 'Accessories', price: 25.99, stock: 50, status: 'In Stock' },
    { id: 3, name: 'Keyboard', category: 'Accessories', price: 49.99, stock: 30, status: 'In Stock' },
    { id: 4, name: 'Monitor', category: 'Electronics', price: 299.99, stock: 8, status: 'Low Stock' },
    { id: 5, name: 'Headphones', category: 'Audio', price: 79.99, stock: 20, status: 'In Stock' }
  ];

  let users = [
    { id: 1, name: 'John Doe', email: 'john.doe@example.com', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com', status: 'inactive' },
    { id: 3, name: 'Mike Brown', email: 'mike.brown@example.com', status: 'inactive' }
  ];

  // Stock filter
  let currentStockFilter = 'all'; // 'all' | 'in' | 'low' | 'out'

  const stockFilterCards = document.querySelectorAll('.stock-filter-card');

  if (stockFilterCards.length) {
    stockFilterCards.forEach(card => {
      card.addEventListener('click', function () {
        const filter = this.dataset.filter || 'all';
        currentStockFilter = filter;

        // Update active state
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

  let editingProduct = null;

  addProductBtn.addEventListener('click', function() {
    editingProduct = null;
    modalTitle.textContent = 'Add Product';
    productForm.reset();
    productModal.style.display = 'block';
  });

  closeModal.addEventListener('click', function() {
    productModal.style.display = 'none';
  });

  window.addEventListener('click', function(event) {
    if (event.target === productModal) {
      productModal.style.display = 'none';
    }
  });

  productForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = new FormData(productForm);
    const productData = {
      name: formData.get('product-name'),
      category: formData.get('product-category'),
      price: parseFloat(formData.get('product-price')),
      stock: parseInt(formData.get('product-stock'))
    };

    if (editingProduct) {
      // Update existing product
      Object.assign(editingProduct, productData);
    } else {
      // Add new product
      productData.id = products.length + 1;
      productData.status = productData.stock > 10 ? 'In Stock' : productData.stock > 0 ? 'Low Stock' : 'Out of Stock';
      products.push(productData);
    }

    updateProductsTable();
    updateStockOverview();
    productModal.style.display = 'none';
  });

  // Product search
  const productSearch = document.createElement('input');
  productSearch.type = 'text';
  productSearch.placeholder = 'Search products...';
  productSearch.className = 'search-input';

  const productsTable = document.querySelector('#stock-section .bg-white:last-child');
  productsTable.insertBefore(productSearch, productsTable.firstChild.nextSibling);

  productSearch.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const rows = document.querySelectorAll('#stock-section tbody tr');

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  });

  // Product table actions
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('edit-btn')) {
      const productId = parseInt(e.target.dataset.id);
      const product = products.find(p => p.id === productId);

      if (product) {
        editingProduct = product;
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
        products = products.filter(p => p.id !== productId);
        updateProductsTable();
        updateStockOverview();
      }
    }
  });

  function updateProductsTable() {
    const tbody = document.querySelector('#stock-section tbody');
    tbody.innerHTML = '';

    let filtered = products.slice();

    if (currentStockFilter === 'in') {
      filtered = filtered.filter(p => p.status === 'In Stock');
    } else if (currentStockFilter === 'low') {
      filtered = filtered.filter(p => p.status === 'Low Stock');
    } else if (currentStockFilter === 'out') {
      filtered = filtered.filter(p => p.status === 'Out of Stock');
    }

    filtered.forEach(product => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10">
              <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                <i class="fas fa-${getIconForCategory(product.category)} text-gray-600"></i>
              </div>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">${product.name}</div>
            </div>
          </div>
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

    // Update the overview cards
    const cards = document.querySelectorAll('#stock-section .grid.grid-cols-1.md\\:grid-cols-4 .text-2xl');
    if (cards.length >= 4) {
      cards[0].textContent = totalProducts;
      cards[1].textContent = inStock;
      cards[2].textContent = lowStock;
      cards[3].textContent = outOfStock;
    }
  }

  // Sales Reports
  const viewSummaryBtns = document.querySelectorAll('.view-summary-btn');
  const exportPdfBtns = document.querySelectorAll('.export-pdf-btn');
  const summaryModal = document.getElementById('summary-modal');
  const summaryContent = document.getElementById('summary-content');
  const summaryClose = summaryModal.querySelector('.close');

  viewSummaryBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const session = this.dataset.session;
      showSessionSummary(session);
    });
  });

  exportPdfBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const session = this.dataset.session;
      exportSessionToPDF(session);
    });
  });

  summaryClose.addEventListener('click', function() {
    summaryModal.style.display = 'none';
  });

  window.addEventListener('click', function(event) {
    if (event.target === summaryModal) {
      summaryModal.style.display = 'none';
    }
  });

  function showSessionSummary(session) {
    // Mock session data
    const sessionData = {
      '2024-01-08-morning': {
        items: [
          { name: 'Laptop', quantity: 1, price: 999.99 },
          { name: 'Mouse', quantity: 2, price: 25.99 }
        ],
        total: 1051.97
      },
      '2024-01-08-evening': {
        items: [
          { name: 'Keyboard', quantity: 1, price: 49.99 },
          { name: 'Headphones', quantity: 1, price: 79.99 }
        ],
        total: 129.98
      },
      '2024-01-07-full': {
        items: [
          { name: 'Monitor', quantity: 1, price: 299.99 },
          { name: 'Mouse', quantity: 3, price: 25.99 }
        ],
        total: 377.96
      }
    };

    const data = sessionData[session];
    if (!data) return;

    let content = `<h4 class="font-semibold mb-4">Session: ${session.replace(/-/g, ' ').replace('full', 'Full Day')}</h4>`;
    content += '<table class="w-full border-collapse border border-gray-300 mb-4">';
    content += '<thead><tr class="bg-gray-100"><th class="border border-gray-300 p-2">Item</th><th class="border border-gray-300 p-2">Qty</th><th class="border border-gray-300 p-2">Price</th><th class="border border-gray-300 p-2">Total</th></tr></thead>';
    content += '<tbody>';

    data.items.forEach(item => {
      const itemTotal = item.quantity * item.price;
      content += `<tr>
        <td class="border border-gray-300 p-2">${item.name}</td>
        <td class="border border-gray-300 p-2">${item.quantity}</td>
        <td class="border border-gray-300 p-2">$${item.price.toFixed(2)}</td>
        <td class="border border-gray-300 p-2">$${itemTotal.toFixed(2)}</td>
      </tr>`;
    });

    content += '</tbody></table>';
    content += `<div class="text-right font-bold">Total Sales: $${data.total.toFixed(2)}</div>`;

    summaryContent.innerHTML = content;
    summaryModal.style.display = 'block';
  }

  function exportSessionToPDF(session) {
    alert(`Exporting ${session} session to PDF... (Mock functionality)`);
  }

  // User Management
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('activate-btn')) {
      const userId = parseInt(e.target.dataset.id);
      const user = users.find(u => u.id === userId);
      if (user) {
        user.status = 'active';
        updateUsersList();
      }
    }

    if (e.target.classList.contains('deactivate-btn')) {
      const userId = parseInt(e.target.dataset.id);
      const user = users.find(u => u.id === userId);
      if (user) {
        user.status = 'inactive';
        updateUsersList();
      }
    }

    if (e.target.classList.contains('delete-user-btn')) {
      const userId = parseInt(e.target.dataset.id);
      if (confirm('Are you sure you want to delete this user?')) {
        users = users.filter(u => u.id !== userId);
        updateUsersList();
      }
    }
  });

  function updateUsersList() {
    const usersContainer = document.querySelector('#users-section .space-y-4');
    usersContainer.innerHTML = '';

    users.forEach(user => {
      const userCard = document.createElement('div');
      userCard.className = 'flex items-center justify-between p-4 border rounded-lg user-card';

      const statusClass = user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
      const statusText = user.status === 'active' ? 'Active' : 'Inactive';

      userCard.innerHTML = `
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            ${user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h4 class="font-semibold">${user.name}</h4>
            <p class="text-gray-600 text-sm">${user.email}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">${statusText}</span>
          ${user.status === 'inactive' ?
            `<button class="text-green-600 hover:text-green-900 text-sm activate-btn" data-id="${user.id}">Activate</button>` :
            `<button class="text-yellow-600 hover:text-yellow-900 text-sm deactivate-btn" data-id="${user.id}">Deactivate</button>`
          }
          <button class="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
          <button class="text-red-600 hover:text-red-900 text-sm delete-user-btn" data-id="${user.id}">Delete</button>
        </div>
      `;

      usersContainer.appendChild(userCard);
    });
  }

  // Initialize
  updateProductsTable();
  updateStockOverview();
  updateUsersList();

  // Form submissions (prevent default for demo)
  document.addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Form submitted successfully! (This is a demo)');
  });
});
