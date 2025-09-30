"""High level data orchestration for local workflows.

The :class:`LocalDataService` coordinates concrete storage backends so the
project can move from the historical SQLite file towards Firebase.  Callers
continue to work with Pythonic models while the service decides which backend
handles the persistence.  During the first migration stage we keep using the
SQLite backend, but the registry allows us to introduce new ones (such as
Firebase) without touching the call sites.
"""
from __future__ import annotations

from collections.abc import Callable
from datetime import date
from pathlib import Path
from typing import Dict, Iterable, List, Optional, TypeVar

from data_store import (
    DEFAULT_DATABASE,
    Game,
    GameResult,
    Player,
    SQLiteBackend,
    Season,
    StorageBackend,
    UnsupportedBackend,
    normalize_date,
)

_BackendFactory = Callable[..., StorageBackend]
_T = TypeVar("_T")


class LocalDataServiceError(RuntimeError):
    """Raised when a data operation fails."""


class LocalDataService:
    """Facade that wraps the active storage backend."""

    _registry: Dict[str, _BackendFactory] = {"sqlite": SQLiteBackend}

    def __init__(
        self,
        database_path: Path | str = DEFAULT_DATABASE,
        *,
        backend_name: str = "sqlite",
        backend: StorageBackend | None = None,
        backend_options: Optional[Dict[str, object]] = None,
    ) -> None:
        self._database_path = Path(database_path)
        if backend is None:
            backend_options = dict(backend_options or {})
            if backend_name == "sqlite":
                backend_options.setdefault("database_path", self._database_path)
            try:
                backend = self._create_backend(backend_name, backend_options)
            except UnsupportedBackend as exc:
                raise LocalDataServiceError(str(exc)) from exc
        self._backend = backend

    # Registry helpers --------------------------------------------------
    @classmethod
    def register_backend(cls, name: str, factory: _BackendFactory) -> None:
        cls._registry[name] = factory

    @classmethod
    def unregister_backend(cls, name: str) -> None:
        cls._registry.pop(name, None)

    @classmethod
    def _create_backend(
        cls, backend_name: str, backend_options: Optional[Dict[str, object]]
    ) -> StorageBackend:
        try:
            factory = cls._registry[backend_name]
        except KeyError as exc:  # pragma: no cover - defensive
            raise UnsupportedBackend(
                f"Backend '{backend_name}' is not registered"
            ) from exc
        options = backend_options or {}
        return factory(**options)

    # Season helpers ----------------------------------------------------
    def list_seasons(self) -> List[Season]:
        return self._call(self._backend.list_seasons)

    def get_season(self, season_id: int) -> Season:
        return self._call(self._backend.get_season, season_id)

    def get_active_season(self) -> Season:
        return self._call(self._backend.get_active_season)

    def create_season(
        self,
        *,
        name: str,
        start_date: date | str,
        end_date: Optional[date | str] = None,
        description: str = "",
        is_active: bool = False,
    ) -> Season:
        return self._call(
            self._backend.create_season,
            name=name,
            start_date=normalize_date(start_date),
            end_date=normalize_date(end_date) if end_date else None,
            description=description,
            is_active=is_active,
        )

    def update_season(self, season_id: int, **updates: object) -> Season:
        if "start_date" in updates and updates["start_date"] is not None:
            updates["start_date"] = normalize_date(updates["start_date"])
        if "end_date" in updates and updates["end_date"] is not None:
            updates["end_date"] = normalize_date(updates["end_date"])
        return self._call(self._backend.update_season, season_id, **updates)

    def activate_season(self, season_id: int) -> Season:
        return self._call(self._backend.activate_season, season_id)

    # Player helpers ----------------------------------------------------
    def list_players(self) -> List[Player]:
        return self._call(self._backend.list_players)

    def create_player(self, *, name: str, avatar_url: Optional[str] = None) -> Player:
        return self._call(
            self._backend.create_player,
            name=name,
            avatar_url=avatar_url,
        )

    def get_player(self, player_id: str) -> Player:
        return self._call(self._backend.get_player, player_id)

    def update_player(self, player_id: str, **updates: object) -> Player:
        return self._call(self._backend.update_player, player_id, **updates)

    def delete_player(self, player_id: str) -> None:
        self._call(self._backend.delete_player, player_id)

    # Game helpers ------------------------------------------------------
    def list_games(self, season_id: Optional[int] = None) -> List[Game]:
        return self._call(self._backend.list_games, season_id)

    def create_game(
        self,
        *,
        season_id: int,
        game_date: date | str,
        round_name: Optional[str] = None,
        total_hands_in_game: Optional[int] = None,
        results: Iterable[Dict[str, object]],
    ) -> Game:
        normalised_results = list(results)
        return self._call(
            self._backend.create_game,
            season_id=season_id,
            game_date=normalize_date(game_date),
            round_name=round_name,
            total_hands_in_game=total_hands_in_game,
            results=normalised_results,
        )

    def get_game(self, game_id: str) -> Game:
        return self._call(self._backend.get_game, game_id)

    def list_game_results(self, game_id: str) -> List[GameResult]:
        return self._call(self._backend.list_game_results, game_id)

    # Utility helpers ---------------------------------------------------
    def export_state(self) -> Dict[str, List[Dict[str, object]]]:
        return self._call(self._backend.export_state)

    # Internal helpers --------------------------------------------------
    def _call(self, func: Callable[..., _T], *args, **kwargs) -> _T:
        try:
            return func(*args, **kwargs)
        except (FileNotFoundError, LookupError, ValueError) as exc:
            raise LocalDataServiceError(str(exc)) from exc


__all__ = [
    "LocalDataService",
    "LocalDataServiceError",
    "Season",
    "Player",
    "Game",
    "GameResult",
]
