const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');

// すでに database.db があれば一度消去してリセットする
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('古い database.db を削除しました。');
}

// 新しく database.db を作成して接続
const db = new sqlite3.Database(dbPath);

// SQLファイルの中身を読み込む
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
const seedsSql = fs.readFileSync(path.join(__dirname, 'seeds.sql'), 'utf-8');

// 順番に実行する
db.serialize(() => {
  // 1. テーブルを作成
  db.exec(schemaSql, (err) => {
    if (err) {
      console.error('テーブル作成失敗:', err.message);
      return;
    }
    console.log('1. テーブルを作成しました（schema.sql）');
  });

  // 2. 初期データを投入
  db.exec(seedsSql, (err) => {
    if (err) {
      console.error('データ投入失敗:', err.message);
      return;
    }
    console.log('2. 初期データを追加しました（seeds.sql）');
    console.log('データベースの準備が完了しました！');
  });
});

db.close();