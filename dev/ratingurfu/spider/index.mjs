import g_url from 'url';
import http from 'http';
import https from 'https';
import puppeteer from 'puppeteer'
import htmlparser from "htmlparser2";
import mysql from 'mysql';
import Classifier from './../classifier/index.js';
import Tokenizer from './../tokenizer/index.js';
import stopList from './../db/stoplist.js';
import exceptionStem from './../db/exceptionStem.js';
import dbInstitutions from './../db/institutions.js';

export class Spider {
    /**
     * @param {string[]} paths
     * @param {Function} handler
     */
    constructor(paths, handler) {
        this.mysqlPool = null;
        this.paths = [];
        this.levelMax = 2; // максимальная вложенность
        this.delay = 50; // задержка в миллисекундах
        this.offset = 0;
        this.count = 100; // pagination
        this.tokenizer = new Tokenizer(stopList, exceptionStem);
        this.classifierInstitutions = new Classifier(this.tokenizer);
        this.handler = handler;

        if (Array.isArray(paths)) {
            for (let i = 0; i < paths.length; ++i) {
                if (paths[i] && ((typeof paths[i]) == 'string')) {
                    this.paths.push({
                        "url": paths[i],
                        "level": 0
                    });
                }
            }
        }

        for (let i = 0; i < dbInstitutions.length; ++i) {
            for (let j = 0; j < dbInstitutions[i].text.length; ++j) {
                this.classifierInstitutions.train(dbInstitutions[i].text[j], dbInstitutions[i].category);
            }
        }
    }


    /**
     * @callback initCb
     * @param {Object} err
     */
    /**
     * @param {initCb} cb
     */
    init(cb) {
        let self = this;

        self.mysqlPool = mysql.createPool({
            connectionLimit: 10,
            host: 'localhost',
            user: 'ratingurfu',
            password: 'ratingurfu'
        });

        // const queryAsync = util.promisify(self.mysqlPool.query);

        // try {
        //     let res = await queryAsync()
        //     let res = await queryAsync()
        //     let res = await queryAsync()
        // }
        // catch (err) {
        // }
        
        self.mysqlPool.query('CREATE DATABASE IF NOT EXISTS `spider` CHARACTER SET utf8 COLLATE utf8_general_ci;', function (err, result) {
            if (err) {
                process.nextTick(cb, err);
                return;
            }

            self.mysqlPool.query('CREATE TABLE IF NOT EXISTS `spider`.`queue` (`id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT, `url` TEXT NOT NULL, `level` INT(11) UNSIGNED NOT NULL, `date` DATE NOT NULL, UNIQUE(`id`));', function (err, result) {
                if (err) {
                    process.nextTick(cb, err);
                    return;
                }

                self.mysqlPool.query('CREATE TABLE IF NOT EXISTS `spider`.`pages` (`id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT, `url` TEXT NOT NULL, `text` LONGTEXT NOT NULL, `date` DATE NOT NULL, UNIQUE(`id`));', function (err, result) {
                    if (err) {
                        process.nextTick(cb, err);
                        return;
                    }

                    process.nextTick(cb, null);
                });
            });
        });
    };

    /**
     * cb : function(err: object, buffer: Buffer)
     */
    async get(path, cb) {
        let time = 15 * 1000;
        let timeout = null;

        let state = true;

        if (path.indexOf('http://') == 0 || path.indexOf('https://') == 0) {
            try {
                // console.log("get", path)
                const browser = await puppeteer.launch({
                    // headless: "new"
                });
                // console.log("browser", browser)
                const page = await browser.newPage();
                // console.log("page", page)
                await page.setViewport({ width: 1080, height: 1024 });
                const response = await page.goto(path, { waitUntil: "networkidle2" });
                // console.log("response", response)
                const resBody = await page.content();
                // console.log("resBody", resBody?.length)
                await browser.close();

                process.nextTick(cb, null, resBody);
            } catch (err) {
                console.log("err", err.message)
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }

                if (state) {
                    state = false;
                    process.nextTick(cb, err);
                }
            }
        }
    };

    /**
     * cb : function()
     */
    parsePages(index, arr, cb) {
        let self = this;

        process.stdout.write(`\u000D${index}/${arr.length}`);

        if (index < arr.length) {
            self.get(arr[index].url, function (err, buffer) {
                if (!err) {
                    if (buffer) {
                        self.parseOnePage(arr[index].url, arr[index].level, buffer, function (err, res) {
                            if (!err) {
                                self.insertArrToQueue(res.paths, function () {
                                    // TODO
                                    self.handler(arr[index].url, res.text);

                                    let category = self.classifierInstitutions.classify(res.text);

                                    if (category) {
                                        self.insertPages(arr[index].url, res.text, function (err) {
                                            setTimeout(function () {
                                                self.parsePages(index + 1, arr, cb);
                                            }, self.delay);
                                        });
                                    } else {
                                        setTimeout(function () {
                                            self.parsePages(index + 1, arr, cb);
                                        }, self.delay);
                                    }
                                });
                            } else {
                                setTimeout(function () {
                                    self.parsePages(index + 1, arr, cb);
                                }, self.delay);
                            }
                        });
                    } else {
                        setTimeout(function () {
                            self.parsePages(index + 1, arr, cb);
                        }, self.delay);
                    }
                } else {
                    setTimeout(function () {
                        self.parsePages(index + 1, arr, cb);
                    }, self.delay);
                }
            });
        } else {
            self.deleteOldPages(function () {
                console.log('\ndeleteOldPages');
                process.nextTick(cb);
            });
        }
    };

    parseOnePage(url, level, buffer, cb) {
        let self = this;

        let result = {
            "text": '',
            "paths": []
        };

        let flagScan = true;

        let parser = new htmlparser.Parser({
            onopentag: function (name, attribs) {
                if ((name == 'script') || (name == 'style')) {
                    flagScan = false;
                } else if ((name == 'a') && attribs && ((typeof attribs) == 'object') && attribs.href && ((typeof attribs.href) == 'string')) {
                    // if (level < self.levelMax) {
                    let href = '';

                    if ((attribs.href.indexOf('http://') == 0) || (attribs.href.indexOf('https://') == 0)) {
                        let objUrl1 = g_url.parse(attribs.href);

                        for (let i = 0; i < self.paths.length; ++i) {
                            let objUrl2 = g_url.parse(self.paths[i].url);

                            if (objUrl1.host && objUrl2.host && (objUrl1.host == objUrl2.host) && (objUrl1.protocol == objUrl2.protocol)) {
                                let pathname1 = '';
                                let pathname2 = '';

                                if ((typeof objUrl1.pathname) == 'string') {
                                    pathname1 = objUrl1.pathname;
                                }

                                if ((typeof objUrl2.pathname) == 'string') {
                                    pathname2 = objUrl2.pathname;
                                }

                                if (pathname1.indexOf(pathname2) == 0) {
                                    href = attribs.href;
                                    break;
                                }
                            }
                        }
                    } else {
                        let objUrl0 = g_url.parse(url);

                        if (objUrl0.protocol && objUrl0.host) {
                            let main = `${objUrl0.protocol}//${objUrl0.host}`;
                            let href1 = g_url.resolve(main, attribs.href);
                            let objUrl1 = g_url.parse(href1);

                            for (let i = 0; i < self.paths.length; ++i) {
                                let objUrl2 = g_url.parse(self.paths[i].url);

                                if (objUrl1.host && objUrl2.host && (objUrl1.host == objUrl2.host) && (objUrl1.protocol == objUrl2.protocol)) {
                                    let pathname1 = '';
                                    let pathname2 = '';

                                    if ((typeof objUrl1.pathname) == 'string') {
                                        pathname1 = objUrl1.pathname;
                                    }

                                    if ((typeof objUrl2.pathname) == 'string') {
                                        pathname2 = objUrl2.pathname;
                                    }

                                    if (pathname1.indexOf(pathname2) == 0) {
                                        href = href1;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (href) {
                        let pathname = g_url.parse(href).pathname;

                        if (pathname) {
                            if (!self.isIgnoreUrlPathName(pathname)) {
                                result.paths.push({
                                    "url": href,
                                    "level": level + 1
                                });
                            }
                        }
                    }
                    // }
                }
            },

            ontext: function (text) {
                let t = text.trim();

                if (t && flagScan) {
                    result.text += (t + ' \n');
                }
            },

            onclosetag: function (tagname) {
                if ((tagname === 'script') || (tagname === 'style')) {
                    flagScan = true;
                }
            }
        }, { decodeEntities: true });

        parser.write(buffer.toString());
        parser.end();

        process.nextTick(cb, null, result);
    };

    isIgnoreUrlPathName(url) {
        let ext = [
            '.pdf',
            '.doc',
            '.docx',
            '.pptx',
            '.xlsx',
            '.gif',
            '.png',
            '.jpg'
        ];

        for (let i = 0; i < ext.length; ++i) {
            if (url.toLowerCase().lastIndexOf(ext[i].toLowerCase()) == (url.length - ext[i].length)) {
                return true;
            }
        }

        return false;
    };

    /**
     *
     */
    scan() {
        let self = this;

        self.extractFromQueue(function (err, res) {
            if (!err) {
                if (res.length < 1) {
                    self.insertArrToQueue(self.paths, function () {
                        setTimeout(function () {
                            self.scan();
                        }, self.delay);
                    });
                } else {
                    self.parsePages(0, res, function () {
                        setTimeout(function () {
                            self.scan();
                        }, self.delay);
                    });
                }
            } else {
                setTimeout(function () {
                    self.scan();
                }, self.delay);
            }
        });
    };

    /**
     * @callback insertArrToQueueCb
     * @param {Object} err
     */
    /**
     * @param {Object[]} arr
     * @param {insertArrToQueueCb} cb
     */
    insertArrToQueue(arr, cb) {
        let self = this;

        if (Array.isArray(arr) && ((typeof cb) == 'function')) {
            self.insertArrToQueueFrame(0, arr, function (err, res) {
                process.nextTick(cb, err, res);
            });
        } else {
            process.nextTick(cb, new Error('invalid args'));
        }
    };

    insertArrToQueueFrame(index, arr, cb) {
        let self = this;

        if (index < arr.length) {
            self.insertToQueue(arr[index].url, arr[index].level, function (err) {
                self.insertArrToQueueFrame(index + 1, arr, cb);
            });
        } else {
            process.nextTick(cb, null);
        }
    };

    /**
     * @callback insertToQueueCb
     * @param {Object} err
     */
    /**
     * @param {string} url
     * @param {number} level
     * @param {insertToQueueCb} cb
     */
    insertToQueue(url, level, cb) {
        let self = this;

        if ((typeof cb) == 'function') {
            if (url && ((typeof url) == 'string') && ((typeof level) == 'number') && (level >= 0)) {
                let query = `SELECT * FROM \`spider\`.\`queue\` WHERE ((\`url\`='${url}') && ((TO_DAYS(CURDATE()) - TO_DAYS(\`date\`)) < 3));`;

                self.mysqlPool.query(query, function (err, res) {
                    if (!err) {
                        if (Array.isArray(res)) {
                            if (res.length < 1) {
                                let today = new Date();
                                let date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
                                let query = `INSERT INTO \`spider\`.\`queue\` SET \`url\` = '${url}', \`level\` = ${level}, \`date\` = '${date}';`;

                                self.mysqlPool.query(query, function (err, res) {
                                    if (!err) {
                                        process.nextTick(cb, null);
                                    } else {
                                        process.nextTick(cb, err);
                                    }
                                });
                            } else {
                                process.nextTick(cb, null);
                            }
                        } else {
                            process.nextTick(cb, null);
                        }
                    } else {
                        process.nextTick(cb, err);
                    }
                });
            } else {
                process.nextTick(cb, new Error('invalid args'));
            }
        } else {
            throw new Error('нет callback функции');
        }
    };

    /**
     * @callback extractFromQueueCb
     * @param {Object} err
     * @param {Object[]} res
     */
    /**
     * @param {extractFromQueueCb} cb
     */
    extractFromQueue(cb) {
        let self = this;

        if ((typeof cb) == 'function') {
            let query = `SELECT * FROM \`spider\`.\`queue\` ORDER BY \`id\` LIMIT ${self.offset}, ${self.count};`;

            self.mysqlPool.query(query, function (err, res) {
                if (!err) {
                    if (Array.isArray(res)) {
                        console.log(self.offset);

                        if (res.length > 0) {
                            self.offset += self.count;
                        } else {
                            self.offset = 0;
                        }

                        let result = res;
                        let query = 'DELETE FROM `spider`.`queue` WHERE ((TO_DAYS(CURDATE()) - TO_DAYS(`date`)) >= 3);';

                        self.mysqlPool.query(query, function (err, res) {
                            if (!err) {
                                console.log('\ndelete old queue');
                            }

                            process.nextTick(cb, null, result);
                        });
                    } else {
                        process.nextTick(cb, new Error('not array'));
                    }
                } else {
                    process.nextTick(cb, err);
                }
            });
        } else {
            throw new Error('нет callback функции');
        }
    };

    /**
     * @callback deleteOldPages
     * @param {Object} err
     * @param {*} res
     */
    /**
     * @param {deleteOldPages} cb
     */
    deleteOldPages(cb) {
        let self = this;

        if ((typeof cb) == 'function') {
            let query = 'DELETE FROM `spider`.`pages` WHERE ((TO_DAYS(CURDATE()) - TO_DAYS(`date`)) >= 365);';

            self.mysqlPool.query(query, cb);
        } else {
            throw new Error('нет callback функции');
        }
    };

    /**
     *
     */
    insertPages(url, text, cb) {
        let self = this;

        if ((typeof cb) == 'function') {
            if (url && ((typeof url) == 'string') && text && ((typeof text) == 'string')) {
                let qUrl = self.mysqlPool.escape(url);
                let query = `SELECT * FROM \`spider\`.\`pages\` WHERE (\`url\`=${qUrl});`;

                self.mysqlPool.query(query, function (err, res) {
                    if (!err) {
                        if (Array.isArray(res)) {
                            if (res.length < 1) {
                                let today = new Date();
                                let date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
                                let qDate = self.mysqlPool.escape(date);
                                let qText = self.mysqlPool.escape(text);
                                let query = `INSERT INTO \`spider\`.\`pages\` SET \`url\` = ${qUrl}, \`text\` = ${qText}, \`date\` = ${qDate};`;

                                self.mysqlPool.query(query, function (err, res) {
                                    if (!err) {
                                        process.nextTick(cb, null);
                                    } else {
                                        process.nextTick(cb, err);
                                    }
                                });
                            } else {
                                process.nextTick(cb, null);
                            }
                        } else {
                            process.nextTick(cb, null);
                        }
                    } else {
                        process.nextTick(cb, err);
                    }
                });
            } else {
                process.nextTick(cb, new Error('invalid args'));
            }
        } else {
            throw new Error('нет callback функции');
        }
    };
}

