var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
//sqlite3モジュールの読み込み
const sqlite3 = require('sqlite3')
//express-sessionの読み込み
const session = require('express-session');

var usersRouter = require('./routes/users');

var app = express();

//データベースオブジェクトの作成
const db = new sqlite3.Database('./database.db')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// '/' (トップページ) にアクセスしたら '/login' にリダイレクト
app.get('/', (req, res) => {
  res.redirect('/login');
});
app.use('/users', usersRouter);

//セッションの設定
app.use(session({ secret: 'secret'}));

//ログイン画面への移動
app.get('/login', (req, res) => {
  res.render('login', { errorMessage:''});
});

//ログイン機能
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?',[username],(err, row) => {
     if(err){
      res.status(500).send('DB select error');
      return;
    } 
    
    if(!row || row.password !== password){
      res.render('login.ejs', { errorMessage: 'ユーザーIDかパスワードが正しくありません'});
      return;
    }
    req.session.username = username; //ユーザー名保存
    req.session.userId = row.id; // id保存
    res.redirect('/productList');
  });
});

//管理者用ログイン画面への移動
app.get('/admin', (req, res) => {
  res.render('admin', { errorMessage:''});
});

//管理者用ログイン機能
app.post('/admin', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND role = ?',[username, 'admin'],(err, row) => {
     if(err){
      res.status(500).send('DB select error');
      return;
    }

    if(!row || row.password !== password){
      res.render('admin', { errorMessage: 'ユーザーIDかパスワードが正しくありません'});
      return;
    }
    req.session.username = username; //ユーザー名保存
    req.session.userId = row.id; // id保存
    res.redirect('/productAdmin');
  });
});

//ユーザー登録画面への移動
app.get('/register', (req, res) => {
  res.render('register', {errorMessage:''});
});

//ユーザー登録機能
app.post('/register', (req, res) => {
  const { username, password } = req.body;  //↓パスワードが条件を満たしているかチェックする正規表現(12文字以上で、英小文字・英大文字・数字・記号をそれぞれ1文字以上含む)
  const passwordValidation = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
  if(!passwordValidation.test(password)){
    return res.render('register', {errorMessage:'パスワードは大文字、小文字、数字、特殊文字を含む12文字以上でなければなりません。'});
  }

  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
    if(err){
      res.status(500).send('error registering user');
    } else {
      res.redirect('/login');
    }
  });
});

//商品一覧画面への移動
app.get('/productList', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) =>{
    if(err){
      res.status(500).send('DB select error');
      return;
    }
    res.render('productList', { products:rows });
  });
});

//商品詳細画面への移動
app.get('/product/:id', (req, res) => {
  const productId =req.params.id
  db.get('SELECT * FROM products WHERE id = ?', [productId],(err, rows) =>{
    if(err){
      res.status(500).send('DB select error');
      return;
    }
    res.render('productDetail',{product: rows});
  });
});

//商品をカートに追加
app.post('/add-to-cart', express.urlencoded({ extended: true }), (req, res) => {
  const { product_id, quantity } = req.body;
  const userId =req.session.userId; //ユーザーidを受け取る処理

  db.get('SELECT * FROM cart WHERE product_id = ? AND user_id = ?', [product_id, userId], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('cart select error');
      return;
    }

    if (row) {  // カートに既に同じ商品がある場合は個数を更新（UPDATE）
      const newQuantity = row.quantity + parseInt(quantity);
      db.run('UPDATE cart SET quantity = ? WHERE product_id = ? AND user_id = ?', [newQuantity, product_id, userId], function(err) {
        if (err) {
          console.error(err.message);
          res.status(500).send('cart update error');
        } else {
          res.redirect('/cart');
        }
      });
    } else {// カートに商品が無い場合は新しく追加（INSERT）
      db.run('INSERT INTO cart (product_id, quantity, user_id) VALUES (?, ?, ?)', [product_id, quantity, userId], function(err) {
        if (err) {
          console.error(err.message);
          res.status(500).send('DB insert error');
        } else {
          res.redirect('/cart');
        }
      });
    }
  });
});

//カート画面への移動
app.get('/cart', (req, res) => {
  const userId = req.session.userId; //ユーザーid作成
  db.all('SELECT c.id, p.name, p.price, c.quantity FROM cart c JOIN products p ON c.product_id = p.id WHERE  c.user_id = ?', userId, (err, rows) => {
    if(err){
      console.error(err.message); // ターミナルに詳細ログを出すように追加
      res.status(500).send('DB select error');
      return;
    }
    var totalPrice = rows.reduce((total, item) => total + (item.price * item.quantity), 0);
    res.render('cart', { cartItems:rows, totalPrice});
  });
});

//カートの数量を更新
app.post('/update-cart/:id', (req, res) => {
  const id = req.params.id;
  const { quantity } = req.body;

  db.run('UPDATE cart SET quantity = ? WHERE id = ?', [quantity, id], function(err) {
    if (err) { //エラーが起きた時
      res.status(500).send('cart update error');
    } else{ //エラーが起きなかった時
      res.redirect('/cart');
    }
  });
});

//カートから商品を削除
app.post('/remove-from-cart/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM cart WHERE id = ?', id, function(err) {
    if (err) {
      res.status(500).send('cart delete error');
    } else{ //エラーが起きなかった時
      res.redirect('/cart');
    }
  });
});

//商品管理画面への移動
app.get('/productAdmin', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) =>{
      if(err){
        res.status(500).send('DB select error');
        return;
      }
    res.render('productAdmin', { products: rows});
  });
});

//商品追加機能
app.post('/productAdmin/add', (req, res) => {
  const { name, price, description, image_url } = req.body;
  db.run('INSERT INTO products(name, price, description, image_url) VALUES (?, ?, ?, ?)', [name, price, description, image_url], function(err) {     if(err){
      console.error(err.message); // ターミナルに詳細ログを出すように追加
      res.status(500).send('DB insert error');
    } else {
      res.redirect('/productAdmin');
    }
  });
});

//商品情報変更機能
app.post('/productAdmin/update/:id', (req, res) => {
  const productID = req.params.id;
  const { name, price, description, image_url } = req.body;
  db.run('UPDATE products SET name =?, price = ?, description = ?, image_url = ? WHERE id = ?', [name, price, description, image_url, productID], function(err) {
    if(err){
        res.status(500).send('DB update error');        
      } else {
        res.redirect('/productAdmin');
      }
  });
});

//商品削除機能
app.post('/productAdmin/delete/:id', (req, res) => {
  const productId = req.params.id;
  db.run('DELETE FROM products WHERE id =?', productId, function(err) {
     if(err){
        res.status(500).send('DB delete error');        
      } else {
        res.redirect('/productAdmin');
      }
  });
});

//購入機能
app.post('/checkout', (req, res) => {
  const userId = req.session.userId; //ユーザーid作成
  db.all('SELECT c.id, p.name, p.price, c.quantity FROM cart c JOIN products p ON c.product_id = p.id WHERE  c.user_id = ?', userId, (err, rows) => {
    if(err){
      console.error(err.message); // ターミナルに詳細ログを出すように追加
      res.status(500).send('DB select error');
      return;
    }
    var totalPrice = rows.reduce((total, item) => total + (item.price * item.quantity), 0);

    db.all('DELETE FROM cart WHERE user_id = ?', userId, function(err) {
      if (err) {
        res.status(500).send('DB delete error');
      } else {
        res.render('checkout', { message:'購入ありがとうございました。', cartItems:rows, totalPrice});
      }
    });
  });
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;