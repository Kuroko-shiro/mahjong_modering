# ローカルデータ運用ガイド

このドキュメントでは、Flask API を介さずにローカル環境で直接データを
操作するために追加された `local_data_service.py` と `local_cli.py` の使い方を
説明します。第一段階として SQLite のデータファイルを直接扱えるようにする
ことで、今後 Firebase など別の永続化層へ移行しやすい形に整理しました。

## 1. Python API (`LocalDataService`)

`LocalDataService` クラスは SQLite データベースへ直接アクセスする高水準
インターフェースを提供します。HTTP 経由の通信が不要になるため、スクリプトや
バッチ処理から簡単にデータを扱えます。

```python
from pathlib import Path
from local_data_service import LocalDataService

service = LocalDataService(Path("./database.db"))

# シーズン一覧を取得
seasons = service.list_seasons()

# 新しいシーズンを作成
created = service.create_season(
    name="Season 2",
    start_date="2025-04-01",
    description="春リーグ",
    is_active=True,
)

print(created)
```

主なメソッド

- `list_seasons()`, `get_season()`, `create_season()`, `update_season()`,
  `activate_season()`
- `list_players()`, `create_player()`, `update_player()`, `delete_player()`
- `list_games()`, `create_game()`, `get_game()`, `list_game_results()`
- `export_state()` で DB のスナップショットを取得

## 2. コマンドラインツール (`local_cli.py`)

よく使う操作は CLI から呼び出せます。Python 3.10 以上を想定しています。

```bash
python local_cli.py list-seasons
python local_cli.py create-player "新規プレイヤー"
python local_cli.py export > snapshot.json
```

`--database` オプションで任意の SQLite ファイルを指定することも可能です。

## 3. 今後の移行について

- Flask のルーティングロジックと切り離したことで、今後 Firebase 等の別実装に
  切り替える際は `LocalDataService` と同じインターフェースを備えたサービス
  クラスを用意するだけで済みます。
- 既存フロントエンドは現状変更していません。HTTP API を使わずにローカルで
  データを操作したい場合は本モジュールを利用してください。

## 4. 既知の制限

- トランザクションはメソッド単位でコミットされます。大量の更新を一括で行う
  場合は必要に応じてサービスクラスを拡張してください。
- 現時点ではリーグ設定や統計系エンドポイントのロジックを完全には移植していま
  せん。必要に応じてメソッドを追加してください。
