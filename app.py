#!/usr/keio/Anaconda3-2024.10-1/bin/python
"""
麻雀リーグ管理システム - シーズン制対応

Flask バックエンド API
"""

import sqlite3
import json
import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from functools import wraps

from flask import Flask, g, request, jsonify, render_template, send_from_directory
from werkzeug import Response

import os
# データベースのファイル名（絶対パスを使用）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, 'database.db')

app = Flask(__name__, static_folder='static', static_url_path='/static')

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    
    # JSXファイルとJSファイルのMIMEタイプを設定
    if request.path.endswith('.jsx'):
        response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
    elif request.path.endswith('.js'):
        response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
    elif request.path.endswith('.css'):
        response.headers['Content-Type'] = 'text/css; charset=utf-8'
    
    return response

# 静的ファイルの明示的なルーティング
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

def get_db() -> sqlite3.Connection:
    """データベース接続を得る"""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.execute('PRAGMA foreign_keys = ON')
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception: Optional[BaseException]) -> None:
    """データベース接続を閉じる"""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def json_serializer(obj):
    """JSON serializer for datetime objects"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def api_response(data=None, error=None, status=200):
    """統一的なAPIレスポンス形式"""
    response_data = {
        'success': error is None,
        'data': data,
        'error': error
    }
    return jsonify(response_data), status

# ==================== Routes ====================

@app.route('/')
def index():
    """React アプリのエントリポイント"""
    # Flask のスクリプトルートを基にアプリケーションのベースパスを取得
    base_path = request.script_root or ''
    return render_template('index.html', base_path=base_path)

# ==================== Seasons API ====================

@app.route('/api/seasons', methods=['GET'])
def get_seasons():
    """全シーズン取得"""
    try:
        cur = get_db().cursor()
        seasons = cur.execute('''
            SELECT s.*, vs.game_count, vs.player_count
            FROM seasons s
            LEFT JOIN view_season_summary vs ON s.id = vs.season_id
            ORDER BY s.created_date DESC
        ''').fetchall()
        
        seasons_data = []
        for season in seasons:
            seasons_data.append({
                'id': season['id'],
                'name': season['name'],
                'start_date': season['start_date'],
                'end_date': season['end_date'],
                'is_active': bool(season['is_active']),
                'description': season['description'],
                'game_count': season['game_count'],
                'player_count': season['player_count'],
                'created_date': season['created_date']
            })
        
        return api_response(seasons_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/seasons/<int:season_id>', methods=['GET'])
def get_season(season_id):
    """特定シーズン取得"""
    try:
        cur = get_db().cursor()
        season = cur.execute('''
            SELECT s.*, vs.game_count, vs.player_count
            FROM seasons s
            LEFT JOIN view_season_summary vs ON s.id = vs.season_id
            WHERE s.id = ?
        ''', (season_id,)).fetchone()
        
        if not season:
            return api_response(error='Season not found', status=404)
        
        season_data = {
            'id': season['id'],
            'name': season['name'],
            'start_date': season['start_date'],
            'end_date': season['end_date'],
            'is_active': bool(season['is_active']),
            'description': season['description'],
            'game_count': season['game_count'],
            'player_count': season['player_count'],
            'created_date': season['created_date']
        }
        
        return api_response(season_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/seasons/active', methods=['GET'])
def get_active_season():
    """アクティブシーズン取得"""
    try:
        cur = get_db().cursor()
        season = cur.execute('''
            SELECT * FROM seasons WHERE is_active = 1 LIMIT 1
        ''').fetchone()
        
        if not season:
            return api_response(error='No active season found', status=404)
        
        season_data = {
            'id': season['id'],
            'name': season['name'],
            'start_date': season['start_date'],
            'end_date': season['end_date'],
            'is_active': bool(season['is_active']),
            'description': season['description'],
            'created_date': season['created_date']
        }
        
        return api_response(season_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/seasons', methods=['POST'])
def create_season():
    """新規シーズン作成"""
    try:
        data = request.json
        if not data or not data.get('name') or not data.get('start_date'):
            return api_response(error='Name and start_date are required', status=400)
        
        con = get_db()
        cur = con.cursor()
        
        # アクティブフラグの処理
        is_active = data.get('is_active', False)
        
        cur.execute('''
            INSERT INTO seasons (name, start_date, end_date, is_active, description)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data['start_date'],
            data.get('end_date'),
            is_active,
            data.get('description', '')
        ))
        
        season_id = cur.lastrowid
        
        # デフォルトのリーグ設定を作成
        cur.execute('''
            INSERT INTO league_settings 
            (season_id, game_start_chip_count, calculation_base_chip_count, 
             uma_1st, uma_2nd, uma_3rd)
            VALUES (?, 25000, 25000, 20, 10, -10)
        ''', (season_id,))
        
        con.commit()
        
        return api_response({'id': season_id, 'message': 'Season created successfully'})
    except sqlite3.IntegrityError as e:
        return api_response(error='Season name already exists', status=400)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/seasons/<int:season_id>', methods=['PUT'])
def update_season(season_id):
    """シーズン更新"""
    try:
        data = request.json
        if not data:
            return api_response(error='Request data is required', status=400)
        
        con = get_db()
        cur = con.cursor()
        
        # シーズン存在確認
        season = cur.execute('SELECT id FROM seasons WHERE id = ?', (season_id,)).fetchone()
        if not season:
            return api_response(error='Season not found', status=404)
        
        # 更新フィールドの動的構築
        update_fields = []
        params = []
        
        for field in ['name', 'start_date', 'end_date', 'description', 'is_active']:
            if field in data:
                update_fields.append(f'{field} = ?')
                params.append(data[field])
        
        if not update_fields:
            return api_response(error='No fields to update', status=400)
        
        params.append(season_id)
        
        cur.execute(f'''
            UPDATE seasons SET {', '.join(update_fields)}
            WHERE id = ?
        ''', params)
        
        con.commit()
        
        return api_response({'message': 'Season updated successfully'})
    except sqlite3.IntegrityError:
        return api_response(error='Season name already exists', status=400)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/seasons/<int:season_id>/activate', methods=['POST'])
def activate_season(season_id):
    """シーズンアクティベート"""
    try:
        con = get_db()
        cur = con.cursor()
        
        # シーズン存在確認
        season = cur.execute('SELECT id FROM seasons WHERE id = ?', (season_id,)).fetchone()
        if not season:
            return api_response(error='Season not found', status=404)
        
        # 全てのシーズンを非アクティブにしてから、指定シーズンをアクティブに
        cur.execute('UPDATE seasons SET is_active = 0')
        cur.execute('UPDATE seasons SET is_active = 1 WHERE id = ?', (season_id,))
        
        con.commit()
        
        return api_response({'message': 'Season activated successfully'})
    except Exception as e:
        return api_response(error=str(e), status=500)

# ==================== Players API ====================

@app.route('/api/players', methods=['GET'])
def get_players():
    """全プレイヤー取得"""
    try:
        cur = get_db().cursor()
        players = cur.execute('''
            SELECT * FROM players ORDER BY name
        ''').fetchall()
        
        players_data = []
        for player in players:
            players_data.append({
                'id': player['id'],
                'name': player['name'],
                'avatarUrl': player['avatar_url'],
                'created_date': player['created_date']
            })
        
        return api_response(players_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/players', methods=['POST'])
def create_player():
    """新規プレイヤー作成"""
    try:
        data = request.json
        if not data or not data.get('name'):
            return api_response(error='Name is required', status=400)
        
        player_id = str(uuid.uuid4())
        
        con = get_db()
        cur = con.cursor()
        
        cur.execute('''
            INSERT INTO players (id, name, avatar_url)
            VALUES (?, ?, ?)
        ''', (player_id, data['name'], data.get('avatarUrl')))
        
        con.commit()
        
        return api_response({'id': player_id, 'message': 'Player created successfully'})
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/players/<player_id>', methods=['PUT'])
def update_player(player_id):
    """プレイヤー更新"""
    try:
        data = request.json
        if not data:
            return api_response(error='Request data is required', status=400)
        
        con = get_db()
        cur = con.cursor()
        
        # プレイヤー存在確認
        player = cur.execute('SELECT id FROM players WHERE id = ?', (player_id,)).fetchone()
        if not player:
            return api_response(error='Player not found', status=404)
        
        # 更新フィールドの動的構築
        update_fields = []
        params = []
        
        for field in ['name', 'avatar_url']:
            json_field = 'avatarUrl' if field == 'avatar_url' else field
            if json_field in data:
                update_fields.append(f'{field} = ?')
                params.append(data[json_field])
        
        if not update_fields:
            return api_response(error='No fields to update', status=400)
        
        params.append(player_id)
        
        cur.execute(f'''
            UPDATE players SET {', '.join(update_fields)}
            WHERE id = ?
        ''', params)
        
        con.commit()
        
        return api_response({'message': 'Player updated successfully'})
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/players/<player_id>', methods=['DELETE'])
def delete_player(player_id):
    """プレイヤー削除（全シーズン累計で対戦履歴がない場合のみ）"""
    try:
        con = get_db()
        cur = con.cursor()
        
        # プレイヤー存在確認
        player = cur.execute('SELECT id, name FROM players WHERE id = ?', (player_id,)).fetchone()
        if not player:
            return api_response(error='Player not found', status=404)
        
        # 全シーズン累計の対戦履歴確認
        game_count = cur.execute('''
            SELECT COUNT(*) as count FROM game_results WHERE player_id = ?
        ''', (player_id,)).fetchone()
        
        if game_count['count'] > 0:
            return api_response(
                error=f'プレイヤー "{player["name"]}" は対戦履歴があるため削除できません。累計対戦履歴: {game_count["count"]}ゲーム', 
                status=400
            )
        
        # プレイヤー削除
        cur.execute('DELETE FROM players WHERE id = ?', (player_id,))
        
        con.commit()
        
        return api_response({'message': f'プレイヤー "{player["name"]}" を削除しました'})
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/players/<player_id>/can-delete', methods=['GET'])
def check_player_can_delete(player_id):
    """プレイヤーが削除可能かどうかをチェック（全シーズン累計の対戦履歴で判定）"""
    try:
        cur = get_db().cursor()
        
        # プレイヤー存在確認
        player = cur.execute('SELECT id, name FROM players WHERE id = ?', (player_id,)).fetchone()
        if not player:
            return api_response(error='Player not found', status=404)
        
        # 全シーズン累計の対戦履歴確認
        game_count = cur.execute('''
            SELECT COUNT(*) as count FROM game_results WHERE player_id = ?
        ''', (player_id,)).fetchone()
        
        can_delete = game_count['count'] == 0
        
        return api_response({
            'canDelete': can_delete,
            'gameCount': game_count['count'],
            'reason': None if can_delete else f'プレイヤーには累計 {game_count["count"]} ゲームの対戦履歴があります'
        })
    except Exception as e:
        return api_response(error=str(e), status=500)

# ==================== League Settings API ====================

@app.route('/api/seasons/<int:season_id>/settings', methods=['GET'])
def get_league_settings(season_id):
    """シーズンのリーグ設定取得"""
    try:
        cur = get_db().cursor()
        settings = cur.execute('''
            SELECT * FROM league_settings WHERE season_id = ?
        ''', (season_id,)).fetchone()
        
        if not settings:
            return api_response(error='League settings not found', status=404)
        
        settings_data = {
            'gameStartChipCount': settings['game_start_chip_count'],
            'calculationBaseChipCount': settings['calculation_base_chip_count'],
            'umaPoints': {
                1: settings['uma_1st'],
                2: settings['uma_2nd'],
                3: settings['uma_3rd'],
                4: -(settings['uma_1st'] + settings['uma_2nd'] + settings['uma_3rd'])
            }
        }
        
        return api_response(settings_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/seasons/<int:season_id>/settings', methods=['PUT'])
def update_league_settings(season_id):
    """シーズンのリーグ設定更新"""
    try:
        data = request.json
        if not data:
            return api_response(error='Request data is required', status=400)
        
        con = get_db()
        cur = con.cursor()
        
        # シーズン存在確認
        season = cur.execute('SELECT id FROM seasons WHERE id = ?', (season_id,)).fetchone()
        if not season:
            return api_response(error='Season not found', status=404)
        
        # 設定更新
        cur.execute('''
            UPDATE league_settings SET
                game_start_chip_count = ?,
                calculation_base_chip_count = ?,
                uma_1st = ?,
                uma_2nd = ?,
                uma_3rd = ?
            WHERE season_id = ?
        ''', (
            data.get('gameStartChipCount', 25000),
            data.get('calculationBaseChipCount', 25000),
            data.get('umaPoints', {}).get(1, 20),
            data.get('umaPoints', {}).get(2, 10),
            data.get('umaPoints', {}).get(3, -10),
            season_id
        ))
        
        con.commit()
        
        return api_response({'message': 'League settings updated successfully'})
    except Exception as e:
        return api_response(error=str(e), status=500)

# ==================== Games API ====================

@app.route('/api/seasons/<int:season_id>/games', methods=['GET'])
def get_games(season_id):
    """シーズンのゲーム一覧取得"""
    try:
        cur = get_db().cursor()
        games = cur.execute('''
            SELECT f.game_id AS id, f.season_id, f.game_date, f.round_name, f.total_hands_in_game, g.recorded_date,
                   json_group_array(json_object(
                       'playerId', f.player_id,
                       'rawScore', f.raw_score,
                       'rank', f.rank,
                       'calculatedPoints', f.calculated_points,
                       'agariCount', f.agari_count,
                       'riichiCount', f.riichi_count,
                       'houjuuCount', f.houjuu_count,
                       'furoCount', f.furo_count
                   )) AS results
            FROM view_game_results_flat f
            JOIN games g ON f.game_id = g.id
            WHERE f.season_id = ?
            GROUP BY f.game_id
            ORDER BY f.game_date DESC, g.recorded_date DESC
        ''', (season_id,)).fetchall()
        
        games_data = []
        for game in games:
            results = json.loads(game['results']) if game['results'] else []
            # None値を含む結果を除外
            results = [r for r in results if r.get('playerId')]
            
            games_data.append({
                'id': game['id'],
                'seasonId': game['season_id'],
                'gameDate': game['game_date'],
                'roundName': game['round_name'],
                'totalHandsInGame': game['total_hands_in_game'],
                'recordedDate': game['recorded_date'],
                'results': results
            })
        
        return api_response(games_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/seasons/<int:season_id>/standings', methods=['GET'])
def get_season_standings(season_id):
    """シーズンの順位表取得（全期間の累計結果）"""
    try:
        cur = get_db().cursor()
        
        # 全期間のプレイヤー統計を計算
        standings = cur.execute('''
            WITH player_stats AS (
                SELECT 
                    p.id,
                    p.name,
                    p.avatar_url,
                    COUNT(gr.id) as games_played,
                    SUM(gr.calculated_points) as total_points,
                    AVG(gr.calculated_points) as average_points,
                    AVG(gr.raw_score) as average_raw_score,
                    AVG(gr.rank) as average_rank,
                    MAX(gr.raw_score) as best_raw_score,
                    SUM(CASE WHEN gr.rank = 1 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN gr.rank = 2 THEN 1 ELSE 0 END) as second_places,
                    SUM(CASE WHEN gr.rank = 3 THEN 1 ELSE 0 END) as third_places,
                    SUM(CASE WHEN gr.rank = 4 THEN 1 ELSE 0 END) as fourth_places,
                    SUM(CASE WHEN gr.rank <= 2 THEN 1 ELSE 0 END) as top_two_finishes,
                    SUM(CASE WHEN gr.rank < 4 THEN 1 ELSE 0 END) as avoid_last_finishes,
                    SUM(COALESCE(gr.agari_count, 0)) as total_agari,
                    SUM(COALESCE(gr.riichi_count, 0)) as total_riichi,
                    SUM(COALESCE(gr.houjuu_count, 0)) as total_houjuu,
                    SUM(COALESCE(gr.furo_count, 0)) as total_furo,
                    SUM(COALESCE(g.total_hands_in_game, 0)) as total_hands
                FROM players p
                LEFT JOIN game_results gr ON p.id = gr.player_id
                LEFT JOIN games g ON gr.game_id = g.id
                WHERE gr.game_id IS NOT NULL
                GROUP BY p.id, p.name, p.avatar_url
                HAVING games_played > 0
            )
            SELECT 
                id,
                name,
                avatar_url,
                games_played,
                total_points,
                average_points,
                average_raw_score,
                average_rank,
                best_raw_score,
                wins,
                second_places,
                third_places,
                fourth_places,
                CASE WHEN games_played > 0 THEN CAST(wins AS REAL) / games_played ELSE 0 END as win_rate,
                CASE WHEN games_played > 0 THEN CAST(second_places AS REAL) / games_played ELSE 0 END as second_place_rate,
                CASE WHEN games_played > 0 THEN CAST(third_places AS REAL) / games_played ELSE 0 END as third_place_rate,
                CASE WHEN games_played > 0 THEN CAST(fourth_places AS REAL) / games_played ELSE 0 END as fourth_place_rate,
                CASE WHEN games_played > 0 THEN CAST(top_two_finishes AS REAL) / games_played ELSE 0 END as rentai_rate,
                CASE WHEN games_played > 0 THEN CAST(avoid_last_finishes AS REAL) / games_played ELSE 0 END as rasu_kaihi_rate,
                total_agari,
                total_riichi,
                total_houjuu,
                total_furo,
                total_hands,
                CASE WHEN total_hands > 0 THEN CAST(total_agari AS REAL) / total_hands ELSE 0 END as agari_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_riichi AS REAL) / total_hands ELSE 0 END as riichi_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_houjuu AS REAL) / total_hands ELSE 0 END as houjuu_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_furo AS REAL) / total_hands ELSE 0 END as furo_rate_per_hand
            FROM player_stats
            ORDER BY total_points DESC, average_points DESC
        ''').fetchall()
        
        standings_data = []
        for stat in standings:
            # 最近のゲーム結果取得（最大10ゲーム）
            recent_games = cur.execute('''
                SELECT gr.calculated_points
                FROM game_results gr
                JOIN games g ON gr.game_id = g.id
                WHERE gr.player_id = ?
                ORDER BY g.game_date DESC, g.recorded_date DESC
                LIMIT 10
            ''', (stat['id'],)).fetchall()
            
            last_ten_games_points = [game['calculated_points'] for game in recent_games]
            
            standings_data.append({
                'player': {
                    'id': stat['id'],
                    'name': stat['name'],
                    'avatarUrl': stat['avatar_url']
                },
                'gamesPlayed': stat['games_played'],
                'totalPoints': stat['total_points'],
                'averagePoints': stat['average_points'],
                'averageRawScore': stat['average_raw_score'],
                'averageRank': stat['average_rank'],
                'bestRawScore': stat['best_raw_score'] if stat['best_raw_score'] is not None else 0,
                'rankDistribution': {
                    1: stat['wins'],
                    2: stat['second_places'],
                    3: stat['third_places'],
                    4: stat['fourth_places']
                },
                'winRate': stat['win_rate'],
                'secondPlaceRate': stat['second_place_rate'],
                'thirdPlaceRate': stat['third_place_rate'],
                'fourthPlaceRate': stat['fourth_place_rate'],
                'rentaiRate': stat['rentai_rate'],
                'rasuKaihiRate': stat['rasu_kaihi_rate'],
                'totalAgariCount': stat['total_agari'],
                'totalRiichiCount': stat['total_riichi'],
                'totalHoujuuCount': stat['total_houjuu'],
                'totalFuroCount': stat['total_furo'],
                'totalHandsPlayedIn': stat['total_hands'],
                'agariRatePerHand': stat['agari_rate_per_hand'],
                'riichiRatePerHand': stat['riichi_rate_per_hand'],
                'houjuuRatePerHand': stat['houjuu_rate_per_hand'],
                'furoRatePerHand': stat['furo_rate_per_hand'],
                'lastTenGamesPoints': last_ten_games_points
            })
        
        return api_response(standings_data)
    except Exception as e:
        return api_response(error=str(e), status=500)


@app.route('/api/standings/all', methods=['GET'])
def get_all_standings():
    """全シーズン累計の順位表取得"""
    try:
        cur = get_db().cursor()
        
        # view_all_standingsビューを使用して統計を取得
        standings = cur.execute('''
            SELECT 
                id,
                name,
                avatar_url,
                games_played,
                total_points,
                average_points,
                average_raw_score,
                average_rank,
                best_raw_score,
                wins,
                second_places,
                third_places,
                fourth_places,
                top_two_finishes,
                avoid_last_finishes,
                total_agari,
                total_riichi,
                total_houjuu,
                total_furo,
                total_hands,
                CASE WHEN games_played > 0 THEN CAST(wins AS REAL) / games_played ELSE 0 END as win_rate,
                CASE WHEN games_played > 0 THEN CAST(second_places AS REAL) / games_played ELSE 0 END as second_place_rate,
                CASE WHEN games_played > 0 THEN CAST(third_places AS REAL) / games_played ELSE 0 END as third_place_rate,
                CASE WHEN games_played > 0 THEN CAST(fourth_places AS REAL) / games_played ELSE 0 END as fourth_place_rate,
                CASE WHEN games_played > 0 THEN CAST(top_two_finishes AS REAL) / games_played ELSE 0 END as rentai_rate,
                CASE WHEN games_played > 0 THEN CAST(avoid_last_finishes AS REAL) / games_played ELSE 0 END as rasu_kaihi_rate,
                CASE WHEN total_hands > 0 THEN CAST(total_agari AS REAL) / total_hands ELSE 0 END as agari_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_riichi AS REAL) / total_hands ELSE 0 END as riichi_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_houjuu AS REAL) / total_hands ELSE 0 END as houjuu_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_furo AS REAL) / total_hands ELSE 0 END as furo_rate_per_hand
            FROM view_all_standings
            WHERE games_played > 0
            ORDER BY total_points DESC, average_points DESC
        ''').fetchall()
        
        standings_data = []
        for stat in standings:
            # 最近のゲーム結果取得（最大10ゲーム）
            recent_games = cur.execute('''
                SELECT gr.calculated_points
                FROM game_results gr
                JOIN games g ON gr.game_id = g.id
                WHERE gr.player_id = ?
                ORDER BY g.game_date DESC, g.recorded_date DESC
                LIMIT 10
            ''', (stat['id'],)).fetchall()
            
            last_ten_games_points = [game['calculated_points'] for game in recent_games]
            
            standings_data.append({
                'player': {
                    'id': stat['id'],
                    'name': stat['name'],
                    'avatarUrl': stat['avatar_url']
                },
                'gamesPlayed': stat['games_played'],
                'totalPoints': stat['total_points'],
                'averagePoints': stat['average_points'],
                'averageRawScore': stat['average_raw_score'],
                'averageRank': stat['average_rank'],
                'bestRawScore': stat['best_raw_score'] if stat['best_raw_score'] is not None else 0,
                'rankDistribution': {
                    1: stat['wins'],
                    2: stat['second_places'],
                    3: stat['third_places'],
                    4: stat['fourth_places']
                },
                'winRate': stat['win_rate'],
                'secondPlaceRate': stat['second_place_rate'],
                'thirdPlaceRate': stat['third_place_rate'],
                'fourthPlaceRate': stat['fourth_place_rate'],
                'rentaiRate': stat['rentai_rate'],
                'rasuKaihiRate': stat['rasu_kaihi_rate'],
                'totalAgariCount': stat['total_agari'],
                'totalRiichiCount': stat['total_riichi'],
                'totalHoujuuCount': stat['total_houjuu'],
                'totalFuroCount': stat['total_furo'],
                'totalHandsPlayedIn': stat['total_hands'],
                'agariRatePerHand': stat['agari_rate_per_hand'],
                'riichiRatePerHand': stat['riichi_rate_per_hand'],
                'houjuuRatePerHand': stat['houjuu_rate_per_hand'],
                'furoRatePerHand': stat['furo_rate_per_hand'],
                'lastTenGamesPoints': last_ten_games_points
            })
        
        return api_response(standings_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/standings/daily', methods=['GET'])
def get_daily_standings():
    """日別の順位表取得"""
    try:
        target_date = request.args.get('date')  # YYYY-MM-DD形式
        if not target_date:
            return api_response(error='日付パラメータが必要です', status=400)
        
        cur = get_db().cursor()
        
        # 指定日のゲーム結果のみを対象とした統計
        standings = cur.execute('''
            WITH player_stats AS (
                SELECT 
                    p.id,
                    p.name,
                    p.avatar_url,
                    COUNT(gr.id) as games_played,
                    SUM(gr.calculated_points) as total_points,
                    AVG(gr.calculated_points) as average_points,
                    AVG(gr.raw_score) as average_raw_score,
                    AVG(gr.rank) as average_rank,
                    MAX(gr.raw_score) as best_raw_score,
                    SUM(CASE WHEN gr.rank = 1 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN gr.rank = 2 THEN 1 ELSE 0 END) as second_places,
                    SUM(CASE WHEN gr.rank = 3 THEN 1 ELSE 0 END) as third_places,
                    SUM(CASE WHEN gr.rank = 4 THEN 1 ELSE 0 END) as fourth_places,
                    SUM(CASE WHEN gr.rank <= 2 THEN 1 ELSE 0 END) as top_two_finishes,
                    SUM(CASE WHEN gr.rank < 4 THEN 1 ELSE 0 END) as avoid_last_finishes,
                    SUM(COALESCE(gr.agari_count, 0)) as total_agari,
                    SUM(COALESCE(gr.riichi_count, 0)) as total_riichi,
                    SUM(COALESCE(gr.houjuu_count, 0)) as total_houjuu,
                    SUM(COALESCE(gr.furo_count, 0)) as total_furo,
                    SUM(COALESCE(g.total_hands_in_game, 0)) as total_hands
                FROM players p
                LEFT JOIN game_results gr ON p.id = gr.player_id
                LEFT JOIN games g ON gr.game_id = g.id
                WHERE gr.game_id IS NOT NULL AND g.game_date = ?
                GROUP BY p.id, p.name, p.avatar_url
                HAVING games_played > 0
            )
            SELECT 
                id,
                name,
                avatar_url,
                games_played,
                total_points,
                average_points,
                average_raw_score,
                average_rank,
                best_raw_score,
                wins,
                second_places,
                third_places,
                fourth_places,
                CASE WHEN games_played > 0 THEN CAST(wins AS REAL) / games_played ELSE 0 END as win_rate,
                CASE WHEN games_played > 0 THEN CAST(second_places AS REAL) / games_played ELSE 0 END as second_place_rate,
                CASE WHEN games_played > 0 THEN CAST(third_places AS REAL) / games_played ELSE 0 END as third_place_rate,
                CASE WHEN games_played > 0 THEN CAST(fourth_places AS REAL) / games_played ELSE 0 END as fourth_place_rate,
                CASE WHEN games_played > 0 THEN CAST(top_two_finishes AS REAL) / games_played ELSE 0 END as rentai_rate,
                CASE WHEN games_played > 0 THEN CAST(avoid_last_finishes AS REAL) / games_played ELSE 0 END as rasu_kaihi_rate,
                total_agari,
                total_riichi,
                total_houjuu,
                total_furo,
                total_hands,
                CASE WHEN total_hands > 0 THEN CAST(total_agari AS REAL) / total_hands ELSE 0 END as agari_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_riichi AS REAL) / total_hands ELSE 0 END as riichi_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_houjuu AS REAL) / total_hands ELSE 0 END as houjuu_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_furo AS REAL) / total_hands ELSE 0 END as furo_rate_per_hand
            FROM player_stats
            ORDER BY total_points DESC, average_points DESC
        ''', (target_date,)).fetchall()
        
        standings_data = []
        for stat in standings:
            # 指定日のゲーム結果のみを対象とした統計（その日の戦績のみ）
            recent_games = cur.execute('''
                SELECT gr.calculated_points
                FROM game_results gr
                JOIN games g ON gr.game_id = g.id
                WHERE gr.player_id = ? AND g.game_date = ?
                ORDER BY g.game_date DESC, g.recorded_date DESC
                LIMIT 10
            ''', (stat['id'], target_date)).fetchall()
            
            last_ten_games_points = [game['calculated_points'] for game in recent_games]
            
            standings_data.append({
                'player': {
                    'id': stat['id'],
                    'name': stat['name'],
                    'avatarUrl': stat['avatar_url']
                },
                'gamesPlayed': stat['games_played'],
                'totalPoints': stat['total_points'],
                'averagePoints': stat['average_points'],
                'averageRawScore': stat['average_raw_score'],
                'averageRank': stat['average_rank'],
                'bestRawScore': stat['best_raw_score'] if stat['best_raw_score'] is not None else 0,
                'rankDistribution': {
                    1: stat['wins'],
                    2: stat['second_places'],
                    3: stat['third_places'],
                    4: stat['fourth_places']
                },
                'winRate': stat['win_rate'],
                'secondPlaceRate': stat['second_place_rate'],
                'thirdPlaceRate': stat['third_place_rate'],
                'fourthPlaceRate': stat['fourth_place_rate'],
                'rentaiRate': stat['rentai_rate'],
                'rasuKaihiRate': stat['rasu_kaihi_rate'],
                'totalAgariCount': stat['total_agari'],
                'totalRiichiCount': stat['total_riichi'],
                'totalHoujuuCount': stat['total_houjuu'],
                'totalFuroCount': stat['total_furo'],
                'totalHandsPlayedIn': stat['total_hands'],
                'agariRatePerHand': stat['agari_rate_per_hand'],
                'riichiRatePerHand': stat['riichi_rate_per_hand'],
                'houjuuRatePerHand': stat['houjuu_rate_per_hand'],
                'furoRatePerHand': stat['furo_rate_per_hand'],
                'lastTenGamesPoints': last_ten_games_points
            })
        
        return api_response(standings_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/games/all', methods=['GET'])
def get_all_games():
    """全シーズンのゲーム履歴取得"""
    try:
        cur = get_db().cursor()
        games = cur.execute('''
            SELECT g.id, g.season_id, g.game_date, g.round_name, g.total_hands_in_game, g.recorded_date,
                   s.name AS season_name,
                   json_group_array(json_object(
                       'playerId', gr.player_id,
                       'rawScore', gr.raw_score,
                       'rank', gr.rank,
                       'calculatedPoints', gr.calculated_points,
                       'agariCount', gr.agari_count,
                       'riichiCount', gr.riichi_count,
                       'houjuuCount', gr.houjuu_count,
                       'furoCount', gr.furo_count
                   )) AS results
            FROM games g
            LEFT JOIN seasons s ON g.season_id = s.id
            LEFT JOIN game_results gr ON g.id = gr.game_id
            GROUP BY g.id
            ORDER BY g.game_date DESC, g.recorded_date DESC
        ''').fetchall()
        
        games_data = []
        for game in games:
            results = json.loads(game['results']) if game['results'] else []
            # None値を含む結果を除外
            results = [r for r in results if r.get('playerId')]
            
            games_data.append({
                'id': game['id'],
                'seasonId': game['season_id'],
                'seasonName': game['season_name'],
                'gameDate': game['game_date'],
                'roundName': game['round_name'],
                'totalHandsInGame': game['total_hands_in_game'],
                'recordedDate': game['recorded_date'],
                'results': results
            })
        
        return api_response(games_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/games/daily', methods=['GET'])
def get_daily_games():
    """日別のゲーム履歴取得"""
    try:
        target_date = request.args.get('date')  # YYYY-MM-DD形式
        if not target_date:
            return api_response(error='日付パラメータが必要です', status=400)
        
        cur = get_db().cursor()
        games = cur.execute('''
            SELECT g.*, s.name as season_name,
                   json_group_array(json_object(
                       'playerId', gr.player_id,
                       'rawScore', gr.raw_score,
                       'rank', gr.rank,
                       'calculatedPoints', gr.calculated_points,
                       'agariCount', gr.agari_count,
                       'riichiCount', gr.riichi_count,
                       'houjuuCount', gr.houjuu_count,
                       'furoCount', gr.furo_count
                   )) as results
            FROM games g
            LEFT JOIN seasons s ON g.season_id = s.id
            LEFT JOIN game_results gr ON g.id = gr.game_id
            WHERE g.game_date = ?
            GROUP BY g.id
            ORDER BY g.recorded_date DESC
        ''', (target_date,)).fetchall()
        
        games_data = []
        for game in games:
            results = json.loads(game['results']) if game['results'] else []
            # None値を含む結果を除外
            results = [r for r in results if r.get('playerId')]
            
            games_data.append({
                'id': game['id'],
                'seasonId': game['season_id'],
                'seasonName': game['season_name'],
                'gameDate': game['game_date'],
                'roundName': game['round_name'],
                'totalHandsInGame': game['total_hands_in_game'],
                'recordedDate': game['recorded_date'],
                'results': results
            })
        
        return api_response(games_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/games/date-range', methods=['GET'])
def get_games_by_date_range():
    """期間指定でのゲーム履歴取得"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return api_response(error='開始日と終了日の両方が必要です', status=400)
        
        cur = get_db().cursor()
        games = cur.execute('''
            SELECT g.*, s.name as season_name,
                   json_group_array(json_object(
                       'playerId', gr.player_id,
                       'rawScore', gr.raw_score,
                       'rank', gr.rank,
                       'calculatedPoints', gr.calculated_points,
                       'agariCount', gr.agari_count,
                       'riichiCount', gr.riichi_count,
                       'houjuuCount', gr.houjuu_count,
                       'furoCount', gr.furo_count
                   )) as results
            FROM games g
            LEFT JOIN seasons s ON g.season_id = s.id
            LEFT JOIN game_results gr ON g.id = gr.game_id
            WHERE g.game_date BETWEEN ? AND ?
            GROUP BY g.id
            ORDER BY g.game_date DESC, g.recorded_date DESC
        ''', (start_date, end_date)).fetchall()
        
        games_data = []
        for game in games:
            results = json.loads(game['results']) if game['results'] else []
            # None値を含む結果を除外
            results = [r for r in results if r.get('playerId')]
            
            games_data.append({
                'id': game['id'],
                'seasonId': game['season_id'],
                'seasonName': game['season_name'],
                'gameDate': game['game_date'],
                'roundName': game['round_name'],
                'totalHandsInGame': game['total_hands_in_game'],
                'recordedDate': game['recorded_date'],
                'results': results
            })
        
        return api_response(games_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/seasons/<int:season_id>/games', methods=['POST'])
def create_game(season_id):
    """新規ゲーム記録"""
    try:
        data = request.json
        if not data or not data.get('gameResults') or not data.get('gameDate'):
            return api_response(error='gameResults and gameDate are required', status=400)
        
        game_results = data['gameResults']
        if len(game_results) != 4:
            return api_response(error='Exactly 4 players required', status=400)
        
        game_id = str(uuid.uuid4())
        
        con = get_db()
        cur = con.cursor()
        
        # シーズン存在確認
        season = cur.execute('SELECT id FROM seasons WHERE id = ?', (season_id,)).fetchone()
        if not season:
            return api_response(error='Season not found', status=404)
        
        # ゲーム作成
        cur.execute('''
            INSERT INTO games (id, season_id, game_date, round_name, total_hands_in_game)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            game_id,
            season_id,
            data['gameDate'],
            data.get('roundName'),
            data.get('totalHandsInGame')
        ))
        
        # ゲーム結果記録
        for result in game_results:
            cur.execute('''
                INSERT INTO game_results 
                (game_id, player_id, raw_score, rank, calculated_points, 
                 agari_count, riichi_count, houjuu_count, furo_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                game_id,
                result['playerId'],
                result['rawScore'],
                result['rank'],
                result['calculatedPoints'],
                result.get('agariCount', 0),
                result.get('riichiCount', 0),
                result.get('houjuuCount', 0),
                result.get('furoCount', 0)
            ))
        
        con.commit()
        
        return api_response({'id': game_id, 'message': 'Game recorded successfully'})
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/games/<game_id>', methods=['PUT'])
def update_game(game_id):
    """ゲーム結果更新"""
    try:
        print(f"Update game request for game_id: {game_id}")
        data = request.json
        print(f"Request data: {data}")
        
        if not data or not data.get('gameResults'):
            print("Error: gameResults are missing")
            return api_response(error='gameResults are required', status=400)
        
        game_results = data['gameResults']
        print(f"Game results: {game_results}")
        
        if len(game_results) != 4:
            print(f"Error: Expected 4 players, got {len(game_results)}")
            return api_response(error='Exactly 4 players required', status=400)
        
        con = get_db()
        cur = con.cursor()
        
        # ゲーム存在確認
        game = cur.execute('SELECT id, season_id FROM games WHERE id = ?', (game_id,)).fetchone()
        if not game:
            print(f"Error: Game {game_id} not found")
            return api_response(error='Game not found', status=404)
        
        print(f"Found game: {game}")
        
        # ゲーム情報の更新
        cur.execute('''
            UPDATE games SET
                game_date = ?,
                round_name = ?,
                total_hands_in_game = ?
            WHERE id = ?
        ''', (
            data.get('gameDate'),
            data.get('roundName'),
            data.get('totalHandsInGame'),
            game_id
        ))
        
        print("Updated game info")
        
        # 既存のゲーム結果を削除
        cur.execute('DELETE FROM game_results WHERE game_id = ?', (game_id,))
        print("Deleted existing game results")
        
        # 新しいゲーム結果を挿入
        for i, result in enumerate(game_results):
            print(f"Inserting result {i}: {result}")
            cur.execute('''
                INSERT INTO game_results 
                (game_id, player_id, raw_score, rank, calculated_points, 
                 agari_count, riichi_count, houjuu_count, furo_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                game_id,
                result['playerId'],
                result['rawScore'],
                result['rank'],
                result['calculatedPoints'],
                result.get('agariCount', 0),
                result.get('riichiCount', 0),
                result.get('houjuuCount', 0),
                result.get('furoCount', 0)
            ))
        
        con.commit()
        print("Successfully updated game")
        
        return api_response({'message': 'Game updated successfully'})
    except Exception as e:
        print(f"Error updating game: {str(e)}")
        import traceback
        traceback.print_exc()
        return api_response(error=str(e), status=500)

@app.route('/api/games/<game_id>', methods=['DELETE'])
def delete_game(game_id):
    """ゲーム削除"""
    try:
        con = get_db()
        cur = con.cursor()
        
        # ゲーム存在確認
        game = cur.execute('SELECT id FROM games WHERE id = ?', (game_id,)).fetchone()
        if not game:
            return api_response(error='Game not found', status=404)
        
        # 関連するゲーム結果を削除（外部キー制約により自動削除される場合もありますが明示的に削除）
        cur.execute('DELETE FROM game_results WHERE game_id = ?', (game_id,))
        
        # ゲームを削除
        cur.execute('DELETE FROM games WHERE id = ?', (game_id,))
        
        con.commit()
        
        return api_response({'message': 'Game deleted successfully'})
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/games/<game_id>', methods=['GET'])
def get_game_detail(game_id):
    """特定ゲームの詳細取得"""
    try:
        cur = get_db().cursor()
        game = cur.execute('''
            SELECT g.*, s.name as season_name,
                   json_group_array(json_object(
                       'playerId', gr.player_id,
                       'rawScore', gr.raw_score,
                       'rank', gr.rank,
                       'calculatedPoints', gr.calculated_points,
                       'agariCount', gr.agari_count,
                       'riichiCount', gr.riichi_count,
                       'houjuuCount', gr.houjuu_count,
                       'furoCount', gr.furo_count
                   )) as results
            FROM games g
            LEFT JOIN seasons s ON g.season_id = s.id
            LEFT JOIN game_results gr ON g.id = gr.game_id
            WHERE g.id = ?
            GROUP BY g.id
        ''', (game_id,)).fetchone()
        
        if not game:
            return api_response(error='Game not found', status=404)
        
        results = json.loads(game['results']) if game['results'] else []
        # None値を含む結果を除外
        results = [r for r in results if r.get('playerId')]
        
        game_data = {
            'id': game['id'],
            'seasonId': game['season_id'],
            'seasonName': game['season_name'],
            'gameDate': game['game_date'],
            'roundName': game['round_name'],
            'totalHandsInGame': game['total_hands_in_game'],
            'recordedDate': game['recorded_date'],
            'results': results
        }
        
        return api_response(game_data)
    except Exception as e:
        return api_response(error=str(e), status=500)

@app.route('/api/standings/date-range', methods=['GET'])
def get_date_range_standings():
    """期間別の順位表取得（その期間のみの戦績）"""
    try:
        start_date = request.args.get('start_date')  # YYYY-MM-DD形式
        end_date = request.args.get('end_date')  # YYYY-MM-DD形式
        
        if not start_date or not end_date:
            return api_response(error='開始日と終了日の両方が必要です', status=400)
        
        cur = get_db().cursor()
        
        # 指定期間のゲーム結果のみを対象とした統計
        standings = cur.execute('''
            WITH player_stats AS (
                SELECT 
                    p.id,
                    p.name,
                    p.avatar_url,
                    COUNT(gr.id) as games_played,
                    SUM(gr.calculated_points) as total_points,
                    AVG(gr.calculated_points) as average_points,
                    AVG(gr.raw_score) as average_raw_score,
                    AVG(gr.rank) as average_rank,
                    MAX(gr.raw_score) as best_raw_score,
                    SUM(CASE WHEN gr.rank = 1 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN gr.rank = 2 THEN 1 ELSE 0 END) as second_places,
                    SUM(CASE WHEN gr.rank = 3 THEN 1 ELSE 0 END) as third_places,
                    SUM(CASE WHEN gr.rank = 4 THEN 1 ELSE 0 END) as fourth_places,
                    SUM(CASE WHEN gr.rank <= 2 THEN 1 ELSE 0 END) as top_two_finishes,
                    SUM(CASE WHEN gr.rank < 4 THEN 1 ELSE 0 END) as avoid_last_finishes,
                    SUM(COALESCE(gr.agari_count, 0)) as total_agari,
                    SUM(COALESCE(gr.riichi_count, 0)) as total_riichi,
                    SUM(COALESCE(gr.houjuu_count, 0)) as total_houjuu,
                    SUM(COALESCE(gr.furo_count, 0)) as total_furo,
                    SUM(COALESCE(g.total_hands_in_game, 0)) as total_hands
                FROM players p
                LEFT JOIN game_results gr ON p.id = gr.player_id
                LEFT JOIN games g ON gr.game_id = g.id
                WHERE gr.game_id IS NOT NULL AND g.game_date BETWEEN ? AND ?
                GROUP BY p.id, p.name, p.avatar_url
                HAVING games_played > 0
            )
            SELECT 
                id,
                name,
                avatar_url,
                games_played,
                total_points,
                average_points,
                average_raw_score,
                average_rank,
                best_raw_score,
                wins,
                second_places,
                third_places,
                fourth_places,
                CASE WHEN games_played > 0 THEN CAST(wins AS REAL) / games_played ELSE 0 END as win_rate,
                CASE WHEN games_played > 0 THEN CAST(second_places AS REAL) / games_played ELSE 0 END as second_place_rate,
                CASE WHEN games_played > 0 THEN CAST(third_places AS REAL) / games_played ELSE 0 END as third_place_rate,
                CASE WHEN games_played > 0 THEN CAST(fourth_places AS REAL) / games_played ELSE 0 END as fourth_place_rate,
                CASE WHEN games_played > 0 THEN CAST(top_two_finishes AS REAL) / games_played ELSE 0 END as rentai_rate,
                CASE WHEN games_played > 0 THEN CAST(avoid_last_finishes AS REAL) / games_played ELSE 0 END as rasu_kaihi_rate,
                total_agari,
                total_riichi,
                total_houjuu,
                total_furo,
                total_hands,
                CASE WHEN total_hands > 0 THEN CAST(total_agari AS REAL) / total_hands ELSE 0 END as agari_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_riichi AS REAL) / total_hands ELSE 0 END as riichi_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_houjuu AS REAL) / total_hands ELSE 0 END as houjuu_rate_per_hand,
                CASE WHEN total_hands > 0 THEN CAST(total_furo AS REAL) / total_hands ELSE 0 END as furo_rate_per_hand
            FROM player_stats
            ORDER BY total_points DESC, average_points DESC
        ''', (start_date, end_date)).fetchall()
        
        standings_data = []
        for stat in standings:
            # 指定期間のゲーム結果のみを対象とした統計（その期間の戦績のみ）
            recent_games = cur.execute('''
                SELECT gr.calculated_points
                FROM game_results gr
                JOIN games g ON gr.game_id = g.id
                WHERE gr.player_id = ? AND g.game_date BETWEEN ? AND ?
                ORDER BY g.game_date DESC, g.recorded_date DESC
                LIMIT 10
            ''', (stat['id'], start_date, end_date)).fetchall()
            
            last_ten_games_points = [game['calculated_points'] for game in recent_games]
            
            standings_data.append({
                'player': {
                    'id': stat['id'],
                    'name': stat['name'],
                    'avatarUrl': stat['avatar_url']
                },
                'gamesPlayed': stat['games_played'],
                'totalPoints': stat['total_points'],
                'averagePoints': stat['average_points'],
                'averageRawScore': stat['average_raw_score'],
                'averageRank': stat['average_rank'],
                'bestRawScore': stat['best_raw_score'] if stat['best_raw_score'] is not None else 0,
                'rankDistribution': {
                    1: stat['wins'],
                    2: stat['second_places'],
                    3: stat['third_places'],
                    4: stat['fourth_places']
                },
                'winRate': stat['win_rate'],
                'secondPlaceRate': stat['second_place_rate'],
                'thirdPlaceRate': stat['third_place_rate'],
                'fourthPlaceRate': stat['fourth_place_rate'],
                'rentaiRate': stat['rentai_rate'],
                'rasuKaihiRate': stat['rasu_kaihi_rate'],
                'totalAgariCount': stat['total_agari'],
                'totalRiichiCount': stat['total_riichi'],
                'totalHoujuuCount': stat['total_houjuu'],
                'totalFuroCount': stat['total_furo'],
                'totalHandsPlayedIn': stat['total_hands'],
                'agariRatePerHand': stat['agari_rate_per_hand'],
                'riichiRatePerHand': stat['riichi_rate_per_hand'],
                'houjuuRatePerHand': stat['houjuu_rate_per_hand'],
                'furoRatePerHand': stat['furo_rate_per_hand'],
                'lastTenGamesPoints': last_ten_games_points
            })
        
        return api_response(standings_data)
    except Exception as e:
        return api_response(error=str(e), status=500)
