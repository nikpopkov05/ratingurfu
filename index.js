'use strict';

var url = require('url');
var http = require('http');
var htmlparser = require("htmlparser2");

//============================================================

var stopList = require('./stoplist.js');
var strStopList = '';
var firstStopList = true;
for (let i = 0; i < stopList.length; ++i) {
    if (firstStopList) {
        strStopList += '(' + stopList[i] + ')';
        firstStopList = false;
    } else {
        strStopList += '|(' + stopList[i] + ')';
    }
}
var regStopList = new RegExp(strStopList, "g");
var regToken = new RegExp("([\u0410-\u044f\u0401\u0451]+)|([a-zA-Z]+)|([0-9]+)", "g");

function tokenize(text)
{
    text = text.replace(regStopList, ' ');
    let lexemes = text.match(regToken);
    if (!lexemes) {
        lexemes = [];
    }
    return lexemes;
}

function toLowerCase(lexeme)
{
    let string = '';
    for (let i = 0; i < lexeme.length; ++i) {
        if (lexeme[i] >= '\u0410' && lexeme[i] <= '\u042f') {
            let code = lexeme.charCodeAt(i) + 32;
            string += String.fromCharCode(code);
        } else if (lexeme[i] === '\u0401' || lexeme[i] === '\u0451') {
            string += '\u0435';
        } else {
            string += lexeme[i];
        }
    }
    return string;
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
        lexeme = stemmer.stem(lexeme);
        if (lexeme !== '') {
            outLexemes.push(lexeme);
        }
    }
    return outLexemes;
};

var categories = {};
var db = require('./db.js');
var bayes = require('bayes');
var classifier = bayes({tokenizer: tokenizeAndStem});
var db = require('./db.js');
for (let i = 0; i < db.length; ++i) {
    categories[db[i].category] = 0;
    classifier.learn(db[i].text, db[i].category);
}

//============================================================

/**
 * paths : array of string
 */
function Spider(paths)
{
    this.paths = paths;
    this.index = 0;
    this.max = 1000;
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
                                        }
                                    }
                                }
                            }
                        },

                        ontext: function(text) {
                            if (text !== '' && flagScan === true) {
                                let lexemes = tokenize(text);
                                if (lexemes.length > 0) {
                                    let category = classifier.categorize(text);
                                    if (category !== null) {
                                        categories[category]++;
                                        /*if (category === 'Институт государственного управления и предпринимательства') */{
                                            console.log('/**=============');
                                            console.log(category);
                                            console.log(text);
                                            console.log(new Buffer(text));
                                            console.log('=============*/\n');
                                        }
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
    'http://urfu.ru/ru/'
];
var spider = new Spider(paths);
spider.scan();

// setInterval(function(params) {
//     let arr = [];
//     for (let key in categories) {
//         arr.push({
//             name: key,
//             total: categories[key]
//         });
//     }

//     arr.sort(function(a, b) {
//         if (a.total > b.total) return -1;
//         if (a.total < b.total) return 1;
//         return 0;
//     });

//     let lines = process.stdout.getWindowSize()[1];
//     for(var i = 0; i < lines; i++) {
//         console.log('\r\n');
//     }
//     console.log(arr);
// }, 5000);
