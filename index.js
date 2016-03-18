'use strict';

var fs = require('fs');
var url = require('url');
var http = require('http');
var htmlparser = require("htmlparser2");
var express = require('express');

//============================================================

var stopList = require('./stoplist.js');
for (let i = 0; i < stopList.length; i++) {
    stopList[i] = toLowerCase(stopList[i]);
}

var regToken = new RegExp("([\u0410-\u044f\u0401\u0451]+)|([a-zA-Z]+)|([0-9]+)", "g");

function isStopList(lexeme)
{
    function cmp(element, index, array)
    {
        if (element === lexeme) {
            return true;
        }
        return false;
    }

    let a = stopList.find(cmp);
    if (a !== undefined) {
        return true;
    }
    return false;
}

function tokenize(text)
{
    let lexemes = text.match(regToken);
    if (!lexemes) {
        lexemes = [];
    }
    return lexemes;
}

function toLowerCase(lexeme)
{
    let str = '';
    for (let i = 0; i < lexeme.length; ++i) {
        if (lexeme[i] >= '\u0410' && lexeme[i] <= '\u042f') {
            let code = lexeme.charCodeAt(i) + 32;
            str += String.fromCharCode(code);
        } else if (lexeme[i] === '\u0401' || lexeme[i] === '\u0451') {
            str += '\u0435';
        } else {
            str += lexeme[i];
        }
    }
    return str;
}

function deleteDefis(lexeme)
{
    let string = lexeme;

    while (string.indexOf('-', 0) == 0) {
        string = string.substring(1);
    }

    let n = string.length - 1;
    if (n > 0) {
        while (string.indexOf('-', n) == n) {
            string = string.substring(0, n - 1);
            n = string.length - 1;
            if (n < 1) {
                break;
            }
        }
    }

    return string;
}

var Stemmer = require('./stemmer').Stemmer;
var stemmer = new Stemmer();

function tokenizeAndStem(text)
{
    let outLexemes = [];
    let lexemes = tokenize(text);
    for (let i = 0; i < lexemes.length; ++i) {
        let lexeme = deleteDefis(lexemes[i]);
        lexeme = toLowerCase(lexeme);
        if (isStopList(lexeme) === false) {
            lexeme = stemmer.stem(lexeme);
            if (lexeme !== '') {
                outLexemes.push(lexeme);
            }
        }
    }
    return outLexemes;
};

var categories = require('./categories.js');
let arrСategories = [];
for (let key in categories) {
    if (key !== 'Other' && key !== 'other') {
        arrСategories.push({
            name: key,
            total: categories[key]
        });
    }
}
arrСategories.sort(function(a, b) {
    if (a.total > b.total) return -1;
    if (a.total < b.total) return 1;
    return 0;
});

var categoriesSports = require('./categoriesSports.js');
let arrСategoriesSports = [];
for (let key in categories) {
    if (key !== 'Other' && key !== 'other') {
        arrСategoriesSports.push({
            name: key,
            total: categories[key]
        });
    }
}
arrСategoriesSports.sort(function(a, b) {
    if (a.total > b.total) return -1;
    if (a.total < b.total) return 1;
    return 0;
});

var bayes = require('./naivebayes');
var classifier = new bayes(tokenizeAndStem);
var classifierSports = new bayes(tokenizeAndStem);

var db = require('./db/db.js');
for (let i = 0; i < db.length; ++i) {
    classifier.train(db[i].text, db[i].category);
}

var dbSports = require('./db/sports.js');
for (let i = 0; i < dbSports.length; ++i) {
    classifierSports.train(dbSports[i].text, dbSports[i].category);
}

//============================================================

/**
 * paths : array of string
 */
function Spider(paths)
{
    this.paths = paths;
    this.index = 0;
    this.max = 8000;
    this.map = {};
}

/**
 * cb : function(err: object, buffer: Buffer)
 */
Spider.prototype.get = function(path, cb) {
    let time = 1 * 60 * 1000;
    let timeout = null;

    try {
        let request = http.get(path, function(response) {
            let error = null;
            let buffer = null;

            response.on('error', function(err) {
                if (timeout) {
                    clearTimeout(timeout);
                }

                error = err;
                process.nextTick(cb, err);
            });

            response.on('data', function(data) {
                if (timeout) {
                    clearTimeout(timeout);
                }

                timeout = setTimeout(function() {
                    request.abort();
                }, time);

                if (data) {
                    if (buffer) {
                        buffer = Buffer.concat([buffer, data]);
                    } else {
                        buffer = data;
                    }
                }
            });

            response.on('end', function() {
                if (timeout) {
                    clearTimeout(timeout);
                }

                if (!error) {
                    process.nextTick(cb, null, buffer);
                }
            });
        });

        request.on('error', function(err) {
            if (timeout) {
                clearTimeout(timeout);
            }

            process.nextTick(cb, err);
        });

        timeout = setTimeout(function() {
            request.abort();
        }, time);
    } catch (err) {
        if (timeout) {
            clearTimeout(timeout);
        }
        process.nextTick(cb, err);
    }
};

/**
 * cb : function()
 */
Spider.prototype.frame = function(paths, index, count, handler, cb) {
    let self = this;

    // console.log(categories);

    if (index < paths.length) {
        // console.log(paths[index]);
        // console.log('count', count, self.max, 'index', index, paths.length);

        self.get(paths[index], function(err, buffer) {
            if (!err) {
                if (buffer) {
                    let flagScan = true;
                    let parser = new htmlparser.Parser({
                        onopentag: function(name, attribs) {
                            if (name === 'script' || name === 'style') {
                                flagScan = false;
                            } else if (name === 'a' && attribs.href) {
                                if (count < self.max) {
                                    if (attribs.href.indexOf('http://') === 0) {
                                        if (!(attribs.href in self.map)) {
                                            // console.log('<', attribs.href, '>');
                                            paths.push(attribs.href);
                                            self.map[attribs.href] = true;
                                            count++;

                                            if (attribs.href.indexOf('http://urfu.ru/ru/news/news/') === 0) {
                                                // console.log(attribs.href);
                                            }
                                        }
                                    } else {
                                        let obj = url.parse(paths[index]);
                                        let from = obj.href.substring(0, obj.href.indexOf(obj.path));
                                        let path = url.resolve(from, attribs.href);
                                        if (!(path in self.map)) {
                                            // console.log('<', path, '>');
                                            paths.push(path);
                                            self.map[path] = true;
                                            count++;

                                            if (path.indexOf('http://urfu.ru/ru/news/news/') === 0) {
                                                // console.log(path);
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        ontext: function(text) {
                            if (text !== '' && flagScan === true) {
                                let lexemes = tokenize(text);
                                if (lexemes.length > 0) {
                                    // console.log(text);
                                    let category = classifier.classify(text);
                                    if (category !== null) {
                                        categories[category]++;
                                        // /*if (category === 'Институт физической культуры, спорта и молодежной политики') */{
                                            // console.log('/**=============');
                                            // console.log(category);
                                            // console.log(text);
                                            // console.log('=============*/\n');
                                        // }
                                    }

                                    category = classifierSports.classify(text);
                                    if (category !== null) {
                                        categoriesSports[category]++;
                                    }
                                }
                            }
                        },

                        onclosetag: function(tagname) {
                            if (tagname === 'script' || tagname === 'style') {
                                flagScan = true;
                            }
                        }
                    }, { decodeEntities: true });

                    parser.write(buffer.toString());
                    parser.end();
                }
            }

            process.nextTick(function() {
                self.frame(paths, index + 1, count, handler, cb);
            });
        });
    } else {
        process.nextTick(cb);
    }
};

/**
 * handler : function(buffer)
 */
Spider.prototype.scan = function(handler) {
    let self = this;

    if (self.index < self.paths.length) {
        self.frame([self.paths[self.index]], 0, 0, handler, function() {
            console.log('frame.end');
            self.index++;
            process.nextTick(function() {
                self.scan(handler);
            });
        });
    } else {
        console.log('scan.end');
        self.index = 0;
        self.map = {};
        console.log(categories);
        process.nextTick(function() {
            self.scan(handler);
        });
    }
};

// module.exports = Spider;

var paths = [
    'http://urfu.ru/ru/news/',
    'http://media.ls.urfu.ru/369',
    'http://hse.edu.urfu.ru/ingener2/',
    'http://info.urfu.ru/',
    'http://mmi.urfu.ru/',
    'http://lyceum.urfu.ru/main/',
    'http://sti.urfu.ru/home/',
    'http://enin.urfu.ru/',
    'http://urfu.ru/ru/about/units/ppur/fakultet-povyshenija-kvalifikacii-prepodavatelei-i-professionalnoi-perepodgotovki/',
    'http://fizteh.urfu.ru/',
    'http://uvc.urfu.ru/',
    'http://ruzha64.wix.com/uvc-fvo-ustu',
    'http://urfu.ru/ru/'
];
var spider = new Spider(paths);
spider.scan();

setInterval(function(params) {
    arrСategories = [];
    for (let key in categories) {
        if (key !== 'Other' && key !== 'other') {
            arrСategories.push({
                name: key,
                total: categories[key]
            });
        }
    }
    arrСategories.sort(function(a, b) {
        if (a.total > b.total) return -1;
        if (a.total < b.total) return 1;
        return 0;
    });

    arrСategoriesSports = [];
    for (let key in categoriesSports) {
        if (key !== 'Other' && key !== 'other') {
            arrСategoriesSports.push({
                name: key,
                total: categoriesSports[key]
            });
        }
    }
    arrСategoriesSports.sort(function(a, b) {
        if (a.total > b.total) return -1;
        if (a.total < b.total) return 1;
        return 0;
    });


    // let lines = process.stdout.getWindowSize()[1];
    // for(var i = 0; i < lines; i++) {
    //     console.log('\r\n');
    // }
    // console.log(arrСategories);

    let data = 'module.exports = ' + JSON.stringify(categories, '', 4) + ';';
    fs.writeFileSync(__dirname + '/categories.js', data);

    data = 'module.exports = ' + JSON.stringify(categoriesSports, '', 4) + ';';
    fs.writeFileSync(__dirname + '/categoriesSports.js', data);
}, 5000);

function getPage()
{
    let table = '';
    for (let i = 0; i < arrСategories.length; i++) {
        table += `
        <tr>
            <td>${arrСategories[i].name}</td>
            <td>${arrСategories[i].total}</td>
        </tr>
        `;
    }

    let page = `
    <!DOCTYPE HTML>
    <html>
        <head>
            <meta charset="utf-8">
            <title>Рейтинг</title>
        </head>
        <body>
            <table border="1">
                <caption>Рейтинг институтов УрФУ</caption>

                <tr>
                    <th>Институт</th>
                    <th>Количество ссылок</th>
                </tr>

                ${table}
            </table>
        </body>
    </html>
    `;

    return page;
}

var app = express();

app.get('/', function (req, res) {
    let page = getPage();
    res.send(page);
});

app.listen(80, function () {
    console.log('Example app listening on port 80!');
});
