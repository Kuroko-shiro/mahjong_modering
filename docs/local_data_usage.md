# ローカルデータ運用ガイド

このドキュメントでは、ローカル環境で直接データを操作するための
`local_data_service.py` と `local_cli.py` の使い方を説明します。プロジェクトから
Flask バックエンドを完全に取り除き、SQLite データベースを直接扱う形に移行し
ました。これにより HTTP 経由の通信を必要とせず、スクリプトや今後導入予定の
Firebase など別の永続化層へ容易に切り替えられる土台が整っています。

## 1. Python API (`LocalDataService`)

`LocalDataService` クラスは SQLite データベースへ直接アクセスする高水準
インターフェースを提供します。HTTP サーバーを立ち上げる必要がなくなるため、
スクリプトやバッチ処理から簡単にデータを扱えます。

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
バックエンドを含む追加のプロセスは不要で、CLI が直接データベースファイルを
操作します。

## 3. 今後の移行について

- Flask のルーティングロジックと完全に切り離したことで、今後 Firebase 等の別
  実装に切り替える際は `LocalDataService` と同じインターフェースを備えた
  サービスクラスを用意するだけで済みます。
- 既存フロントエンドアセット（`static/` ディレクトリ配下）はそのまま保守し、
  必要に応じて静的ホスティングサービスなどで提供してください。ローカルでの
  データ操作は本モジュールおよび CLI が担います。

## 4. 既知の制限

- トランザクションはメソッド単位でコミットされます。大量の更新を一括で行う
  場合は必要に応じてサービスクラスを拡張してください。
- 現時点ではリーグ設定や統計系エンドポイントのロジックを完全には移植していま
  せん。必要に応じてメソッドを追加してください。
