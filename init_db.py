#!/usr/bin/env python3
"""
データベース初期化スクリプト
麻雀リーグ管理システム
"""

import sqlite3
import os

DATABASE = 'database.db'

def init_database():
    """データベースを初期化する"""
    
    # 既存のデータベースファイルがあれば削除
    if os.path.exists(DATABASE):
        print(f"既存のデータベースファイル '{DATABASE}' を削除します...")
        os.remove(DATABASE)
    
    print(f"新しいデータベース '{DATABASE}' を作成します...")
    
    # データベース接続
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # 外部キー制約を有効化
    cursor.execute('PRAGMA foreign_keys = ON')
    
    # スキーマファイルを読み込み
    schema_path = os.path.join(os.path.dirname(__file__), 'database_schema.sql')
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    # schema_sql の読み込み完了
    # スキーマ実行
    print("データベーススキーマを作成しています...")
    cursor.executescript(schema_sql)
    
    # 初期データ投入
    print("初期データを投入しています...")
    
    # 初期シーズン作成
    cursor.execute("""
        INSERT INTO seasons (name, start_date, is_active, description) 
        VALUES ('Season 1', '2025-01-01', 1, 'First season of the mahjong league')
    """)
    
    # 初期リーグ設定
    cursor.execute("""
        INSERT INTO league_settings (season_id, game_start_chip_count, calculation_base_chip_count, uma_1st, uma_2nd, uma_3rd)
        VALUES (1, 25000, 25000, 20, 10, -10)
    """)
    
    
    # コミット
    conn.commit()
    
    print("データベースの初期化が完了しました！")
    print("\n作成されたテーブル:")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    for table in tables:
        print(f"  - {table[0]}")
    
    print(f"\n初期データ:")
    cursor.execute("SELECT name, is_active FROM seasons")
    seasons = cursor.fetchall()
    print(f"  シーズン数: {len(seasons)}")
    for season in seasons:
        status = "アクティブ" if season[1] else "非アクティブ"
        print(f"    - {season[0]} ({status})")
    
    cursor.execute("SELECT COUNT(*) FROM players")
    player_count = cursor.fetchone()[0]
    print(f"  プレイヤー数: {player_count}")
    
    conn.close()

if __name__ == '__main__':
    init_database()