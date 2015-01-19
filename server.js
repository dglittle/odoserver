
var _ = require('gl519')
try { require('./_config.js') } catch (e) {}

process.on('uncaughtException', function (err) {
    try {
        console.log(err)
        console.log(err.stack)
    } catch (e) {}
})

corsSend = function (req, res, body, mime) {
    if (!mime) mime = 'text/plain'
    if (typeof body != 'string') {
        body = _.json(body)
        if (!body) body = 'null'
        mime = 'application/json'
    }
    var headers = {
        'Content-Type': mime + '; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
    }
    if (req.headers.origin) {
        headers['Access-Control-Allow-Origin'] = req.headers.origin
        headers['Access-Control-Allow-Credentials'] = 'true'
    }
    res.writeHead(200, headers)
    res.end(body)
}

_.run(function () {

    if (!process.env.PORT) process.env.PORT = 5000
    if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production'
    if (!process.env.MONGOHQ_URL) process.env.MONGOHQ_URL = 'mongodb://localhost:27017/test'
    if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = 'super_secret'

    var db = require('mongojs')(process.env.MONGOHQ_URL)
    var express = require('express')
    var app = express()

    app.use(require('cookie-parser')())
    app.use(function (req, res, next) {
        _.run(function () {
            req.body = _.consume(req)
            next()
        })
    })

    var MongoStore = require('connect-mongo')(require('express-session'))
    app.use(require('express-session')({
        secret : process.env.SESSION_SECRET,
        cookie : { maxAge : 10 * 365 * 24 * 60 * 60 * 1000 },

        store : new MongoStore({ db : _.p(db.open(_.p())) }),
        resave : true,
        saveUninitialized : true

    }))

    app.use(function (req, res, next) {
        if (!req.session.user)
            req.session.user = 'anonymous:' + _.randomString(10, /[a-z]/)
        req.user = req.session.user
        next()
    })

    app.use('/static', express.static('./static'))
    app.get('/', function (req, res) {
        res.sendFile('index.html', { root : '.' })
    })
    app.get('/utils.js', function (req, res) {
        res.sendFile('utils.js', { root : '.' })
    })

    function endPoint(path, func) {
        app.all(path, function (req, res, next) {
            _.run(function () {
                try {
                    var x = null
                    if (req.method.match(/post/i))
                        x = req.body
                    else if (req.url.indexOf('?') >= 0)
                        x = _.unescapeUrl(req.url.slice(req.url.indexOf('?') + 1))
                    var y = _.json(func(_.unJson(x)))
                    corsSend(req, res, y, 'application/json')
                } catch (e) {
                    next(e)
                }
            })
        })
    }

    _.p(db.collection('odoserver').findAndModify({
        query : { _id : 'settings' },
        update : { $setOnInsert : { pass : '' } },
        new : true,
        upsert : true
    }, _.p()))

    var trustedFuncs = {}
    function updateTrustedFuncs() {
        trustedFuncs = {}
        var url = _.p(db.collection('odoserver').findOne({ _id : 'settings' }, _.p())).url
        if (!url) return
        _.wget(url).replace(/\/\* server begin \*\/([\s\S]*?)\/\* server end \*\//g, function (_0, _1) {
            trustedFuncs[_.trim(_1)] = true
        })
    }

    endPoint('/rpc', function (x) {
        if ('pass' in x) {


        db.collection('odoserver').findOne({ _id : 'settings' }, _.p())

        var y = _.p()
        y.pass




            if (x.pass != _.p(db.collection('odoserver').findOne({ _id : 'settings' }, _.p())).pass) throw 'bad password'
        } else {
            if (!trustedFuncs[x.func]) {
                updateTrustedFuncs()
                if (!trustedFuncs[x.func]) {
                    throw "we don't trust this code"
                }
            }
        }
        return eval('(' + x.func + ')').apply(null, x.args)
    })

    endPoint('/test', function (x) {
        var y = _.wget('http://localhost:5000/')
        console.log('y', y)
        return y
    })

    app.use(require('errorhandler')({
        dumpExceptions: true,
        showStack: true
    }))

    app.listen(process.env.PORT, function() {
        console.log("go to http://localhost:" + process.env.PORT)
    })

})
