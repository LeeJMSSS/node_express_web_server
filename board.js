var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var expressSession = require('express-session');

var pool = mysql.createPool({
    connectionLimit: 3,
    host: 'localhost',
    user: 'root',
    database: 'splug',
    password: 'wjswocjf20'
});

var multer = require('multer');
var upload = multer({
    dest: 'uploads'
});
var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'uploads/')
    },
    filename: function (req, file, callback) {
        callback(null, req.session.user.id + '__' + Date.now()+'__filename__'+file.originalname)
    }
});
var upload = multer({
    storage: storage
});

var rename_upload_file = function () {

};
router.get('/', function (req, res) {
    res.redirect('/board/list/1');
})
router.get('/write', function (req, res, next) {
    console.dir(req.session.user);
    res.render('write', {
        title: "게시판 글 쓰기",
        id: req.session.user.id
    });
});

router.post('/write', upload.array('file'), function (req, res) {
    var creator_id = req.session.user.id;
    var title = req.body.title;
    var content = req.body.contents;
    var passwd = req.body.passwd;

    var files = req.files;
    var upload_file_path = '';
    
    if (files.length>0) {
        
        upload_file_path = files[0].filename;
        console.log(upload_file_path);
    }
    var datas = [creator_id, title, content, passwd,upload_file_path];
    pool.getConnection(function (err, connection) {
        // Use the connection
        var sqlForInsertBoard = "insert into board(creator_id, title, contents,creator_pwd,upload_file_path) values(?,?,?,?,?);";

        connection.query(sqlForInsertBoard, datas, function (err, rows) {
            if (err) console.error("err : " + err);
            res.redirect('/board');
            connection.release();
            // Don't use the connection here, it has been returned to the pool.
        });
    });
    upload.single(files);
});
router.get('/list/:page', function (req, res, next) {

    if (!req.session.user) {
        res.redirect('/index');
        res.end();
        return;
    }
    pool.getConnection(function (err, connection) {
        var query = "SELECT idx, creator_id , title FROM board"
        connection.query(query, function (err, rows) {
            if (err) console.error(err);

            res.render('list', {
                title: '게시판 전체 글 조회',
                rows: rows
            });
            connection.release();
        });
    });
});

router.get('/read/:idx', function (req, res) {
    if (!req.session.user) {
        res.redirect('/index');
        res.end();
        return;
    }

    pool.getConnection(function (err, connection) {
        var query = "SELECT creator_id,title,contents FROM board where idx=" + req.params.idx;
        connection.query(query, function (err, rows) {
            if (err) console.error(err);
            res.render('read', {
                row: rows
            });
            connection.release();
        });
    });
});

module.exports = router;