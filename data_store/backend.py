"""Interfaces describing the storage backends used by the project."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, Iterable, List, Optional

from .models import Game, GameResult, Player, Season


class StorageBackend(ABC):
    """Abstract storage backend responsible for data persistence."""

    @abstractmethod
    def list_seasons(self) -> List[Season]:
        raise NotImplementedError

    @abstractmethod
    def get_season(self, season_id: int) -> Season:
        raise NotImplementedError

    @abstractmethod
    def get_active_season(self) -> Season:
        raise NotImplementedError

    @abstractmethod
    def create_season(
        self,
        *,
        name: str,
        start_date: str,
        end_date: Optional[str] = None,
        description: str = "",
        is_active: bool = False,
    ) -> Season:
        raise NotImplementedError

    @abstractmethod
    def update_season(self, season_id: int, **updates: object) -> Season:
        raise NotImplementedError

    @abstractmethod
    def activate_season(self, season_id: int) -> Season:
        raise NotImplementedError

    @abstractmethod
    def list_players(self) -> List[Player]:
        raise NotImplementedError

    @abstractmethod
    def get_player(self, player_id: str) -> Player:
        raise NotImplementedError

    @abstractmethod
    def create_player(self, *, name: str, avatar_url: Optional[str] = None) -> Player:
        raise NotImplementedError

    @abstractmethod
    def update_player(self, player_id: str, **updates: object) -> Player:
        raise NotImplementedError

    @abstractmethod
    def delete_player(self, player_id: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_games(self, season_id: Optional[int] = None) -> List[Game]:
        raise NotImplementedError

    @abstractmethod
    def get_game(self, game_id: str) -> Game:
        raise NotImplementedError

    @abstractmethod
    def create_game(
        self,
        *,
        season_id: int,
        game_date: str,
        round_name: Optional[str] = None,
        total_hands_in_game: Optional[int] = None,
        results: Iterable[Dict[str, object]],
    ) -> Game:
        raise NotImplementedError

    @abstractmethod
    def list_game_results(self, game_id: str) -> List[GameResult]:
        raise NotImplementedError

    @abstractmethod
    def export_state(self) -> Dict[str, List[Dict[str, object]]]:
        raise NotImplementedError


class UnsupportedBackend(RuntimeError):
    """Raised when a caller requests a backend that is not registered."""


__all__ = ["StorageBackend", "UnsupportedBackend"]
