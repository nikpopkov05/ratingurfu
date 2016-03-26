'use strict';

var fs = require('fs');
var url = require('url');
var http = require('http');
var htmlparser = require("htmlparser2");
var express = require('express');

//============================================================

var bayes = require('./naivebayes');
var Stemmer = require('./stemmer').Stemmer;
var ratingUrfu = require('./ratingurfu.js');
var ratingUrfuSports = require('./ratingurfusports.js');
var ratingUrfuPerson = require('./ratingurfuperson.js');
var stopList = require('./stoplist.js');
var dbInstitutions = require('./db/institutions.js');
var dbUrfu = require('./db/urfu.js');
var dbSports = require('./db/sports.js');
var dbPerson = require('./db/person.js');

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

function Handler()
{
    this.ratingUrfu = ratingUrfu;
    this.ratingUrfuSports = ratingUrfuSports;
    this.ratingUrfuPerson = ratingUrfuPerson;
    this.classifierInstitutions = new bayes(tokenizeAndStem);
    this.classifierUrfu = new bayes(tokenizeAndStem);
    this.classifierSports = new bayes(tokenizeAndStem);
    this.classifierPerson = new bayes(tokenizeAndStem);

    for (let i = 0; i < dbInstitutions.length; ++i) {
        this.classifierInstitutions.train(dbInstitutions[i].text, dbInstitutions[i].category);
    }

    for (let i = 0; i < dbUrfu.length; ++i) {
        this.classifierUrfu.train(dbUrfu[i].text, dbUrfu[i].category);
    }

    for (let i = 0; i < dbSports.length; ++i) {
        this.classifierSports.train(dbSports[i].text, dbSports[i].category);
    }

    for (let i = 0; i < dbPerson.length; ++i) {
        this.classifierPerson.train(dbPerson[i].text, dbPerson[i].category);
    }
}

Handler.prototype.run = function(text) {
    let lexemes = tokenize(text);
    if (lexemes.length > 0) {
        // console.log(text);

        let category = this.classifierInstitutions.classify(text, 1);
        if (category !== null) {
            // console.log(category);
            if (category === 'УрФУ') {
                category = this.classifierUrfu.classify(text, 3);
                if (category !== null) {
                    if (category in this.ratingUrfu) {
                        this.ratingUrfu[category]++;
                    } else {
                        this.ratingUrfu[category] = 1;
                    }
                    // /*if (category === 'Институт физической культуры, спорта и молодежной политики') */{
                        // console.log('/**=============');
                        // console.log(category);
                        // console.log(text);
                        // console.log('=============*/\n');
                    // }
                }

                category = this.classifierSports.classify(text, 1);
                if (category !== null) {
                    if (category in this.ratingUrfuSports) {
                        this.ratingUrfuSports[category]++;
                    } else {
                        this.ratingUrfuSports[category] = 1;
                    }
                    // console.log('/**=============');
                    // console.log(category);
                    // console.log(text);
                    // console.log('=============*/\n');
                }
            }

            category = this.classifierPerson.classify(text, 1);
            if (category !== null) {
                if (category in this.ratingUrfuPerson) {
                    this.ratingUrfuPerson[category]++;
                } else {
                    this.ratingUrfuPerson[category] = 1;
                }
                // console.log('/**=============');
                // console.log(category);
                // console.log(text);
                // console.log('=============*/\n');
            }
        }
    }
};

//============================================================

/**
 * paths : array of string
 */
function Spider(paths, handler)
{
    this.handler = handler;
    this.paths = paths;
    this.index = 0;
    this.max = 100000;
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
                                            console.log('<', attribs.href, '>');

                                            paths.push(attribs.href);
                                            self.map[attribs.href] = true;
                                            count++;

                                            if (attribs.href.indexOf('http://urfu.ru/ru/news/news/') === 0) {
                                                console.log(attribs.href);
                                            }
                                        }
                                    } else {
                                        let obj = url.parse(paths[index]);
                                        let from = obj.href.substring(0, obj.href.indexOf(obj.path));
                                        let path = url.resolve(from, attribs.href);
                                        if (!(path in self.map)) {
                                            console.log('<', path, '>');

                                            paths.push(path);
                                            self.map[path] = true;
                                            count++;

                                            if (path.indexOf('http://urfu.ru/ru/news/news/') === 0) {
                                                console.log(path);
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        ontext: function(text) {
                            if (text !== '' && flagScan === true) {
                                self.handler.run(text);
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
        // console.log(categories);
        process.nextTick(function() {
            self.scan(handler);
        });
    }
};

// module.exports = Spider;

var handler = new Handler();
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
    'http://urfu.ru/ru/',
    'http://lenta.ru/',
    'http://eburg.mk.ru/',
    'http://ria.ru/',
    'http://www.vesti.ru/'
];
var spider = new Spider(paths, handler);
spider.scan();

setInterval(function(params) {
    let data = 'module.exports = ' + JSON.stringify(handler.ratingUrfu, '', 4) + ';\n';
    fs.writeFileSync(__dirname + '/ratingurfu.js', data);

    data = 'module.exports = ' + JSON.stringify(handler.ratingUrfuSports, '', 4) + ';\n';
    fs.writeFileSync(__dirname + '/ratingurfusports.js', data);

    data = 'module.exports = ' + JSON.stringify(handler.ratingUrfuPerson, '', 4) + ';\n';
    fs.writeFileSync(__dirname + '/ratingurfuperson.js', data);
}, 5000);

function ratingToArrAndSort(objRating)
{
    let arrRating = [];

    for (let key in objRating) {
        arrRating.push({
            name: key,
            total: objRating[key]
        });
    }

    arrRating.sort(function(a, b) {
        if (a.total > b.total) return -1;
        if (a.total < b.total) return 1;
        return 0;
    });

    return arrRating;
}

function ratingArrSum(arr)
{
    let sum = 0;

    for (let i = 0; i < arr.length; i++) {
        if (arr[i].name === 'Other') {
            continue;
        }
        sum += arr[i].total;
    }

    return sum;
}

function getPage()
{
    let arrRatingUrfu = ratingToArrAndSort(handler.ratingUrfu);
    let arrRatingUrfuSports = ratingToArrAndSort(handler.ratingUrfuSports);
    let arrRatingUrfuPerson = ratingToArrAndSort(handler.ratingUrfuPerson);

    let totalRatingUrfu = ratingArrSum(arrRatingUrfu);
    let totalRatingUrfuSports = ratingArrSum(arrRatingUrfuSports);
    let totalRatingUrfuPerson = ratingArrSum(arrRatingUrfuPerson);

    let tableRatingUrfu = '';
    for (let i = 0; i < arrRatingUrfu.length; i++) {
        if (arrRatingUrfu[i].name === 'Other') {
            continue;
        }

        let total = arrRatingUrfu[i].total * 100 / totalRatingUrfu;

        tableRatingUrfu += `
        <tr>
            <td>${arrRatingUrfu[i].name}</td>
            <td align="right">${arrRatingUrfu[i].total}</td>
            <td align="right">${total.toFixed(4)}</td>
        </tr>
        `;
    }

    let tableRatingUrfuSports = '';
    for (let i = 0; i < arrRatingUrfuSports.length; i++) {
        let total = arrRatingUrfuSports[i].total * 100 / totalRatingUrfuSports;

        tableRatingUrfuSports += `
        <tr>
            <td>${arrRatingUrfuSports[i].name}</td>
            <td align="right">${arrRatingUrfuSports[i].total}</td>
            <td align="right">${total.toFixed(4)}</td>
        </tr>
        `;
    }

    let tableRatingUrfuPerson = '';
    for (let i = 0; i < arrRatingUrfuPerson.length; i++) {
        tableRatingUrfuPerson += `
        <tr>
            <td align="left">${arrRatingUrfuPerson[i].name}</td>
            <td align="right">${arrRatingUrfuPerson[i].total}</td>
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
            <table border="1" align="center" width="50%">
                <caption>Рейтинг институтов УрФУ</caption>

                <tr>
                    <th>Институт</th>
                    <th>Количество ссылок</th>
                    <th>Количество ссылок, %</th>
                </tr>

                ${tableRatingUrfu}
            </table>
            <br>
            <table border="1" align="center" width="50%">
                <caption>Рейтинг видов спорта УрФУ</caption>

                <tr>
                    <th>Вид спорта</th>
                    <th>Количество ссылок</th>
                    <th>Количество ссылок, %</th>
                </tr>

                ${tableRatingUrfuSports}
            </table>
            <br>
            <table border="1" align="center" width="50%">
                <caption></caption>

                <tr>
                    <th></th>
                    <th>Количество ссылок</th>
                </tr>

                ${tableRatingUrfuPerson}
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
