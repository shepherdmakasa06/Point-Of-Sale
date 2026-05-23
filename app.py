from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import pymysql
from werkzeug.security import generate_password_hash, check_password_hash
import os
import shutil
import subprocess
import tempfile

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

_schema_checked = False

def ensure_database_schema():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SHOW COLUMNS FROM sales LIKE 'session_id'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE sales ADD COLUMN session_id VARCHAR(50) NULL AFTER change_amount")
                cursor.execute("CREATE INDEX idx_sales_session_id ON sales (session_id)")

            cursor.execute("SHOW COLUMNS FROM settings LIKE 'setting_value'")
            setting_value_column = cursor.fetchone()
            if setting_value_column and setting_value_column.get('Type', '').lower() != 'text':
                cursor.execute("ALTER TABLE settings MODIFY setting_value TEXT")

            cursor.execute("""
                INSERT INTO settings (setting_key, setting_value) VALUES
                ('auto_print', 'true'),
                ('paper_size', 'auto'),
                ('show_logo', 'false')
                ON DUPLICATE KEY UPDATE setting_value=setting_value
            """)
        conn.commit()
    finally:
        conn.close()

@app.before_request
def ensure_schema_once():
    global _schema_checked
    if not _schema_checked:
        ensure_database_schema()
        _schema_checked = True

def fetch_settings(cursor):
    cursor.execute("SELECT setting_key, setting_value FROM settings")
    return {item['setting_key']: item['setting_value'] for item in cursor.fetchall()}

def format_sequence(number):
    return str(number).zfill(4)

def get_receipt_data(display_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT IFNULL(s.session_id, CAST(s.id AS CHAR)) as display_id,
                       s.id,
                       s.session_id,
                       s.user_id,
                       u.name as user_name,
                       s.created_at,
                       s.total_amount,
                       s.tendered,
                       s.change_amount
                FROM sales s
                JOIN users u ON s.user_id = u.id
                WHERE s.session_id=%s OR s.id=%s
                ORDER BY s.id ASC
            """, (display_id, display_id))
            sale_rows = cursor.fetchall()
            if not sale_rows:
                return None

            total_amount = sum(float(row['total_amount']) for row in sale_rows)
            tendered = sum(float(row['tendered']) for row in sale_rows)
            change_amount = sum(float(row['change_amount']) for row in sale_rows)
            sale_ids = [row['id'] for row in sale_rows]
            placeholders = ','.join(['%s'] * len(sale_ids))

            cursor.execute(f"""
                SELECT si.product_id, p.name, SUM(si.quantity) as quantity, si.price
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.sale_id IN ({placeholders})
                GROUP BY si.product_id, p.name, si.price
            """, sale_ids)
            items = cursor.fetchall()
            for item in items:
                item['price'] = float(item['price'])
                item['quantity'] = int(item['quantity'])
                item['line_total'] = item['price'] * item['quantity']

            settings = fetch_settings(cursor)
            first_sale = sale_rows[0]
            receipt_number = format_sequence(first_sale['id'])
            return {
                'display_id': first_sale['display_id'],
                'receipt_number': receipt_number,
                'user_id': first_sale['user_id'],
                'user_name': first_sale['user_name'],
                'created_at': first_sale['created_at'],
                'total_amount': total_amount,
                'tendered': tendered,
                'change_amount': change_amount,
                'items': items,
                'settings': settings
            }
    finally:
        conn.close()

def build_receipt_text(receipt):
    settings = receipt['settings']
    paper_size = settings.get('paper_size') or ''
    width = 32 if paper_size.startswith('57mm') else 42
    lines = []
    if settings.get('show_logo') == 'true':
        lines.append('PRO-TECH'.center(width))
    lines.append((settings.get('store_name') or 'Retail POS').center(width))
    if settings.get('store_address'):
        lines.append(settings['store_address'].center(width))
    if settings.get('store_contact'):
        lines.append(settings['store_contact'].center(width))
    lines.extend([
        '-' * width,
        f"Receipt #: {receipt['receipt_number']}",
    ])
    lines.extend([
        f"Date: {receipt['created_at']}",
        f"Cashier: {receipt['user_name']}",
        '-' * width,
    ])

    for item in receipt['items']:
        name = item['name'][:width]
        qty_price = f"{item['quantity']} x ${item['price']:.2f}"
        line_total = f"${item['line_total']:.2f}"
        lines.append(name)
        amount_width = 12
        label_width = width - amount_width
        lines.append(f"{qty_price:<{label_width}}{line_total:>{amount_width}}")

    amount_width = 12
    label_width = width - amount_width
    lines.extend([
        '-' * width,
        f"{'Total:':<{label_width}}${receipt['total_amount']:>{amount_width - 1}.2f}",
        f"{'Tendered:':<{label_width}}${receipt['tendered']:>{amount_width - 1}.2f}",
        f"{'Change:':<{label_width}}${receipt['change_amount']:>{amount_width - 1}.2f}",
        '-' * width,
        (settings.get('store_footer') or 'Thank you for your purchase!').center(width),
        '\n\n'
    ])
    return '\n'.join(lines)

def build_receipt_html(receipt):
    settings = receipt['settings']
    paper_size = settings.get('paper_size') or 'auto'
    receipt_width = '57mm' if paper_size.startswith('57mm') else '80mm'
    logo_path = os.path.abspath(os.path.join(app.root_path, 'static', 'logo.png'))
    logo_html = ''
    if settings.get('show_logo') == 'true' and os.path.exists(logo_path):
        logo_html = f'<img class="logo" src="file://{logo_path}" alt="Pro-Tech Logo">'

    rows = ''.join(
        f"""
        <tr>
          <td>{item['name']}</td>
          <td class="right">{item['quantity']}</td>
          <td class="right">${item['price']:.2f}</td>
          <td class="right">${item['line_total']:.2f}</td>
        </tr>
        """
        for item in receipt['items']
    )
    return f"""
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {{ margin: 0; size: {paper_size if paper_size != 'auto' else receipt_width}; }}
    body {{ font-family: "Courier New", monospace; font-size: 12px; margin: 0; padding: 8px; width: {receipt_width}; }}
    .center {{ text-align: center; }}
    .logo {{ display: block; height: auto; margin: 0 auto 6px; max-height: 18mm; max-width: 34mm; object-fit: contain; }}
    .divider {{ border-top: 1px dashed #000; margin: 8px 0; }}
    table {{ border-collapse: collapse; width: 100%; }}
    th, td {{ padding: 3px 0; vertical-align: top; }}
    th {{ border-bottom: 1px solid #000; }}
    .right {{ text-align: right; }}
    .totals div {{ display: flex; justify-content: space-between; margin: 3px 0; }}
    h2, p {{ margin: 2px 0; }}
  </style>
</head>
<body>
  <section class="center">
    {logo_html}
    <h2>{settings.get('store_name') or 'Retail POS'}</h2>
    {f"<p>{settings.get('store_address')}</p>" if settings.get('store_address') else ""}
    {f"<p>{settings.get('store_contact')}</p>" if settings.get('store_contact') else ""}
    <p>Receipt #: {receipt['receipt_number']}</p>
    <p>{receipt['created_at']}</p>
    <p>Cashier: {receipt['user_name']}</p>
  </section>
  <div class="divider"></div>
  <table>
    <thead>
      <tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Total</th></tr>
    </thead>
    <tbody>{rows}</tbody>
  </table>
  <div class="divider"></div>
  <section class="totals">
    <div><strong>Total:</strong><span>${receipt['total_amount']:.2f}</span></div>
    <div><strong>Tendered:</strong><span>${receipt['tendered']:.2f}</span></div>
    <div><strong>Change:</strong><span>${receipt['change_amount']:.2f}</span></div>
  </section>
  <div class="divider"></div>
  <p class="center">{settings.get('store_footer') or 'Thank you for your purchase!'}</p>
</body>
</html>
"""

def receipt_to_json(receipt):
    return {
        'display_id': receipt['display_id'],
        'receipt_number': receipt['receipt_number'],
        'user_name': receipt['user_name'],
        'created_at': receipt['created_at'],
        'total_amount': receipt['total_amount'],
        'tendered': receipt['tendered'],
        'change_amount': receipt['change_amount'],
        'items': receipt['items'],
        'settings': receipt['settings']
    }

def print_receipt_to_configured_printer(display_id, respect_auto_print=True):
    receipt = get_receipt_data(display_id)
    if not receipt:
        return {'printed': False, 'error': 'Sale not found'}

    settings = receipt['settings']
    if respect_auto_print and settings.get('auto_print') == 'false':
        return {'printed': False, 'error': 'Auto-print is disabled'}

    printer_command = shutil.which('lp') or shutil.which('lpr')
    if not printer_command:
        return {'printed': False, 'error': 'No lp or lpr print command found'}

    command = [printer_command]
    printer_name = settings.get('printer_name')
    if printer_name:
        command.extend(['-d', printer_name] if os.path.basename(printer_command) == 'lp' else ['-P', printer_name])

    try:
        if settings.get('show_logo') == 'true':
            with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as receipt_file:
                receipt_file.write(build_receipt_html(receipt))
                receipt_file_path = receipt_file.name
            try:
                result = subprocess.run(
                    command + [receipt_file_path],
                    text=True,
                    capture_output=True,
                    timeout=15
                )
            finally:
                try:
                    os.unlink(receipt_file_path)
                except OSError:
                    pass
        else:
            result = subprocess.run(
                command,
                input=build_receipt_text(receipt),
                text=True,
                capture_output=True,
                timeout=15
            )
    except Exception as exc:
        return {'printed': False, 'error': str(exc)}

    if result.returncode != 0:
        return {'printed': False, 'error': result.stderr.strip() or result.stdout.strip() or 'Printer command failed'}
    return {'printed': True, 'message': result.stdout.strip()}

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
                    flash('Invalid username or password!!', 'error')
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
                return jsonify(fetch_settings(cursor))
            elif request.method == 'PUT':
                if session.get('role') != 'staff':
                    return jsonify({'error': 'Unauthorized'}), 403
                data = request.json
                for key, value in data.items():
                    cursor.execute("INSERT INTO settings (setting_key, setting_value) VALUES (%s, %s) ON DUPLICATE KEY UPDATE setting_value=%s", (key, value, value))
                conn.commit()
                return jsonify({'message': 'Settings updated successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
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
                category = data.get('category') or 'General'
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
                category = data.get('category') or 'General'
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
    session_id = data.get('session_id')
    
    if not cart:
        return jsonify({'error': 'Cart is empty'}), 400
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            total = 0
            for item in cart:
                cursor.execute("SELECT stock, price FROM products WHERE id=%s FOR UPDATE", (item['id'],))
                product = cursor.fetchone()
                if not product or product['stock'] < item['quantity']:
                    return jsonify({'error': f"Insufficient stock for {item['name']}"}), 400
                total += float(product['price']) * item['quantity']
                
            if tendered < total:
                return jsonify({'error': 'Amount tendered is insufficient'}), 400
                
            change = tendered - total
            
            sql = "INSERT INTO sales (user_id, total_amount, tendered, change_amount, session_id) VALUES (%s, %s, %s, %s, %s)"
            cursor.execute(sql, (session['user_id'], total, tendered, change, session_id))
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
            print_result = print_receipt_to_configured_printer(sale_id)
            return jsonify({
                'message': 'Checkout successful', 
                'total': total, 
                'change': change,
                'sale_id': sale_id,
                'session_id': session_id,
                'created_at': created_at,
                'printed': print_result['printed'],
                'print_error': print_result.get('error')
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
                cursor.execute("""
                    SELECT IFNULL(session_id, CAST(s.id AS CHAR)) as display_id,
                           LPAD(MIN(s.id), 4, '0') as receipt_number,
                           MIN(s.session_id) as session_key,
                           s.user_id, u.name as user_name, 
                           MIN(s.created_at) as created_at,
                           SUM(s.total_amount) as total_amount, 
                           SUM(s.tendered) as tendered, 
                           SUM(s.change_amount) as change_amount
                    FROM sales s 
                    JOIN users u ON s.user_id = u.id 
                    GROUP BY display_id, s.user_id, u.name 
                    ORDER BY MAX(s.id) DESC
                """)
            else:
                cursor.execute("""
                    SELECT CAST(s.id AS CHAR) as display_id,
                           LPAD(s.id, 4, '0') as receipt_number,
                           s.user_id, u.name as user_name, 
                           s.created_at as created_at,
                           s.total_amount as total_amount, 
                           s.tendered as tendered, 
                           s.change_amount as change_amount
                    FROM sales s 
                    JOIN users u ON s.user_id = u.id 
                    WHERE s.user_id=%s 
                    ORDER BY s.id DESC
                """, (session['user_id'],))
            sales = cursor.fetchall()
            for sale in sales:
                sale['total_amount'] = float(sale['total_amount'])
                sale['tendered'] = float(sale['tendered'])
                sale['change_amount'] = float(sale['change_amount'])
                sale['session_number'] = None
                if sale.get('session_key'):
                    cursor.execute("""
                        SELECT COUNT(*) + 1 AS session_number
                        FROM (
                            SELECT MIN(id) AS first_sale_id
                            FROM sales
                            WHERE session_id IS NOT NULL AND session_id != ''
                            GROUP BY session_id
                        ) numbered_sessions
                        WHERE first_sale_id < (
                            SELECT MIN(id) FROM sales WHERE session_id=%s
                        )
                    """, (sale['session_key'],))
                    sale['session_number'] = format_sequence(cursor.fetchone()['session_number'])
                sale.pop('session_key', None)
            return jsonify(sales)
    finally:
        conn.close()

@app.route('/api/sales/<display_id>', methods=['GET'])
def api_sale_detail(display_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 403
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM sales WHERE session_id=%s OR id=%s", (display_id, display_id))
            sale_rows = cursor.fetchall()
            if not sale_rows:
                return jsonify({'error': 'Sale not found'}), 404
                
            if session.get('role') != 'staff' and sale_rows[0]['user_id'] != session['user_id']:
                return jsonify({'error': 'Unauthorized'}), 403
                
            cursor.execute("""
                SELECT si.product_id, p.name, SUM(si.quantity) as quantity, si.price 
                FROM sale_items si 
                JOIN products p ON si.product_id = p.id 
                JOIN sales s ON si.sale_id = s.id
                WHERE s.session_id=%s OR s.id=%s
                GROUP BY si.product_id, p.name, si.price
            """, (display_id, display_id))
            items = cursor.fetchall()
            for item in items:
                item['price'] = float(item['price'])
                item['quantity'] = int(item['quantity'])
            return jsonify(items)
    finally:
        conn.close()

@app.route('/api/sales/<display_id>/print', methods=['POST'])
def api_print_sale(display_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 403

    receipt = get_receipt_data(display_id)
    if not receipt:
        return jsonify({'error': 'Receipt not found'}), 404
    if session.get('role') != 'staff' and receipt['user_id'] != session['user_id']:
        return jsonify({'error': 'Unauthorized'}), 403

    result = print_receipt_to_configured_printer(display_id, respect_auto_print=False)
    status_code = 200 if result['printed'] else 500
    return jsonify(result), status_code

@app.route('/api/sales/<display_id>/receipt', methods=['GET'])
def api_sale_receipt(display_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 403

    receipt = get_receipt_data(display_id)
    if not receipt:
        return jsonify({'error': 'Receipt not found'}), 404
    if session.get('role') != 'staff' and receipt['user_id'] != session['user_id']:
        return jsonify({'error': 'Unauthorized'}), 403

    return jsonify(receipt_to_json(receipt))

if __name__ == '__main__':
    app.run(debug=True, port=5000)
