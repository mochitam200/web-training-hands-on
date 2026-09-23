-- テスト用のユーザーを追加（管理者1名、一般ユーザー1名）
INSERT INTO users (username, password, role) VALUES 
('admin', 'Admin123456!', 'admin'),
('user1', 'User123456!!', 'user');

-- テスト用の商品を追加
INSERT INTO products (name, price, description, image_url) VALUES 
('ノートパソコン', 120000, '高性能なノートPCです。', 'images/pc.png'),
('ワイヤレスイヤホン', 15000, 'ノイズキャンセリング機能付き。', 'images/earphones.png'),
('コーヒーカップ', 1500, 'シンプルな陶器のカップです。', 'images/cup.png');