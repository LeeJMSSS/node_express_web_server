var express = require('express')
,http  =require('http'),
    path =require('path');
var bodyParser = require('body-parser'),
    cookieParser =require('cookie-parser'),
    static  =  require('serve-static'),
    errorHandler =  require('errorhandler'),
    fs = require('fs');

var board = require('./board');
var mysql =  require('mysql');



var expressErrorHandler =  require('express-error-handler');

var expressSession = require('express-session');

var app = express();

var pool = mysql.createPool({
    coonectionLimit :10,
    host:'localhost',
    user : 'root',
    password: 'wjswocjf20',
    database:'splug',
    debug :false
});

var webpush = require('web-push');
 
// VAPID keys should only be generated only once.
var vapidKeys = webpush.generateVAPIDKeys();
 
webpush.setGCMAPIKey('AIzaSyAo5_T1k9dCUGYqZdzCLFhbq1xXK4ZG-m8');
webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);
 
var pushSubscription = {
  endpoint: '.....',
  keys: {
    auth: '.....',
    p256dh: '.....'
  }
};
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));

app.set('port',process.env.PORT||9000);
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());


app.use('/public',static(path.join(__dirname,'public')));
app.use(cookieParser());

app.use(expressSession({
    key: 'jeon_id',
    secret:'ambc@!vsmkv#!&*!#EDNAnsv#!$()_*#@',
    resave:false,
    saveUninitialized:true
}));


var authUser =  function(id,password,callback){
    console.log('auth User');
    pool.getConnection(function(err,conn){
       if(err){
           if(conn){
               conn.release();
           }
           callback(err,null);
           return;
       } 
    
    console.log('데이터 베이스 Thread id '+conn.threadId);
    var columns  = ['member_id','member_name'];
    var tablename =  'member';
    var exec = conn.query("select ?? from member where member_id = ? and member_pwd =?",
                          [columns,id,password],function(err,rows){
        conn.release();
        console.log('실행 대상 ' + exec.sql);
        
        console.dir(rows);
        if(rows.length>0){
        callback(null,rows);    
        }
        else{
            callback(null,null);
        
        }
    
    });
    });
}
                       
var adduser = function(id,password,name,callback){
    console.log('add user');        
    pool.getConnection(function(err,conn){
        if(err){
            if(conn){
                conn.release();
            }
            callback(err,null);
            return;
        }
        console.log('데이터 베이스 연결 스레드 id' + conn.threadId);
        var data =  {member_id:id,member_name:name,member_pwd:password,member_phone:'010',member_student_id:'22'};
        var exec = conn.query('insert into member set ?; ',data,function(err,result){
            conn.release();
            console.log('실행 대상 ' + exec.sql);
            if(err){
                console.log('err');
                callback(err,all);
            }
            
            callback(null,result);
            
            
        });
    });
}

app.post('/process/login',function(req,res){
   var paramId = req.param('id');
   var password = req.param('password');
    console.log(paramId);
    if(pool){
        authUser(paramId,password,function(err,rows){
            if(err){
                res.writeHead('200',{'content-type':'text/html;charset = utf-8'});
                res.write("<h1>error</h1>");
                res.end();
                return;
            }
            
            if(rows){
                   req.session.user={
                       
                id:paramId,
                password:password,
                name : rows.name,
                authorized:true
            };

            
                res.redirect('/board');
                
            }
            else{
res.writeHead('200',{'content-type':'text/html;charset = utf-8'});
                res.write("<h1>사용자 없음</h1>");
                res.end();
                
            }
        })
    }
    
});

app.get('/process/logout',function(req,res){
   req.session.destroy();
    res.clearCookie('jeon_id');
    res.redirect('/index');
});


var router = express.Router();

router.route('/index').all(function (req,res){
    webpush.sendNotification(pushSubscription, 'ddd');
    if(req.session.user){
        res.redirect('/board');
        return;
    }
    var pathname  = '/log_in.html';
    var extension = path.extname(pathname); // 확장자를 구하는 메서드
    var staticMap = {
        '.ico': 'image/x-icon',
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.mp3': 'audio/mpeg',
    }
    var staticPath = __dirname + '/public';
　console.log(staticPath);
        if( staticMap[extension] ) {
            //static file
            fs.readFile( staticPath + pathname, (err, data) => {
                res.writeHead(200, {'Content-Type': staticMap[extension]+';charset=utf-8'});
                res.end(data);
            });
        } else {
            fs.readFile('./public/404.html', (err, data) => {
                res.writeHead(404, {'Content-Type': 'text/html'+';charset=utf-8'});
                res.end(data);
            });
        }
});
var get_static_map = function(pathname){
    var extension = path.extname(pathname); // 확장자를 구하는 메서드
    var staticMap = {
        '.ico': 'image/x-icon',
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.mp3': 'audio/mpeg',
    }
    return staticMap[extension];
    
}
router.route('/notice').all(function (req,res){
   
    var pathname =  '/notice.html';
    var type =  get_static_map(pathname);
    console.log(type);
    res.end();
    
});



router.route('/process/adduser').post(function(req,res){
   
    var paramId =  req.body.id||req.query.id;
    var parampassword =  req.body.password||req.query.password;
    var paramname  = req.body.name || req.query.name;
    
    if(pool){
        adduser(paramId,parampassword,paramname,function(err,adduser){
            if(err){
                res.writeHead('200',{'content-type':'text/html;charset = utf-8'});
                res.write("<h1>오류발생</h1>");
                res.end();
                return;
            }
            if(adduser){
                res.writeHead('200',{'content-type':'text/html;charset = utf-8'});
                res.write("<h1>사용자 추가완료</h1>");
                res.end();
            
            }
            else{
                res.writeHead('200',{'content-type':'text/html;charset = utf-8'});
                res.write("<h1>사용자 추가실패</h1>");
                res.end();
            }
        }
                );
                    }
        else{
                res.writeHead('200',{'content-type':'text/html;charset = utf-8'});
                res.write("<h1>데이터베이스 연결실패</h1>");
                res.end();
            
        }
                });
router.route('/process/adduserpage').get(function(req,res){
    console.log('adduserpage');
    var staticPath = __dirname + '/public';
      fs.readFile( staticPath+'/adduser.html', (err, data) => {
                res.writeHead(200, {'Content-Type': 'text/html'+';charset=utf-8'});
                res.end(data);
            });
});


app.all('/',function(req,res){
   res.render('cover', {
        
        
    });

    //res.redirect('/index') ;
});

app.use('/board',board);
app.use('/',router);
app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

http.createServer(app).listen(app.get('port'),function(){
   
   
});