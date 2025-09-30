"""SQLite implementation of the storage backend."""
from __future__ import annotations

import sqlite3
import uuid
from contextlib import contextmanager
from dataclasses import asdict
from datetime import date
from pathlib import Path
from typing import Dict, Generator, Iterable, List, Optional

from .backend import StorageBackend
from .models import Game, GameResult, Player, Season

DEFAULT_DATABASE = Path(__file__).resolve().with_name("database.db")


class SQLiteBackend(StorageBackend):
    """Concrete :class:`StorageBackend` backed by SQLite files."""

    def __init__(self, database_path: Path | str = DEFAULT_DATABASE) -> None:
        self._database_path = Path(database_path)
        if not self._database_path.exists():
            raise FileNotFoundError(f"Database file not found: {self._database_path}")

    @contextmanager
    def _connection(self) -> Generator[sqlite3.Connection, None, None]:
        conn = sqlite3.connect(self._database_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    # Season operations -------------------------------------------------
    def list_seasons(self) -> List[Season]:
        with self._connection() as conn:
            rows = conn.execute(
                """
                SELECT s.*
                FROM seasons s
                ORDER BY s.created_date DESC
                """
            ).fetchall()

        return [
            Season(
                id=row["id"],
                name=row["name"],
                start_date=row["start_date"],
                end_date=row["end_date"],
                is_active=bool(row["is_active"]),
                description=row["description"],
                created_date=row["created_date"],
                updated_date=row["updated_date"],
            )
            for row in rows
        ]

    def get_season(self, season_id: int) -> Season:
        with self._connection() as conn:
            row = conn.execute(
                "SELECT * FROM seasons WHERE id = ?",
                (season_id,),
            ).fetchone()

        if row is None:
            raise LookupError(f"Season {season_id} not found")

        return Season(
            id=row["id"],
            name=row["name"],
            start_date=row["start_date"],
            end_date=row["end_date"],
            is_active=bool(row["is_active"]),
            description=row["description"],
            created_date=row["created_date"],
            updated_date=row["updated_date"],
        )

    def get_active_season(self) -> Season:
        with self._connection() as conn:
            row = conn.execute(
                "SELECT * FROM seasons WHERE is_active = 1 LIMIT 1"
            ).fetchone()

        if row is None:
            raise LookupError("No active season found")

        return Season(
            id=row["id"],
            name=row["name"],
            start_date=row["start_date"],
            end_date=row["end_date"],
            is_active=True,
            description=row["description"],
            created_date=row["created_date"],
            updated_date=row["updated_date"],
        )

    def create_season(
        self,
        *,
        name: str,
        start_date: str,
        end_date: Optional[str] = None,
        description: str = "",
        is_active: bool = False,
    ) -> Season:
        if not name:
            raise ValueError("Season name is required")

        with self._connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO seasons (name, start_date, end_date, is_active, description)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, start_date, end_date, int(is_active), description),
            )
            season_id = cur.lastrowid
            cur.execute(
                """
                INSERT INTO league_settings (
                    season_id,
                    game_start_chip_count,
                    calculation_base_chip_count,
                    uma_1st,
                    uma_2nd,
                    uma_3rd
                )
                VALUES (?, 25000, 25000, 20, 10, -10)
                """,
                (season_id,),
            )

        return self.get_season(season_id)

    def update_season(self, season_id: int, **updates: object) -> Season:
        if not updates:
            raise ValueError("No updates provided")

        allowed_fields = {"name", "start_date", "end_date", "description", "is_active"}
        unknown = set(updates) - allowed_fields
        if unknown:
            raise ValueError(f"Unknown fields: {', '.join(sorted(unknown))}")

        assignments: List[str] = []
        params: List[object] = []
        for key, value in updates.items():
            if key == "is_active":
                value = int(bool(value))
            assignments.append(f"{key} = ?")
            params.append(value)
        params.append(season_id)

        with self._connection() as conn:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE seasons SET {', '.join(assignments)} WHERE id = ?",
                params,
            )
            if cur.rowcount == 0:
                raise LookupError(f"Season {season_id} not found")

        return self.get_season(season_id)

    def activate_season(self, season_id: int) -> Season:
        with self._connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1 FROM seasons WHERE id = ?", (season_id,))
            if cur.fetchone() is None:
                raise LookupError(f"Season {season_id} not found")
            cur.execute("UPDATE seasons SET is_active = 0")
            cur.execute("UPDATE seasons SET is_active = 1 WHERE id = ?", (season_id,))

        return self.get_season(season_id)

    # Player operations -------------------------------------------------
    def list_players(self) -> List[Player]:
        with self._connection() as conn:
            rows = conn.execute("SELECT * FROM players ORDER BY name").fetchall()

        return [
            Player(
                id=row["id"],
                name=row["name"],
                avatar_url=row["avatar_url"],
                created_date=row["created_date"],
                updated_date=row["updated_date"],
            )
            for row in rows
        ]

    def get_player(self, player_id: str) -> Player:
        with self._connection() as conn:
            row = conn.execute(
                "SELECT * FROM players WHERE id = ?",
                (player_id,),
            ).fetchone()

        if row is None:
            raise LookupError(f"Player {player_id} not found")

        return Player(
            id=row["id"],
            name=row["name"],
            avatar_url=row["avatar_url"],
            created_date=row["created_date"],
            updated_date=row["updated_date"],
        )

    def create_player(self, *, name: str, avatar_url: Optional[str] = None) -> Player:
        if not name:
            raise ValueError("Player name is required")

        player_id = str(uuid.uuid4())
        with self._connection() as conn:
            conn.execute(
                """
                INSERT INTO players (id, name, avatar_url)
                VALUES (?, ?, ?)
                """,
                (player_id, name, avatar_url),
            )

        return self.get_player(player_id)

    def update_player(self, player_id: str, **updates: object) -> Player:
        if not updates:
            raise ValueError("No updates provided")

        allowed_fields = {"name", "avatar_url"}
        unknown = set(updates) - allowed_fields
        if unknown:
            raise ValueError(f"Unknown fields: {', '.join(sorted(unknown))}")

        assignments = [f"{key} = ?" for key in updates]
        params = list(updates.values()) + [player_id]

        with self._connection() as conn:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE players SET {', '.join(assignments)} WHERE id = ?",
                params,
            )
            if cur.rowcount == 0:
                raise LookupError(f"Player {player_id} not found")

        return self.get_player(player_id)

    def delete_player(self, player_id: str) -> None:
        with self._connection() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM players WHERE id = ?", (player_id,))
            if cur.rowcount == 0:
                raise LookupError(f"Player {player_id} not found")

    # Game operations ---------------------------------------------------
    def list_games(self, season_id: Optional[int] = None) -> List[Game]:
        query = "SELECT * FROM games"
        params: List[object] = []
        if season_id is not None:
            query += " WHERE season_id = ?"
            params.append(season_id)
        query += " ORDER BY game_date DESC, recorded_date DESC"

        with self._connection() as conn:
            rows = conn.execute(query, params).fetchall()

        return [
            Game(
                id=row["id"],
                season_id=row["season_id"],
                game_date=row["game_date"],
                round_name=row["round_name"],
                total_hands_in_game=row["total_hands_in_game"],
                recorded_date=row["recorded_date"],
            )
            for row in rows
        ]

    def get_game(self, game_id: str) -> Game:
        with self._connection() as conn:
            row = conn.execute(
                "SELECT * FROM games WHERE id = ?",
                (game_id,),
            ).fetchone()

        if row is None:
            raise LookupError(f"Game {game_id} not found")

        return Game(
            id=row["id"],
            season_id=row["season_id"],
            game_date=row["game_date"],
            round_name=row["round_name"],
            total_hands_in_game=row["total_hands_in_game"],
            recorded_date=row["recorded_date"],
        )

    def create_game(
        self,
        *,
        season_id: int,
        game_date: str,
        round_name: Optional[str] = None,
        total_hands_in_game: Optional[int] = None,
        results: Iterable[Dict[str, object]],
    ) -> Game:
        game_id = str(uuid.uuid4())

        with self._connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO games (id, season_id, game_date, round_name, total_hands_in_game)
                VALUES (?, ?, ?, ?, ?)
                """,
                (game_id, season_id, game_date, round_name, total_hands_in_game),
            )

            for result in results:
                self._insert_game_result(cur, game_id=game_id, result=result)

        return self.get_game(game_id)

    def _insert_game_result(
        self, cursor: sqlite3.Cursor, *, game_id: str, result: Dict[str, object]
    ) -> None:
        required = {"player_id", "raw_score", "rank", "calculated_points"}
        missing = required - result.keys()
        if missing:
            raise ValueError(
                "Missing keys for game result: " + ", ".join(sorted(missing))
            )

        cursor.execute(
            """
            INSERT INTO game_results (
                game_id,
                player_id,
                raw_score,
                rank,
                calculated_points,
                agari_count,
                riichi_count,
                houjuu_count,
                furo_count
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                game_id,
                result["player_id"],
                result["raw_score"],
                result["rank"],
                result["calculated_points"],
                result.get("agari_count", 0),
                result.get("riichi_count", 0),
                result.get("houjuu_count", 0),
                result.get("furo_count", 0),
            ),
        )

    def list_game_results(self, game_id: str) -> List[GameResult]:
        with self._connection() as conn:
            rows = conn.execute(
                """
                SELECT * FROM game_results
                WHERE game_id = ?
                ORDER BY rank
                """,
                (game_id,),
            ).fetchall()

        return [
            GameResult(
                id=row["id"],
                game_id=row["game_id"],
                player_id=row["player_id"],
                raw_score=row["raw_score"],
                rank=row["rank"],
                calculated_points=row["calculated_points"],
                agari_count=row["agari_count"],
                riichi_count=row["riichi_count"],
                houjuu_count=row["houjuu_count"],
                furo_count=row["furo_count"],
            )
            for row in rows
        ]

    # Utility -----------------------------------------------------------
    def export_state(self) -> Dict[str, List[Dict[str, object]]]:
        data = {
            "seasons": [asdict(season) for season in self.list_seasons()],
            "players": [asdict(player) for player in self.list_players()],
            "games": [asdict(game) for game in self.list_games()],
        }

        with self._connection() as conn:
            rows = conn.execute("SELECT * FROM game_results").fetchall()
        data["game_results"] = [dict(row) for row in rows]
        return data


def normalize_date(value: date | str) -> str:
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


__all__ = ["SQLiteBackend", "DEFAULT_DATABASE", "normalize_date"]
