# ローカルデータ運用ガイド

このドキュメントでは、ローカル環境で直接データを操作するための
`local_data_service.py` と `local_cli.py` の使い方を説明します。プロジェクトから
Flask バックエンドを完全に取り除き、バックエンドをプラグイン形式で切り替えら
れる `data_store` レイヤーを導入しました。現在は SQLite 実装を利用しますが、同
じインターフェースで Firebase バックエンドを後から追加できるよう設計されています。

## 1. Python API (`LocalDataService`)

`LocalDataService` クラスは登録済みの永続化バックエンドに委譲する高水準
インターフェースを提供します。HTTP サーバーを立ち上げる必要がなくなるため、
スクリプトやバッチ処理から簡単にデータを扱えます。初期状態では SQLite 用の
バックエンドが選択されますが、Firebase 実装が整い次第、同じサービス API を
通じて切り替えられます。

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

# 別バックエンドを指定する例（Firebase 実装が登録されたら有効）
python local_cli.py --backend firebase --backend-option project_id=your-project list-seasons
```

`--database` オプションで任意の SQLite ファイルを指定することも可能です。
さらに `--backend` と `--backend-option` を使うことで、登録済みのバックエンドへ
任意の接続情報を渡せます。バックエンドを含む追加のプロセスは不要で、CLI が
直接永続化レイヤーを操作します。

## 3. 今後の移行について

- Flask のルーティングロジックと完全に切り離し、`LocalDataService` が
  バックエンドをファクトリ経由で切り替えられるようになりました。Firebase 等へ
  移行する際は `StorageBackend` を実装してレジストリへ登録するだけで API は
  そのまま利用できます。
- 既存フロントエンドアセット（`static/` ディレクトリ配下）はそのまま保守し、
  必要に応じて静的ホスティングサービスなどで提供してください。ローカルでの
  データ操作は本モジュールおよび CLI が担います。

## 4. 既知の制限

- トランザクションはメソッド単位でコミットされます。大量の更新を一括で行う
  場合は必要に応じてサービスクラスを拡張してください。
- 現時点ではリーグ設定や統計系エンドポイントのロジックを完全には移植していま
  せん。必要に応じてメソッドを追加してください。
