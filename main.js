/*
メモ
・res.renderの第２引数はオブジェクトでなければいけない
・Node.jsでcssのような静的ファイルを利用するには、express.staticが必要
*/

const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();

const get_C = '\u001b[31m' + "get " + '\u001b[0m';//どのURLに飛んだのかをconsole.logでわかりやすく確認するためのもの、文字に色を加えてくれる
const pos_C = '\u001b[34m' + "pos " + '\u001b[0m';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("/Applications/MAMP/htdocs"));//Node.jsだとこれを書かないとcssが使えない

const connection = mysql.createConnection({//mysqlに接続するために使うオブジェクト
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'test0707'
  });

  connection.connect((err) => {//接続テスト
    if (err) {
      console.log('error connecting: ' + err.stack);
      return;
    }
    console.log('起動成功');
  });

  //変数郡 各ページで値を受け渡す必要がある場合はここで定義する
  var change_data={ // / → /chnage
    content:""//変更するデータ
  }

  var now_user = "ログインなし";//現在ログインしているユーザー

  var users_data;//登録されているユーザーの情報

  var request_id;//申請される備品のid  / → /request

  var print_id;//書類作成する備品のid /notice → /print

  connection.query('select * from users', (err, results, fields) =>{//登録されているユーザーを持ってくる
    if(err) throw err;
    users_data = results;//sql文を実行して得られた結果はresultsに入っている
  });

app.get('/', (req, res) => {//メニュー画面
  console.log(get_C + "/");//いつどのURLに飛んだのかをconsole.logで確認するもの、デバッグ用
  
  var all_data={//一番最初にメニューを読み込んだ際に表示されるデータ
    content:"",
    users:users_data,
    user:now_user
  }

  connection.query('select * from test where status != "廃棄"', (err, results, fields) =>{//登録されている資産を持ってくる
    if(err) throw err;

    all_data.content = results;//SQL文の結果を代入

    for(var i in all_data.content){//date型のままでは厄介なので文字列に変換
      var year = all_data.content[i].date.getFullYear();
      var month = all_data.content[i].date.getMonth() + 1;
      var date = all_data.content[i].date.getDate();
        
      all_data.content[i].date = year + "年" + month + "月" + date + "日";
    }

    res.render("menu.ejs", all_data);//オブジェクトでejsファイルに渡す、オブジェクト以外渡せない
  });
});

app.post("/", (req, res) => {//絞り込み、変更、申請をした場合
  console.log(pos_C + "/");

  if(req.body.mode === "narrow_mode"){//絞り込みのとき
    var narrow_data={//絞り込んだ後のデータ
      content:"",
      users:users_data,
      user:now_user
    }
  
    var user_info = req.body.narrow_user;
    var date_start = req.body.narrow_date_start;
    var date_end = req.body.narrow_date_end;
    var place = req.body.narrow_place;
    var status = req.body.narrow_status;
  
    //sql文を事前に形成し、絞り込み条件を条件分岐で追加する
    var narrow_text = "select * from test where date BETWEEN '" + date_start + "' AND '" + date_end + "' ";
    if(user_info !== "未設定"){
      narrow_text += "AND user = '"+ user_info + "' ";
    }
    if(place !== ""){
      narrow_text += "AND place LIKE '%" + place + "%' ";
    }
    if(status !== "未設定"){
      narrow_text += "AND status = '" + status + "'";
    }else{
      narrow_text += "AND status != '廃棄'";
    }
    connection.query(narrow_text, function(err, results, fields){//絞り込みを含んだsql文を実行
      if(err) throw err;
  
      narrow_data.content = results;
  
      for(var i in narrow_data.content){//date型のままでは厄介なので文字列に変換
        var year = narrow_data.content[i].date.getFullYear();
        var month = narrow_data.content[i].date.getMonth() + 1;
        var date = narrow_data.content[i].date.getDate();
          
        narrow_data.content[i].date = year + "年" + month + "月" + date + "日";
      }
  
      res.render("menu.ejs", narrow_data);
    });
  }

  if(req.body.mode === "change_mode"){//変更するとき
    var change_data_id = req.body.radio;//変更する資産のidを記録

    connection.query('select * from test where id = ?',change_data_id, (err, results, fields) =>{//idから変更するデータの情報のみ持ってくる
      if(err) throw err;
      
      change_data.content = results;//情報を保存してURL変更
      res.redirect("/change");
     });
  }

  if(req.body.mode === "request_mode"){//申請するとき
    request_id = req.body.radio;//申請する資産のidだけ保存、SQL文は先で実行する
    res.redirect("/request");
  }
});

app.get('/insert', (req, res) => {//新規作成
  console.log(get_C + "/insert");
  res.render('insert.ejs');
});

app.post('/insert', (req, res) =>{//新規作成から送られてきた情報をspl文で追加
  console.log(pos_C + "/insert");
    var asset_data={
        "code":req.body.code,
        "name":req.body.name,
        "date":req.body.date,
        "model":req.body.model,
        "quantity":req.body.quantity,
        "price":req.body.price,
        "place":req.body.place,
        "status":req.body.status,
        "picture":req.body.picture,
        "user":"user1"
    };
    
    connection.query("insert into test set ?", asset_data, function (error, results, fields) {//追加する
    });
    res.redirect('/');
});

app.get("/change", (req,res)=>{//変更画面へ推移
  console.log(get_C + "/change");

  for(var i in change_data.content){//date型のままでは厄介なので文字列に変換
    var year = change_data.content[i].date.getFullYear();
    var month = change_data.content[i].date.getMonth() + 1;
    var date = change_data.content[i].date.getDate();
      
    change_data.content[i].date = year + "年" + month + "月" + date + "日";
  }

  res.render("change.ejs" , change_data);
});

app.post("/change", (req, res)=>{
  console.log(pos_C + "/change");

  var change_place = req.body.place;//変更するデータ
  var change_status = req.body.status;
  connection.query("update test set place = ?, status = ? where id = ?", [change_place, change_status, change_data.content[0].id], function (err, results, fields){
  })

  res.redirect("/");
});

app.get('/request', (req, res) =>{
  console.log(get_C + "/request");
  
  request_data={//申請するデータ
    id:request_id
  };
  res.render("request.ejs", request_data);
});

app.post("/request", (req, res) =>{
  console.log(pos_C + "/request");

  var temp_data = {};//テンプ用オブジェクト
  //申請する資産の情報を別のデータベースに保存
  connection.query("select * from test where id = ?", request_id, function(err, results, fields){
    temp_data.code = results[0].code;
    temp_data.model = results[0].model;
    temp_data.price = results[0].price;
    temp_data.user = results[0].user;
    temp_data.type = req.body.request_type;
    temp_data.reason = req.body.request_reason;
    temp_data.processed = 1;

    connection.query("insert into requests set ?" ,temp_data, function(err, results, fields){
    });
  });
  
  res.redirect("/");
});

app.get("/notice", (req, res) =>{
  console.log(get_C + "/notice");

  notice_data={
    content:""
  };
  //通知の画面ではデータベースから情報を持ってきて、何の申請が来ているのか確認できる
  //申請が処理されたかを判断するため、processedという0-処理済み,1-未処理のカラムを使っている
  connection.query("select * from requests where processed = 1", (err, results, firlds) =>{
    notice_data.content = results;

    res.render("notice.ejs", notice_data);
  });
});

app.post("/notice", (req, res) =>{
  console.log(pos_C + "/notice");

  if(req.body.mode === "print_mode"){
    print_id = req.body.radio;//書類作成をする資産のid

    res.redirect("/print");
  }
  
  if(req.body.mode === "narrow_mode"){

    if(req.body.narrow_status === "未設定" && req.body.processed !== "on"){//ゴリ押し
      res.redirect("/notice");
    }else{
      narrow_text = "select * from requests where "
      if(req.body.narrow_status !== "未設定" && req.body.processed === "on"){
        narrow_text += "type = '"+ req.body.narrow_status + "' ";
      }
      if(req.body.narrow_status !== "未設定" && req.body.processed !== "on"){
        narrow_text += "type = '"+ req.body.narrow_status + "' AND processed = 1";
      }
      if(req.body.narrow_status === "未設定" && req.body.processed === "on"){
        narrow_text += "1"
      }
      
      var narrow_data={
        content:""
      };

      connection.query(narrow_text, function(err, results, fields){//絞り込みを含んだsql文を実行
        if(err) throw err;
  
        narrow_data.content = results;

        res.render("notice.ejs", narrow_data);
      })    
    } 
  }
});

app.get("/print", (req,res) =>{
  console.log(get_C + "/print");

  var print_data={
    content:""
  };
  //書類作成するデータのidで検索してデータベースから情報を持ってくる
  connection.query("select * from requests where id = ?", print_id, function(err, results, fields){
    print_data.content = results;

    switch(print_data.content[0].type){
      case "廃棄申請":print_data.content[0].type = "稟議書"
      break;

      case "修理申請":print_data.content[0].type = "修理依頼書"
      break;

      case "シール再発行申請":print_data.content[0].type = "シール再発行依頼書"
      break;
    }

    res.render("print.ejs", print_data);
  }); 
});

app.post("/print", (req, res)=>{//書類作成して通知として要らなくなったら、表示しないように　
  console.log(pos_C + "/print");
  //消すのではなく、特定のカラムを0にして絞り込みで弾く
  connection.query("update requests set processed = 0 where id = ?", print_id, function (err, results, fields){

  })
  res.redirect("/notice");
});

app.get("/inventory_output", (req, res)=>{
  console.log(get_C + "/inventory_output");
  var inventory_data={
    content:""
  }

  connection.query("select * from test", (err, results, fields)=>{
    inventory_data.content = results;

    for(var i in inventory_data.content){//date型のままでは厄介なので文字列に変換
      var year = inventory_data.content[i].date.getFullYear();
      var month = inventory_data.content[i].date.getMonth() + 1;
      var date = inventory_data.content[i].date.getDate();
        
      inventory_data.content[i].date = year + "年" + month + "月" + date + "日";
    }

    res.render("inventory_output.ejs", inventory_data);
  });
});

app.get("/inventory_input", (req, res)=>{
  console.log(get_C + "inventory_input");

  res.render("inventory_input.ejs");
});
//inbentory_inputからのpostはない
app.post("/inventory_input", (req, res)=>{
  console.log(pos_C + "inventory_input");
  
  for(var i = 0; i < req.body.id.length; i++){//棚卸しの列分forを回す
    var id = req.body.id[i];
    var place = req.body.place[i];
    var status = req.body.status[i];

    connection.query("update test set place = ?, status = ? where id = ?", [place, status, id], function(err, results, fields){
    });
  }
  res.redirect("/");
});


app.get("/login", (req, res)=>{//ログイン画面
  console.log(get_C + "/login");

  connection.query("select * from users", function(err, results, fields){

    var users_data={
      user:results
    };

    res.render("login.ejs", users_data);
  });
});

app.post("/login", (req,res)=>{
  console.log(pos_C + "/login");

  now_user = req.body.login_name;

  res.redirect("/");
});

app.listen(3000);