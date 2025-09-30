"""Domain models shared across storage backends."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(slots=True)
class Season:
    id: int
    name: str
    start_date: str
    end_date: Optional[str]
    is_active: bool
    description: Optional[str]
    created_date: str
    updated_date: str


@dataclass(slots=True)
class Player:
    id: str
    name: str
    avatar_url: Optional[str]
    created_date: str
    updated_date: str


@dataclass(slots=True)
class Game:
    id: str
    season_id: int
    game_date: str
    round_name: Optional[str]
    total_hands_in_game: Optional[int]
    recorded_date: str


@dataclass(slots=True)
class GameResult:
    id: int
    game_id: str
    player_id: str
    raw_score: int
    rank: int
    calculated_points: float
    agari_count: int
    riichi_count: int
    houjuu_count: int
    furo_count: int


__all__ = ["Season", "Player", "Game", "GameResult"]
