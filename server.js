
var _ = require('gl519')
try { require('./_config.js') } catch (e) {}

process.on('uncaughtException', function (err) {
    try {
        console.log(err)
        console.log(err.stack)
    } catch (e) {}
})

corsSend = function (req, res, body, mime) {
    if (!mime) mime = 'text/html'
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

    var express = require('express')
    var app = express()

    app.use(require('multer')({
        inMemory : true,
        onParseEnd : function (req, next) {
            req.multed = true
            next()
        }
    }))
    app.use(function (req, res, next) {
        _.run(function () {
            if (!req.multed) {
                req.body = _.consume(req)
                if (req.body)
                    req.body = _.unJson(req.body)
            }
            next()
        })
    })

    app.get('/', function (req, res) {
        res.sendFile('index.html', { root : '.' })
    })

    function endPoint(path, func) {
        app.all(path, function (req, res, next) {
            _.run(function () {
                try {
                    var x = null
                    if (req.method.match(/post/i))
                        x = req.body
                    else if (req.url.indexOf('?') >= 0)
                        x = _.unJson(_.unescapeUrl(req.url.slice(req.url.indexOf('?') + 1)))
                    var y = func(x, req)
                    corsSend(req, res, y)
                } catch (e) {
                    next(e)
                }
            })
        })
    }

    var trustedFuncs = {}
    _.each(process.env.SITES.split(/;/), function (site) {
        trustedFuncs[site] = {}
    })
    function updateTrustedFuncs(site) {
        trustedFuncs[site] = {}
        _.wget(site).replace(/\/\* server begin \*\/([\s\S]*?)\/\* server end \*\//g, function (_0, _1) {
            trustedFuncs[site][_.trim(_1.replace(/\s+/g, ' '))] = true
        })
    }

    endPoint('/rpc', function (x, req) {
        if ('pass' in x) {
            if (x.pass != process.env.PASSWORD) throw 'bad password'
            return eval('{' + x.code + '}')
        } else {
            var funcString = x.func.replace(/\s+/g, ' ')
            if (!trustedFuncs[x.site][funcString]) {
                updateTrustedFuncs(x.site)
                if (!trustedFuncs[x.site][funcString]) {
                    throw "we don't trust this code"
                }
            }
        }
        if (typeof(x.args) == 'string') x.args = _.unJson(x.args)
        if (!(x.args instanceof Array)) x.args = []
        return eval('(' + x.func + ')').apply(null, x.args.concat([req]))
    })

    app.use(require('errorhandler')({
        dumpExceptions: true,
        showStack: true
    }))

    app.listen(process.env.PORT, function() {
        console.log("go to http://localhost:" + process.env.PORT)
    })

})
