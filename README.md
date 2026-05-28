# 🛒 Retail POS System

A modern, web-based **Point-of-Sale (POS) system** designed to streamline retail business operations such as sales processing, inventory management, and user access control. Built using **Flask** and **MySQL**, the system provides a secure and efficient workflow for both administrators and cashiers.

---

## Key Features

###  User Roles & Authentication

* Dual-role system: **Admin / Staff** and **Cashier**
* Secure login system using password hashing (`werkzeug.security`)
* User registration with admin approval before access is granted

### Inventory Management

* Add, update, delete, and view products
* Real-time stock tracking
* Automatic stock status indicators:

  * In Stock
  * Low Stock
  * Out of Stock

### Sales & Checkout System

* Fast and simple checkout process
* Accurate transaction recording
* Automatic calculation of totals, payments, and change
* Full sales history tracking

###  Admin Dashboard

* Overview of system activity
* Manage users and inventory
* View sales reports and records

---

## Technology Stack

* **Backend:** Python (Flask)
* **Database:** MySQL (`pymysql`)
* **Frontend:** HTML5, CSS3, JavaScript
* **Authentication:** Session-based login system
* **Security:** Password hashing with Werkzeug

---

## Getting Started

### Prerequisites

* Python 3.8+
* MySQL Server
* pip package manager

---

###  Installation

1. Clone the repository

```bash
git clone https://github.com/shepherdmakasa06/Point-of-Sale.git
cd Point-of-Sale
```

2. Create virtual environment (recommended)

```bash
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows
```

3. Install dependencies

```bash
pip install -r requirements.txt
```

4. Configure database

* Create a MySQL database
* Import the provided SQL file (if available)
* Update database credentials in your config file

5. Run the application

```bash
python app.py
```

6. Open in browser

```
http://127.0.0.1:5000
```

---

##  Project Structure

```
Point-of-Sale/
├── static/              # CSS, JavaScript, assets
├── templates/          # HTML pages
├── database/           # SQL files
├── app.py              # Main Flask application
├── config.py           # Database configuration
└── requirements.txt    # Project dependencies
```

---

##  Future Improvements

* Barcode scanner integration
* PDF invoice generation
* Email receipts
* Advanced sales analytics dashboard
* Mobile-friendly POS interface

---

## Author

Shepherd Makasa
Aspiring Software Engineer | Full Stack Developer

---

##  Support

If you like this project, feel free to star the repository.
