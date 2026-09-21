var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
//sqlite3モジュールの読み込み
const sqlite3 = require('sqlite3')

var indexRouter = require('./routes/index');
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

app.use('/', indexRouter);
app.use('/users', usersRouter);

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
app.post('/add-to-cart', express.urlencoded({extended: true }),(req,res) => {
  const { product_id, quantity} = req.body;
  db.run('INSERT INTO cart (product_id, quantity) VALUES (?, ?)', [product_id, quantity], function(err) {
    if(err){
      console.error(err.message); // ターミナルに詳細ログを出すように追加
      res.status(500).send('DB insert error');      
    } else{
      res.redirect('/cart'); // 追加後はカート画面に遷移させるのが一般的
    }
  });
});

//カート画面への移動
app.get('/cart', (req, res) => {
  db.all('SELECT c.id, p.name, p.price, c.quantity FROM cart c JOIN products p ON c.product_id = p.id', (err, rows) => {
    if(err){
      console.error(err.message); // ターミナルに詳細ログを出すように追加
      res.status(500).send('DB select error');
      return;
    }
    var totalPrice = rows.reduce((total, item) => total + (item.price * item.quantity), 0);
    res.render('cart', { cartItems:rows, totalPrice});
  })

})

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