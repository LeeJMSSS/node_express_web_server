var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var expressSession = require('express-session');
var mkdir = require('mkdirp');
var fs = require('fs');

var pool = mysql.createPool({
    connectionLimit: 3,
    host: 'localhost',
    user: 'root',
 
});

var multer = require('multer');
var upload = multer({
    dest: 'uploads'
});
var storage = multer.diskStorage({
    date: function (req, file, callback) {
        callback(null, Date.now());
    },
    destination: function (req, file, callback) {

        callback(null, 'uploads/')
    },

    filename: function (req, file, callback) {

        callback(null, file.originalname)
    },
    originalname: function (req, file, callback) {
        callback(null, file.originalname)
    }

});
var upload = multer({
    storage: storage
});

var rename_upload_file = function () {

};



router.get('/', function (req, res) {
    res.redirect('/open_home/free/list/1');
})
router.get('/write', function (req, res, next) {
    if (!req.session.user) {
        res.redirect('/index');
        res.end();
        return;
    }
    console.dir(req.session.user);
    res.render('./open_home/board_write', {
        title: "자유 게시판 글쓰기",
        position: "free",
        id: req.session.user.id
    });
});
var upload_file_search = function (paths, err) {

    var files = fs.readdirSync(paths); // 하위 폴더 내 파일 검색
    console.dir(files)
    return files;

};
router.post('/write', upload.array('file'), function (req, res) {
    var name = req.session.user.id;
    var title = req.body.title;
    var content = req.body.contents;
    var passwd = req.body.passwd;

    var files = req.files;
    var upload_file_path = '';
    var orginal_file_name = '';
    var date = new Date();
    var cur_date = date.getTime().toString().substring(0, 10);

    if (files.length > 0) {
        var directory = './uploads/open_home/board/free/' + cur_date + "_" + req.session.user.id + "/";
        mkdir(directory);
        var rows = files.length;
        for (var i = 0; i < rows; i++) {
            fs.rename('./uploads/' + files[i].filename, directory + files[i].filename, function (err) {
                if (err) throw err;
                console.log('renamed complete');
            });
        }
    }
    var datas = [name, passwd, title, content, directory, cur_date];
    pool.getConnection(function (err, connection) {
        // Use the connection
        var sqlForInsertBoard = "insert into free(name,password,title,text,filename ,date ) values(?,?,?,?,?,?);";

        connection.query(sqlForInsertBoard, datas, function (err, rows) {
            if (err) console.error("err : " + err);
            res.redirect('/open_home/free');
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
    var page = parseInt(req.params.page);
    var TABLE_ROWS;

    pool.getConnection(function (err, connection) {
        var query = "SELECT max(no) as max_id FROM free;"
        connection.query(query, function (err, count) {
            if (err) console.error(err);
            console.dir(count[0]);
            TABLE_ROWS = parseInt(count[0].max_id);

            console.log(TABLE_ROWS);


            var start_no = TABLE_ROWS - page * 10;
            var end_no = TABLE_ROWS - (page - 1) * 10;
            query = "SELECT no,title, name ,replys,date,hit FROM free where no >" + start_no + " AND  no<=" + end_no + ";";

            connection.query(query, function (err, rows) {
                if (err) console.error(err);

                res.render('open_home/board_list', {
                    title: '자유게시판',
                    rows: rows,
                    page: page,
                    start_no: start_no,
                    end_no: end_no,
                    position: "free",
                    total_page: Math.ceil(TABLE_ROWS / 10)
                });
                connection.release();
            });
        });
    });
});

var update_hit = function (no, hit) {
    console.log('update hit ' + no + " " + hit);
    pool.getConnection(function (err, connection) {
        hit = hit + 1;
        var query = "update free " + "set hit=" + hit + " where no=" + no;
        connection.query(query, function (err, rows) {
            if (err) console.error(err);
            connection.release();
        });
    });
}

var get_upload_file_search = function (paths, err) {
    var files = fs.readdirSync(paths);
    console.dir(files)
    return files;
};


var add_reply = function (no) {




}
router.post('/add_reply', function (req, res) {



});

router.get('/read/:idx', function (req, res) {
    if (!req.session.user) {
        res.redirect('/index');
        res.end();
        return;
    }

    pool.getConnection(function (err, connection) {
        console.log(req.params.idx);
        var query = "SELECT no,name,title,text,hit,filename FROM free where no=" + req.params.idx;
        connection.query(query, function (err, rows) {
            if (err) console.error(err);
            connection.release();
            rows[0].text = rows[0].text.replace(/(?:\r\n|\r|\n)/g, "<br>");
            rows[0].text = rows[0].text.replace(/&lt;/g, "<");
            rows[0].text = rows[0].text.replace(/&gt;/g, ">");
            update_hit(req.params.idx, rows[0].hit);
            if (rows[0].filename != null)
                var files = get_upload_file_search(rows[0].filename);
            res.render('./open_home/board_read', {
                row: rows,
                parent: "free",
                file_url: "/open_home/free/download",
                files: files
            });
        });
    });
});
router.get('/download/:idx/:path', function (req, res) {

    var idx = req.params.idx;
    console.dir(req.params.idx);
    if (!req.session.user) {
        res.redirect('/index');
        res.end();
        return;
    }
    pool.getConnection(function (err, connection) {
        var query = "SELECT filename FROM free where no=" + idx;
        connection.query(query, function (err, rows) {
            if (err) console.error(err);
            connection.release();
            var paths =rows[0].filename + req.params.path;
            console.dir(paths);
            res.download(paths);
        });
    });
});

module.exports = router;
