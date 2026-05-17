import pymysql
from werkzeug.security import generate_password_hash

DB_HOST = 'localhost'
DB_USER = 'root'
DB_PASSWORD = ''
DB_NAME = 'retail_pos'

conn = pymysql.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME
)

try:
    with conn.cursor() as cursor:
        username = 'Shepherd'
        password = '12345'
        email = 'shepherdmakasa06@gmail.com'
        name = 'Admin Staff'
        role = 'staff'
        hashed_password = generate_password_hash(password)
        
        # Check if already exists
        cursor.execute("SELECT id FROM users WHERE username=%s", (username,))
        if not cursor.fetchone():
            sql = "INSERT INTO users (name, email, username, password_hash, role) VALUES (%s, %s, %s, %s, %s)"
            cursor.execute(sql, (name, email, username, hashed_password, role))
            conn.commit()
            print("Default staff user created successfully.")
        else:
            print("Default staff user already exists.")
finally:
    conn.close()
