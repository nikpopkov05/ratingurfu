'use strict';

var url = require('url');
var http = require('http');
var htmlparser = require("htmlparser2");
const mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'spider',
    password: 'spider'
});

pool.query('CREATE DATABASE IF NOT EXISTS `spider` CHARACTER SET utf8 COLLATE utf8_general_ci;', function(err, result) {
    if (err) {
        console.log(err);
        return;
    }

    console.log(result);

    pool.query('CREATE TABLE IF NOT EXISTS `spider`.`queue` (`id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, `url` TEXT NOT NULL, `hash` TEXT NOT NULL)', function(err, result) {
        if (err) {
            console.log(err);
            return;
        }

        console.log(result);
    });
});

/**
 * @param {string[]} paths
 * @param {Object} handler
 */
function Spider(paths, handler)
{
    this.handler = handler;
    this.paths = paths;
    this.index = 0;
    this.max = 1000000;
    this.map = {};
}

/**
 * cb : function(err: object, buffer: Buffer)
 */
Spider.prototype.get = function(path, cb) {
    let time = 1 * 60 * 1000;
    let timeout = null;

    let state = true;

    try {
        let request = http.get(path, function(response) {
            let buffer = null;

            response.on('error', function(err) {
                if (timeout) {
                    clearTimeout(timeout);
                }

                if (state) {
                    state = false;
                    process.nextTick(cb, err);
                }
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

                if (state) {
                    state = false;
                    process.nextTick(cb, null, buffer);
                }
            });
        });

        request.on('error', function(err) {
            if (timeout) {
                clearTimeout(timeout);
            }

            if (state) {
                state = false;
                process.nextTick(cb, err);
            }
        });

        timeout = setTimeout(function() {
            request.abort();
        }, time);
    } catch (err) {
        if (timeout) {
            clearTimeout(timeout);
        }

        if (state) {
            state = false;
            process.nextTick(cb, err);
        }
    }
};

/**
 * cb : function()
 */
Spider.prototype.frame = function(paths, index, count, handler, cb) {
    let self = this;

    console.log(`index ${index}/${self.max}`);

    if (index < paths.length) {
        self.get(paths[index], function(err, buffer) {
            if (!err) {
                if (buffer) {
                    let fullText = '';
                    let flagScan = true;
                    let parser = new htmlparser.Parser({
                        onopentag: function(name, attribs) {
                            if (name === 'script' || name === 'style') {
                                flagScan = false;
                            } else if (name === 'a' && attribs.href) {
                                if (count < self.max) {
                                    let href = attribs.href;

                                    if (attribs.href.indexOf('http://') !== 0) {
                                        let obj = url.parse(paths[index]);
                                        let from = obj.href.substring(0, obj.href.indexOf(obj.path));
                                        href = url.resolve(from, attribs.href);
                                    }

                                    let pathname = url.parse(href).pathname;
                                    if (pathname) {
                                        let files = [
                                            '.pdf', '.PDF',
                                            '.doc', '.DOC',
                                            '.docx', '.DOCX',
                                            '.pptx', '.PPTX',
                                            '.xlsx', '.XLSX',
                                            '.gif', '.GIF',
                                            '.png', '.PNG',
                                            '.jpg', '.JPG'
                                        ];
                                        for (let i = 0; i < files.length; ++i) {
                                            if (pathname.lastIndexOf(files[i]) === (pathname.length - files[i].length)) {
                                                return;
                                            }
                                        }
                                    }

                                    if (!(href in self.map)) {
                                        // console.log('<', href, '>');
                                        if (href.indexOf(self.paths[self.index]) === 0) {
                                            console.log(href);
                                            paths.push(href);
                                            self.map[href] = true;
                                            ++count;
                                        }

                                        // paths.push(href);
                                        // self.map[href] = true;
                                        // ++count;
                                    }
                                }
                            }
                        },

                        ontext: function(text) {
                            text = text.trim();
                            if (text !== '' && flagScan === true) {
                                // self.handler.run(text);
                                fullText += text + '\n';
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

                    self.handler.run(fullText, paths[index]);
                }
            }

            setTimeout(function() {
                self.frame(paths, index + 1, count, handler, cb);
            }, 3000);
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

        setTimeout(function() {
            self.scan(handler);
        }, 3000);
    }
};

module.exports = Spider;
