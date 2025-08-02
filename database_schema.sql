-- シーズンテーブル
CREATE TABLE seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT 0,
    description TEXT,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- プレイヤーテーブル
CREATE TABLE players (
    id TEXT PRIMARY KEY, -- UUID形式
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE league_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL,
    game_start_chip_count INTEGER NOT NULL DEFAULT 25000,
    calculation_base_chip_count INTEGER NOT NULL DEFAULT 25000,
    uma_1st INTEGER NOT NULL DEFAULT 20,
    uma_2nd INTEGER NOT NULL DEFAULT 10,
    uma_3rd INTEGER NOT NULL DEFAULT -10,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

-- ゲームテーブル
CREATE TABLE games (
    id TEXT PRIMARY KEY, -- UUID形式
    season_id INTEGER NOT NULL,
    game_date DATE NOT NULL,
    round_name TEXT,
    total_hands_in_game INTEGER,
    recorded_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

CREATE TABLE game_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    raw_score INTEGER NOT NULL,
    rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 4),
    calculated_points REAL NOT NULL,
    agari_count INTEGER DEFAULT 0,
    riichi_count INTEGER DEFAULT 0,
    houjuu_count INTEGER DEFAULT 0,
    furo_count INTEGER DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE (game_id, player_id),
    UNIQUE (game_id, rank)
);

-- インデックス作成
CREATE INDEX idx_seasons_active ON seasons(is_active);
CREATE INDEX idx_games_season_date ON games(season_id, game_date);
CREATE INDEX idx_game_results_player ON game_results(player_id);
CREATE INDEX idx_game_results_game ON game_results(game_id);
CREATE INDEX idx_league_settings_season ON league_settings(season_id);


-- トリガー：更新日時の自動更新
CREATE TRIGGER update_seasons_timestamp 
    AFTER UPDATE ON seasons
    BEGIN
        UPDATE seasons SET updated_date = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_players_timestamp 
    AFTER UPDATE ON players
    BEGIN
        UPDATE players SET updated_date = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_league_settings_timestamp 
    AFTER UPDATE ON league_settings
    BEGIN
        UPDATE league_settings SET updated_date = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- アクティブシーズンの一意性制約
CREATE TRIGGER enforce_single_active_season
    BEFORE UPDATE ON seasons
    WHEN NEW.is_active = 1 AND OLD.is_active = 0
    BEGIN
        UPDATE seasons SET is_active = 0 WHERE is_active = 1 AND id != NEW.id;
    END;

CREATE TRIGGER enforce_single_active_season_insert
    BEFORE INSERT ON seasons
    WHEN NEW.is_active = 1
    BEGIN
        UPDATE seasons SET is_active = 0 WHERE is_active = 1;
    END;

-- ビュー：全シーズン累計の順位表用
CREATE VIEW view_all_standings AS
SELECT
    p.id,
    p.name,
    p.avatar_url,
    COUNT(gr.id) AS games_played,
    SUM(gr.calculated_points) AS total_points,
    AVG(gr.calculated_points) AS average_points,
    AVG(gr.raw_score) AS average_raw_score,
    AVG(gr.rank) AS average_rank,
    MAX(gr.raw_score) AS best_raw_score,
    SUM(CASE WHEN gr.rank = 1 THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN gr.rank = 2 THEN 1 ELSE 0 END) AS second_places,
    SUM(CASE WHEN gr.rank = 3 THEN 1 ELSE 0 END) AS third_places,
    SUM(CASE WHEN gr.rank = 4 THEN 1 ELSE 0 END) AS fourth_places,
    SUM(CASE WHEN gr.rank <= 2 THEN 1 ELSE 0 END) AS top_two_finishes,
    SUM(CASE WHEN gr.rank < 4 THEN 1 ELSE 0 END) AS avoid_last_finishes,
    SUM(COALESCE(gr.agari_count, 0)) AS total_agari,
    SUM(COALESCE(gr.riichi_count, 0)) AS total_riichi,
    SUM(COALESCE(gr.houjuu_count, 0)) AS total_houjuu,
    SUM(COALESCE(gr.furo_count, 0)) AS total_furo,
    SUM(COALESCE(g.total_hands_in_game, 0)) AS total_hands
FROM players p
LEFT JOIN game_results gr ON p.id = gr.player_id
LEFT JOIN games g ON gr.game_id = g.id
GROUP BY p.id;

CREATE VIEW view_season_summary AS
SELECT
    g.season_id,
    COUNT(DISTINCT g.id) AS game_count,
    COUNT(DISTINCT gr.player_id) AS player_count
FROM games g
JOIN game_results gr ON g.id = gr.game_id
GROUP BY g.season_id;

CREATE VIEW view_game_results_flat AS
SELECT
    g.id AS game_id,
    g.season_id,
    g.game_date,
    g.round_name,
    g.total_hands_in_game,
    gr.player_id,
    gr.raw_score,
    gr.rank,
    gr.calculated_points,
    gr.agari_count,
    gr.riichi_count,
    gr.houjuu_count,
    gr.furo_count
FROM games g
JOIN game_results gr ON g.id = gr.game_id;