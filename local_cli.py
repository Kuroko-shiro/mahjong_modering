"""Command line helpers for interacting with the local data service."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from local_data_service import LocalDataService, LocalDataServiceError


def _parse_backend_options(values: list[str]) -> dict[str, str]:
    options: dict[str, str] = {}
    for item in values:
        if "=" not in item:
            raise ValueError(
                f"Backend option '{item}' must be in KEY=VALUE format"
            )
        key, value = item.split("=", 1)
        options[key] = value
    return options


def _print_json(data: Any) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Mahjong league local data utility"
    )
    parser.add_argument(
        "--database",
        type=Path,
        default=Path(__file__).with_name("database.db"),
        help="Path to the SQLite database file",
    )
    parser.add_argument(
        "--backend",
        default="sqlite",
        help="Name of the registered backend to use (default: sqlite)",
    )
    parser.add_argument(
        "--backend-option",
        action="append",
        default=[],
        metavar="KEY=VALUE",
        help="Extra option passed to the backend factory",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list-seasons", help="List all seasons")

    parser_create_season = subparsers.add_parser("create-season", help="Create season")
    parser_create_season.add_argument("name")
    parser_create_season.add_argument("start_date")
    parser_create_season.add_argument("--end-date")
    parser_create_season.add_argument("--description", default="")
    parser_create_season.add_argument(
        "--active", action="store_true", help="Mark created season as active"
    )

    parser_activate = subparsers.add_parser("activate-season", help="Activate season")
    parser_activate.add_argument("season_id", type=int)

    subparsers.add_parser("list-players", help="List all players")

    parser_create_player = subparsers.add_parser("create-player", help="Create player")
    parser_create_player.add_argument("name")
    parser_create_player.add_argument("--avatar-url")

    parser_delete_player = subparsers.add_parser("delete-player", help="Delete player")
    parser_delete_player.add_argument("player_id")

    subparsers.add_parser("export", help="Export complete database snapshot")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        backend_options = _parse_backend_options(args.backend_option)
    except ValueError as exc:
        parser.error(str(exc))

    service = LocalDataService(
        args.database,
        backend_name=args.backend,
        backend_options=backend_options,
    )

    try:
        if args.command == "list-seasons":
            seasons = [season.__dict__ for season in service.list_seasons()]
            _print_json(seasons)
        elif args.command == "create-season":
            season = service.create_season(
                name=args.name,
                start_date=args.start_date,
                end_date=args.end_date,
                description=args.description,
                is_active=args.active,
            )
            _print_json(season.__dict__)
        elif args.command == "activate-season":
            season = service.activate_season(args.season_id)
            _print_json(season.__dict__)
        elif args.command == "list-players":
            players = [player.__dict__ for player in service.list_players()]
            _print_json(players)
        elif args.command == "create-player":
            player = service.create_player(name=args.name, avatar_url=args.avatar_url)
            _print_json(player.__dict__)
        elif args.command == "delete-player":
            service.delete_player(args.player_id)
            _print_json({"deleted": args.player_id})
        elif args.command == "export":
            _print_json(service.export_state())
        else:  # pragma: no cover - defensive
            parser.error(f"Unsupported command: {args.command}")
    except LocalDataServiceError as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
