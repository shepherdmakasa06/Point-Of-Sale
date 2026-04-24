from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import pymysql
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Database configuration
DB_HOST = 'localhost'
DB_USER = 'root'
DB_PASSWORD = '' # Adjust if needed
DB_NAME = 'retail_pos'

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Determine if it's user or staff login based on a hidden field or form action,
        # but the forms are in the same HTML, we might need to handle this differently.
        # Let's assume the form passes 'login_type' as 'user' or 'staff'.
        login_type = request.form.get('login_type')
        username = request.form.get('username')
        password = request.form.get('password')

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                sql = "SELECT * FROM users WHERE username=%s AND role=%s"
                cursor.execute(sql, (username, login_type))
                user = cursor.fetchone()
                if user and check_password_hash(user['password_hash'], password):
                    if not user['is_active']:
                        flash('User inactive, wait for approval', 'error')
                        return redirect(url_for('login'))

                    session['user_id'] = user['id']
                    session['username'] = user['username']
                    session['role'] = user['role']
                    
                    if login_type == 'staff':
                        return redirect(url_for('staff_dashboard'))
                    else:
                        return redirect(url_for('user_dashboard'))
                else:
                    flash('Invalid username or password', 'error')
        finally:
            conn.close()
            
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        password_confirm = request.form.get('password_confirm')
        
        username = request.form.get('username')

        if password != password_confirm:
            flash('Passwords do not match!', 'error')
            return redirect(url_for('register'))

        hashed_password = generate_password_hash(password)
        role = 'user' # default role
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # Check if email exists
                cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
                if cursor.fetchone():
                    flash('Email already registered!', 'error')
                    return redirect(url_for('register'))
                
                # Check if username exists
                cursor.execute("SELECT id FROM users WHERE username=%s", (username,))
                if cursor.fetchone():
                    flash('Username already taken!', 'error')
                    return redirect(url_for('register'))
                    
                sql = "INSERT INTO users (name, email, username, password_hash, role, is_active) VALUES (%s, %s, %s, %s, %s, %s)"
                cursor.execute(sql, (name, email, username, hashed_password, role, False))
            conn.commit()
            flash('Registration successful! Please wait for approval before logging in.', 'success')
            return redirect(url_for('login'))
        finally:
            conn.close()

    return render_template('register.html')

@app.route('/user_dashboard')
def user_dashboard():
    if 'user_id' not in session or session['role'] != 'user':
        return redirect(url_for('login'))
    return render_template('user_dashboard.html', username=session['username'])

@app.route('/staff_dashboard')
def staff_dashboard():
    if 'user_id' not in session or session['role'] != 'staff':
        return redirect(url_for('login'))
    return render_template('staff_dashboard.html', username=session['username'])

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# API Endpoints
@app.route('/api/user/profile', methods=['GET', 'PUT'])
def api_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 403
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT id, name, email, username, role FROM users WHERE id=%s", (session['user_id'],))
                user = cursor.fetchone()
                return jsonify(user)
            elif request.method == 'PUT':
                data = request.json
                name = data.get('name')
                username = data.get('username')
                email = data.get('email')
                
                # Check if email is taken by another user
                cursor.execute("SELECT id FROM users WHERE email=%s AND id!=%s", (email, session['user_id']))
                if cursor.fetchone():
                    return jsonify({'error': 'Email is already taken by another account'}), 400
                    
                # Check if username is taken by another user
                cursor.execute("SELECT id FROM users WHERE username=%s AND id!=%s", (username, session['user_id']))
                if cursor.fetchone():
                    return jsonify({'error': 'Username is already taken by another account'}), 400
                
                cursor.execute("UPDATE users SET name=%s, username=%s, email=%s WHERE id=%s", (name, username, email, session['user_id']))
                conn.commit()
                return jsonify({'message': 'Profile updated successfully'})
    finally:
        conn.close()

@app.route('/api/settings', methods=['GET', 'PUT'])
def api_settings():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 403
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT setting_key, setting_value FROM settings")
                settings_list = cursor.fetchall()
                settings = {item['setting_key']: item['setting_value'] for item in settings_list}
                return jsonify(settings)
            elif request.method == 'PUT':
                if session.get('role') != 'staff':
                    return jsonify({'error': 'Unauthorized'}), 403
                data = request.json
                for key, value in data.items():
                    cursor.execute("INSERT INTO settings (setting_key, setting_value) VALUES (%s, %s) ON DUPLICATE KEY UPDATE setting_value=%s", (key, value, value))
                conn.commit()
                return jsonify({'message': 'Settings updated successfully'})
    finally:
        conn.close()

@app.route('/api/user/password', methods=['PUT'])
def api_user_password():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.json
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Missing password fields'}), 400
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT password_hash FROM users WHERE id=%s", (session['user_id'],))
            user = cursor.fetchone()
            
            if not user or not check_password_hash(user['password_hash'], current_password):
                return jsonify({'error': 'Incorrect current password'}), 400
                
            new_hash = generate_password_hash(new_password)
            cursor.execute("UPDATE users SET password_hash=%s WHERE id=%s", (new_hash, session['user_id']))
            conn.commit()
            return jsonify({'message': 'Password updated successfully'})
    finally:
        conn.close()

@app.route('/api/users', methods=['GET', 'POST'])
def api_users():
    if 'user_id' not in session or session.get('role') != 'staff':
        return jsonify({'error': 'Unauthorized'}), 403
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT id, name, email, username, role, is_active, created_at FROM users ORDER BY id DESC")
                return jsonify(cursor.fetchall())
            elif request.method == 'POST':
                data = request.json
                name = data.get('name')
                email = data.get('email')
                username = data.get('username') or email.split('@')[0]
                role = data.get('role', 'user')
                password = data.get('password')
                
                # Check email
                cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
                if cursor.fetchone():
                    return jsonify({'error': 'Email already exists'}), 400
                    
                hashed_password = generate_password_hash(password)
                cursor.execute("INSERT INTO users (name, email, username, password_hash, role) VALUES (%s, %s, %s, %s, %s)",
                               (name, email, username, hashed_password, role))
                conn.commit()
                return jsonify({'message': 'User created successfully'}), 201
    finally:
        conn.close()

@app.route('/api/users/<int:u_id>', methods=['PUT', 'DELETE'])
def api_user_detail(u_id):
    if 'user_id' not in session or session.get('role') != 'staff':
        return jsonify({'error': 'Unauthorized'}), 403
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'PUT':
                data = request.json
                name = data.get('name')
                email = data.get('email')
                role = data.get('role')
                is_active = data.get('is_active')
                
                if is_active is not None:
                    cursor.execute("UPDATE users SET name=%s, email=%s, role=%s, is_active=%s WHERE id=%s", (name, email, role, is_active, u_id))
                else:
                    cursor.execute("UPDATE users SET name=%s, email=%s, role=%s WHERE id=%s", (name, email, role, u_id))
                conn.commit()
                return jsonify({'message': 'User updated successfully'})
            elif request.method == 'DELETE':
                if u_id == session['user_id']:
                    return jsonify({'error': 'Cannot delete your own account'}), 400
                cursor.execute("DELETE FROM users WHERE id=%s", (u_id,))
                conn.commit()
                return jsonify({'message': 'User deleted successfully'})
    finally:
        conn.close()

@app.route('/api/products', methods=['GET', 'POST'])
def api_products():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT * FROM products ORDER BY id DESC")
                products = cursor.fetchall()
                for p in products:
                    p['price'] = float(p['price'])
                return jsonify(products)
            
            elif request.method == 'POST':
                if 'user_id' not in session or session.get('role') != 'staff':
                    return jsonify({'error': 'Unauthorized'}), 403
                
                data = request.json
                name = data.get('name')
                category = data.get('category')
                price = data.get('price')
                stock = data.get('stock')
                
                status = 'In Stock' if int(stock) > 10 else ('Low Stock' if int(stock) > 0 else 'Out of Stock')
                
                sql = "INSERT INTO products (name, category, price, stock, status) VALUES (%s, %s, %s, %s, %s)"
                cursor.execute(sql, (name, category, price, stock, status))
                conn.commit()
                return jsonify({'message': 'Product added successfully'}), 201
    finally:
        conn.close()

@app.route('/api/products/<int:product_id>', methods=['PUT', 'DELETE'])
def api_product_detail(product_id):
    if 'user_id' not in session or session.get('role') != 'staff':
        return jsonify({'error': 'Unauthorized'}), 403
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'PUT':
                data = request.json
                name = data.get('name')
                category = data.get('category')
                price = data.get('price')
                stock = data.get('stock')
                
                status = 'In Stock' if int(stock) > 10 else ('Low Stock' if int(stock) > 0 else 'Out of Stock')
                
                sql = "UPDATE products SET name=%s, category=%s, price=%s, stock=%s, status=%s WHERE id=%s"
                cursor.execute(sql, (name, category, price, stock, status, product_id))
                conn.commit()
                return jsonify({'message': 'Product updated successfully'})
                
            elif request.method == 'DELETE':
                cursor.execute("DELETE FROM products WHERE id=%s", (product_id,))
                conn.commit()
                return jsonify({'message': 'Product deleted successfully'})
    finally:
        conn.close()

@app.route('/api/checkout', methods=['POST'])
def api_checkout():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.json
    cart = data.get('cart', [])
    tendered = float(data.get('tendered', 0))
    
    if not cart:
        return jsonify({'error': 'Cart is empty'}), 400
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            total = 0
            for item in cart:
                cursor.execute("SELECT stock, price FROM products WHERE id=%s", (item['id'],))
                product = cursor.fetchone()
                if not product or product['stock'] < item['quantity']:
                    return jsonify({'error': f"Insufficient stock for {item['name']}"}), 400
                total += float(product['price']) * item['quantity']
                
            if tendered < total:
                return jsonify({'error': 'Amount tendered is insufficient'}), 400
                
            change = tendered - total
            
            sql = "INSERT INTO sales (user_id, total_amount, tendered, change_amount) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql, (session['user_id'], total, tendered, change))
            sale_id = cursor.lastrowid
            
            for item in cart:
                cursor.execute("SELECT price FROM products WHERE id=%s", (item['id'],))
                price = cursor.fetchone()['price']
                
                cursor.execute("INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (%s, %s, %s, %s)",
                               (sale_id, item['id'], item['quantity'], price))
                
                cursor.execute("UPDATE products SET stock = stock - %s WHERE id=%s", (item['quantity'], item['id']))
                
                cursor.execute("SELECT stock FROM products WHERE id=%s", (item['id'],))
                new_stock = cursor.fetchone()['stock']
                new_status = 'In Stock' if new_stock > 10 else ('Low Stock' if new_stock > 0 else 'Out of Stock')
                cursor.execute("UPDATE products SET status=%s WHERE id=%s", (new_status, item['id']))
                
            conn.commit()
            cursor.execute("SELECT created_at FROM sales WHERE id=%s", (sale_id,))
            created_at = cursor.fetchone()['created_at']
            return jsonify({
                'message': 'Checkout successful', 
                'total': total, 
                'change': change,
                'sale_id': sale_id,
                'created_at': created_at
            })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/sales', methods=['GET'])
def api_sales():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 403
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if session.get('role') == 'staff':
                cursor.execute("SELECT s.*, u.name as user_name FROM sales s JOIN users u ON s.user_id = u.id ORDER BY s.id DESC")
            else:
                cursor.execute("SELECT s.*, u.name as user_name FROM sales s JOIN users u ON s.user_id = u.id WHERE s.user_id=%s ORDER BY s.id DESC", (session['user_id'],))
            sales = cursor.fetchall()
            for sale in sales:
                sale['total_amount'] = float(sale['total_amount'])
                sale['tendered'] = float(sale['tendered'])
                sale['change_amount'] = float(sale['change_amount'])
            return jsonify(sales)
    finally:
        conn.close()

@app.route('/api/sales/<int:sale_id>', methods=['GET'])
def api_sale_detail(sale_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 403
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM sales WHERE id=%s", (sale_id,))
            sale = cursor.fetchone()
            if not sale:
                return jsonify({'error': 'Sale not found'}), 404
                
            if session.get('role') != 'staff' and sale['user_id'] != session['user_id']:
                return jsonify({'error': 'Unauthorized'}), 403
                
            cursor.execute("SELECT si.*, p.name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id=%s", (sale_id,))
            items = cursor.fetchall()
            for item in items:
                item['price'] = float(item['price'])
            return jsonify(items)
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
