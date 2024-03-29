/*
メモ
・res.renderの第２引数はオブジェクトでなければいけない
・Node.jsでcssのような静的ファイルを利用するには、express.staticが必要
*/
function String_Cut_20(str){//文字をカットする関数
  str = str.toString();
  if(str.length > 20){//文字数が20以上ならカット
    str = str.slice(0, 20);
    str += "...";
  }
  return str;
}
function String_Cut_40(str){//文字をカットする関数
  str = str.toString();
  if(str.length > 40){//文字数が40以上ならカット
    str = str.slice(0, 40);
    str += "...";
  }
  return str;
}

function date_to_string(date){//dateをstringに変換する関数
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var date = date.getDate();
        
  date = year + "年" + month + "月" + date + "日";
  return date;
}

function sql_injection_steps(str){
  str = str.replace(/;/g, "").replace(/,/g, "").replace(/'/g, "").replace(/`/g, "");
  return str;
}

const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();

const get_C = '\u001b[31m' + "get " + '\u001b[0m';//どのURLに飛んだのかをconsole.logでわかりやすく確認するためのもの、文字に色を加えてくれる
const pos_C = '\u001b[34m' + "pos " + '\u001b[0m';

app.use(bodyParser.urlencoded({ extended: true ,limit:'10mb'}));
app.use(express.static("/Applications/MAMP/htdocs"));//Node.jsだとこれを書かないとcssが使えない

const connection = mysql.createConnection({//mysqlに接続するために使うオブジェクト
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'main'
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

  var request_code;//申請される備品のcode  / → /request

  var print_id;//書類作成する備品のid idでないと申請がかぶるため /notice → /print

  connection.query('select * from users', (err, results, fields) =>{//登録されているユーザーを持ってくる
    if(err) throw err;
    users_data = results;//sql文を実行して得られた結果はresultsに入っている
  });

app.get('/', (req, res) => {//メニュー画面
  console.log(get_C + "/");//いつどのURLに飛んだのかをconsole.logで確認するもの、デバッグ用

  if(now_user === "ログインなし"){

    res.redirect("/login");

  }else{

    var all_data={//一番最初にメニューを読み込んだ際に表示されるデータ
      content:"",
      users:users_data,
      user:now_user
    }
    var all_data_sql = 'select * from assets where status != "廃棄"'
  
    if(now_user !== "admin"){
      all_data_sql += " AND user = '" + now_user + "'"
    }
  
    connection.query(all_data_sql , (err, results, fields) =>{//登録されている資産を持ってくる
      if(err) throw err;
  
      all_data.content = results;//SQL文の結果を代入
  
      for(var i in all_data.content){
        all_data.content[i].name = String_Cut_20(all_data.content[i].name);//文字がながければカット
        all_data.content[i].model = String_Cut_20(all_data.content[i].model);
        all_data.content[i].place = String_Cut_20(all_data.content[i].place);
  
        all_data.content[i].date = date_to_string(all_data.content[i].date);//date型のままでは厄介なので文字列に変換
      }
  
      res.render("menu.ejs", all_data);//オブジェクトでejsファイルに渡す、オブジェクト以外渡せない
    });
  }
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
    var narrow_text = "select * from assets"
    var narrow_array = [];

    if(date_start !== "" && date_end !== ""){
      narrow_array[narrow_array.length] = " date BETWEEN '" + date_start + "' AND '" + date_end + "' "
    }else if(date_start !== ""){
      narrow_array[narrow_array.length] = " date > '" + date_start + "' ";
    }else if(date_end !== ""){
      narrow_array[narrow_array.length] = " date < '" + date_end + "' ";
    }
    if(now_user !== "admin"){
      user_info = now_user;
    }
    if(user_info !== "未設定"){
      narrow_array[narrow_array.length] = " user = '" + user_info + "' ";
    }
    if(place !== ""){
      narrow_array[narrow_array.length] = " place LIKE '%" + place + "%' ";
    }
    if(status !== "未設定"){
      narrow_array[narrow_array.length] = " status = '" + status + "'";
    }else{
      narrow_array[narrow_array.length] = " status != '廃棄'";
    }
    narrow_array = narrow_array.join("AND");

    if(narrow_array.length >= 1){
      narrow_text += " where" + narrow_array;
    }

    connection.query(narrow_text, function(err, results, fields){//絞り込みを含んだsql文を実行
      if(err) throw err;
  
      narrow_data.content = results;
  
      for(var i in narrow_data.content){
        narrow_data.content[i].name = String_Cut_20(narrow_data.content[i].name);//文字がながければカット
        narrow_data.content[i].model = String_Cut_20(narrow_data.content[i].model);
        narrow_data.content[i].place = String_Cut_20(narrow_data.content[i].place);
  
        narrow_data.content[i].date = date_to_string(narrow_data.content[i].date);//date型のままでは厄介なので文字列に変換
      }
  
      res.render("menu.ejs", narrow_data);
    });
  }

  if(req.body.mode === "change_mode"){//変更するとき
    var change_data_code = req.body.radio;//変更する資産のcodeを記録

    connection.query('select * from assets where code = ?',change_data_code, (err, results, fields) =>{//codeから変更するデータの情報のみ持ってくる
      if(err) throw err;
      
      change_data.content = results;//情報を保存してURL変更
      res.redirect("/change");
     });
  }

  if(req.body.mode === "request_mode"){//申請するとき
    request_code = req.body.radio;//申請する資産のcodeだけ保存、SQL文は先で実行する
    res.redirect("/request");
  }
});

app.get('/insert', (req, res) => {//新規作成
  console.log(get_C + "/insert");
  if(now_user !== "admin"){

    res.redirect("/err");

  }else{

    data={
      users:users_data,
      maxid:""
    };
    connection.query("select MAX(id) from assets", (err, results, fields) =>{
      data.maxid = results[0]["MAX(id)"];//idの最大値を取得、資産コード形成に必要
      res.render('insert.ejs', data);
    })
  }
});

app.post('/insert', (req, res) =>{//新規作成から送られてきた情報をspl文で追加
  console.log(pos_C + "/insert");
  base64_pic=req.body.picture;
  const base64buf = Buffer.from(base64_pic,'base64');

    var insert_data={
        "code":req.body.code,
        "name":req.body.name,
        "date":req.body.date,
        "model":req.body.model,
        "quantity":req.body.quantity,
        "price":req.body.price,
        "place":req.body.place,
        "status":req.body.status,
        "picture":base64buf,
        "user":req.body.user
    };
    insert_data.name = sql_injection_steps(insert_data.name);
    insert_data.model = sql_injection_steps(insert_data.model);
    insert_data.place = sql_injection_steps(insert_data.place);
    
    connection.query("insert into assets set ?", insert_data, function (error, results, fields) {//追加する
    });
    res.redirect('/');
});

app.get("/change", (req,res)=>{//変更画面へ推移
  console.log(get_C + "/change");

  if(now_user ==="ログインなし"){
    res.redirect("/err");
  }else{
    for(var i in change_data.content){//date型のままでは厄介なので文字列に変換
      change_data.content[i].date = date_to_string(change_data.content[i].date);
    }
  
    res.render("change.ejs" , change_data);
  }
});

app.post("/change", (req, res)=>{
  console.log(pos_C + "/change");
  base64_pic=req.body.picture;

  var change_place = req.body.place;//変更するデータ
  var change_status = req.body.status;

  change_place = sql_injection_steps(change_place);
  change_status = sql_injection_steps(change_status);
  
  if(base64_pic === ""){//ゴリ押し
    connection.query("update assets set place = ?, status = ? where code = ?", [change_place, change_status, change_data.content[0].code], function (err, results, fields){
      if(err) throw err;
    });
  }else{
    const base64buf = Buffer.from(base64_pic,'base64');

    connection.query("update assets set place = ?, status = ?, picture = ? where code = ?", [change_place, change_status, base64buf, change_data.content[0].code], function (err, results, fields){
      if(err) throw err;
    });
  }

  res.redirect("/");
});

app.get('/request', (req, res) =>{
  console.log(get_C + "/request");

  if(now_user ==="ログインなし"){

    res.redirect("/err");

  }else{
    request_data={//申請するデータ
      code:request_code
    };
    res.render("request.ejs", request_data);
  }
});

app.post("/request", (req, res) =>{
  console.log(pos_C + "/request");

  var temp_data = {};//テンプ用オブジェクト
  //申請する資産の情報を別のデータベースに保存
  connection.query("select * from assets where code = ?", request_code, function(err, results, fields){
    temp_data.code = results[0].code;
    temp_data.model = results[0].model;
    temp_data.price = results[0].price;
    temp_data.user = results[0].user;
    temp_data.type = req.body.request_type;
    temp_data.type = sql_injection_steps(temp_data.type);
    temp_data.reason = req.body.request_reason;
    temp_data.reason = sql_injection_steps(temp_data.reason);
    temp_data.processed = 1;

    connection.query("insert into requests set ?" ,temp_data, function(err, results, fields){
    });
  });
  
  res.redirect("/");
});

app.get("/notice", (req, res) =>{
  console.log(get_C + "/notice");

  if(now_user !== "admin"){

    res.redirect("/err");

  }else{

    notice_data={
      content:""
    };
    //通知の画面ではデータベースから情報を持ってきて、何の申請が来ているのか確認できる
    //申請が処理されたかを判断するため、processedという0-処理済み,1-未処理のカラムを使っている
    connection.query("select * from requests where processed = 1", (err, results, firlds) =>{
      notice_data.content = results;
  
      for(var i in notice_data.content){
        notice_data.content[i].model = String_Cut_20(notice_data.content[i].model);
        notice_data.content[i].reason = String_Cut_40(notice_data.content[i].reason);
        
      }
  
      res.render("notice.ejs", notice_data);
    });
  }
});

app.post("/notice", (req, res) =>{
  console.log(pos_C + "/notice");

  if(req.body.mode === "print_mode"){
    print_id = req.body.radio;//書類作成をする資産のcode

    res.redirect("/print");
  }
  
  if(req.body.mode === "narrow_mode"){

    var type = req.body.narrow_status;
    var processed = req.body.processed;
    
    var narrow_text = "select * from requests";
    var narrow_array = [];
    if(type !== "未設定"){
      narrow_array[narrow_array.length] = " type = '" + type + "' ";
    }
    console.log(processed);
    if(processed !== "on"){
      narrow_array[narrow_array.length] = " processed = 1";
    }
    narrow_array = narrow_array.join("AND");
    if(narrow_array.length >= 1){
      narrow_text += " where" + narrow_array;
    }
      
    var narrow_data={
      content:""
    };

    connection.query(narrow_text, function(err, results, fields){//絞り込みを含んだsql文を実行
      if(err) throw err;
  
      narrow_data.content = results;

      for(var i in narrow_data.content){
        narrow_data.content[i].model = String_Cut_20(narrow_data.content[i].model);
        narrow_data.content[i].reason = String_Cut_40(narrow_data.content[i].reason);
          
      }
      res.render("notice.ejs", narrow_data);
    })     
  }
});

app.get("/print", (req,res) =>{
  console.log(get_C + "/print");

  if(now_user !== "admin"){

    res.redirect("/err");

  }else{

    var print_data={
      content:""
    };
    //書類作成するデータのcodeで検索してデータベースから情報を持ってくる
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
  }
});

app.post("/print", (req, res)=>{
  console.log(pos_C + "/print");
  //消すのではなく、特定のカラムを0にして絞り込みで弾く
  connection.query("update requests set processed = 0 where id = ?", print_id, function (err, results, fields){

  })
  res.redirect("/notice");
});

app.get("/inventory_output", (req, res)=>{
  console.log(get_C + "/inventory_output");

  if(now_user ==="ログインなし"){

    res.redirect("/err");

  }else{

    var inventory_data={
      content:""
    }
  
    connection.query("select * from assets", (err, results, fields)=>{
      inventory_data.content = results;
  
      for(var i in inventory_data.content){//date型のままでは厄介なので文字列に変換
        inventory_data.content[i].date = date_to_string(inventory_data.content[i].date);
      }
  
      res.render("inventory_output.ejs", inventory_data);
    });
  }
});
//inbentory_outputからのpostはない

app.get("/inventory_input", (req, res)=>{
  console.log(get_C + "inventory_input");

  if(now_user ==="ログインなし"){

    res.redirect("/err");

  }else{

    res.render("inventory_input.ejs");
  }
});

app.post("/inventory_input", (req, res)=>{
  console.log(pos_C + "inventory_input");
  
  for(var i = 0; i < req.body.code.length; i++){//棚卸しの列分forを回す
    var code = req.body.code[i];
    var place = req.body.place[i];
    var status = req.body.status[i];

    connection.query("update assets set place = ?, status = ? where code = ?", [place, status, code], function(err, results, fields){
      if(err) throw err;
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

app.get("/err", (req,res) =>{
  console.log(get_C + "/err");
  res.render("err.ejs");
});

app.listen(3000);