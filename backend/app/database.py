import mysql.connector
from mysql.connector import pooling
from contextlib import contextmanager
from app.config import settings

# 连接池
db_pool = pooling.MySQLConnectionPool(
    pool_name="industry_pulse_pool",
    pool_size=5,
    host=settings.db_host,
    port=settings.db_port,
    user=settings.db_user,
    password=settings.db_password,
    database=settings.db_name,
    charset='utf8mb4',
    collation='utf8mb4_unicode_ci'
)

@contextmanager
def get_db_connection():
    """获取数据库连接的上下文管理器"""
    conn = db_pool.get_connection()
    try:
        yield conn
    finally:
        conn.close()

@contextmanager
def get_db_cursor(dictionary=True):
    """获取数据库游标的上下文管理器"""
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=dictionary)
        try:
            yield cursor
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
