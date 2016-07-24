'use strict';

var fs = require('fs');
var express = require('express');
// var mysql = require('mysql');
var Classifier = require('./classifier');
var Tokenizer = require('./tokenizer');
var Spider = require('./spider');

var stopList = require('./stoplist.js');
var exceptionStem = require('./exceptionStem.js');
var dbInstitutions = require('./db/institutions.js');
var dbUrfu = require('./db/urfu.js');
var dbKindsOfSports = require('./db/kindsofsports.js');
var dbPerson = require('./db/person.js');
var dbSports = require('./db/sports.js');

var ratingUrfu = require('./ratingurfu.js');
var ratingUrfuSports = require('./ratingurfusports.js');
var ratingUrfuPerson = require('./ratingurfuperson.js');
var ratingInstitutions = require('./ratinginstitutions.js');

// var mysqlConnection = mysql.createConnection({
//     host     : 'localhost',
//     port     :  3306,
//     user     : 'urfu',
//     password : '9294',
//     database : 'urfu'
// });

// mysqlConnection.connect(function(err) {
//     if (err) {
//         console.error('error connecting: ' + err.stack);
//         throw err;
//     }

//     console.log('connected as id ' + mysqlConnection.threadId);

//     mysqlConnection.query('CREATE TABLE IF NOT EXISTS scan (id INT(11) AUTO_INCREMENT PRIMARY KEY, url VARCHAR(255));', function(err, result) {
//         if (err) {
//             console.log(err);
//             throw err;
//         }
//         console.log(result);
//     });
// });

// mysqlConnection.on('error', function(err) {
//     console.log(err);
//     mysqlConnection = null;
// });

function formatDate(date)
{
    let dd = date.getDate();
    if (dd < 10) {
        dd = '0' + dd;
    }
    let mm = date.getMonth() + 1;
    if (mm < 10) {
        mm = '0' + mm;
    }
    let yy = date.getFullYear();
    if (yy < 10) {
        yy = '0' + yy;
    }
    let hh = date.getHours();
    if (hh < 10) {
        hh = '0' + hh;
    }
    let min = date.getMinutes();
    if (min < 10) {
        min = '0' + min;
    }
    let ss = date.getSeconds();
    if (ss < 10) {
        ss = '0' + ss;
    }
    let ms = date.getMilliseconds();
    return yy + '-' + mm + '-' + dd + ' ' + hh + '_' + min + '_' + ss + '_' + ms;
}

function Handler()
{
    this.ratingUrfu = ratingUrfu;
    this.ratingUrfuSports = ratingUrfuSports;
    this.ratingUrfuPerson = ratingUrfuPerson;
    this.ratingInstitutions = ratingInstitutions;

    this.tokenizer = new Tokenizer(stopList, exceptionStem);

    this.classifierInstitutions = new Classifier(this.tokenizer);
    this.classifierUrfu = new Classifier(this.tokenizer);
    this.classifierKindsOfSports = new Classifier(this.tokenizer);
    this.classifierPerson = new Classifier(this.tokenizer);
    this.classifierSports = new Classifier(this.tokenizer);

    for (let i = 0; i < dbInstitutions.length; ++i) {
        for (let j = 0; j < dbInstitutions[i].text.length; ++j) {
            this.classifierInstitutions.train(dbInstitutions[i].text[j], dbInstitutions[i].category);
        }
    }

    for (let i = 0; i < dbUrfu.length; ++i) {
        for (let j = 0; j < dbUrfu[i].text.length; ++j) {
            this.classifierUrfu.train(dbUrfu[i].text[j], dbUrfu[i].category);
        }
    }

    for (let i = 0; i < dbKindsOfSports.length; ++i) {
        for (let j = 0; j < dbKindsOfSports[i].text.length; ++j) {
            this.classifierKindsOfSports.train(dbKindsOfSports[i].text[j], dbKindsOfSports[i].category);
        }
    }

    for (let i = 0; i < dbPerson.length; ++i) {
        for (let j = 0; j < dbPerson[i].text.length; ++j) {
            this.classifierPerson.train(dbPerson[i].text[j], dbPerson[i].category);
        }
    }

    for (let i = 0; i < dbSports.length; ++i) {
        for (let j = 0; j < dbSports[i].text.length; ++j) {
            this.classifierSports.train(dbSports[i].text[j], dbSports[i].category);
        }
    }

    this.isDebug = false;

    for (let i = 2; i < process.argv.length; ++i) {
        if (process.argv[i] === 'debug') {
            this.isDebug = true;
        }
    }
}

Handler.prototype.run = function(text, path) {
    let category = this.classifierInstitutions.classify(text);

    console.log('---------------------------------');
    console.log(path);
    console.log(category);
    // console.log(text);

    if (category) {
        if (category[0].category == 'УрФУ') {


            let category1 = this.classifierUrfu.classify(text);

            console.log(category1);

            if (category1) {
                if (this.isDebug) {
                    let fileName = `./log/${formatDate(new Date())}_${process.pid}.log`;

                    try {
                        fs.appendFileSync(fileName, `${JSON.stringify(category, '', 4)}\n${JSON.stringify(category1, '', 4)}\n\n${text}\n`);
                    } catch (err) {
                        console.log(fileName, err);
                    }
                }

                for (let i = 0; i < category1.length; ++i) {
                    if (category1[i].total > 0) {
                        if (category1[i].category in this.ratingUrfu) {
                            this.ratingUrfu[category1[i].category]++;
                        } else {
                            this.ratingUrfu[category1[i].category] = 1;
                        }
                    }
                }
            }


            let category2 = this.classifierKindsOfSports.classify(text);

            console.log(category2);

            if (category2) {
                for (let i = 0; i < category2.length; ++i) {
                    if (category2[i].total > 0) {
                        if (category2[i].category in this.ratingUrfuSports) {
                            this.ratingUrfuSports[category2[i].category]++;
                        } else {
                            this.ratingUrfuSports[category2[i].category] = 1;
                        }
                    }
                }
            }
        } else if (category[0].category == 'Московский государственный университет им. М. В. Ломоносова') {
            let category2 = this.classifierSports.classify(text);

            console.log(category2);

            if (category2) {
                this.ratingInstitutions[category[0].category] += 1;
            }
        }


        let category3 = this.classifierPerson.classify(text);

        console.log(category3);

        if (category3) {
            for (let i = 0; i < category3.length; ++i) {
                if (category3[i].total > 0) {
                    if (category3[i].category in this.ratingUrfuPerson) {
                        this.ratingUrfuPerson[category3[i].category]++;
                    } else {
                        this.ratingUrfuPerson[category3[i].category] = 1;
                    }
                }
            }
        }
    }

    // if (mysqlConnection === null) {
    //     mysqlConnection = mysql.createConnection({
    //         host     : 'localhost',
    //         port     :  3306,
    //         user     : 'urfu',
    //         password : '9294',
    //         database : 'urfu'
    //     });

    //     mysqlConnection.connect(function(err) {
    //         if (err) {
    //             console.error('error connecting: ' + err.stack);
    //             throw err;
    //         }

    //         console.log('connected as id ' + mysqlConnection.threadId);

    //         mysqlConnection.query('CREATE TABLE IF NOT EXISTS scan (id INT(11) AUTO_INCREMENT PRIMARY KEY, url VARCHAR(255));', function(err, result) {
    //             if (err) {
    //                 console.log(err);
    //                 throw err;
    //             }
    //             console.log(result);
    //         });
    //     });

    //     mysqlConnection.on('error', function(err) {
    //         console.log(err);
    //         mysqlConnection = null;
    //     });
    // }

    // mysqlConnection.query('INSERT INTO `scan` (`url`) VALUES ("' + path + '");', function(err, result) {
    //     if (err) {
    //         console.log(err);
    //     }
    // });
};

var handler = new Handler();
var paths = [
    // 'http://www.msu.ru/news/',
    // 'http://urfu.ru/ru/news/',
    // 'http://lenta.ru/',
    // 'http://eburg.mk.ru/',
    // 'http://ria.ru/',
    // 'http://www.vesti.ru/'
];
var spider = new Spider(paths, handler);
spider.scan();

setInterval(function() {
    let data = 'module.exports = ' + JSON.stringify(handler.ratingUrfu, '', 4) + ';\n';
    fs.writeFileSync(__dirname + '/ratingurfu.js', data);

    data = 'module.exports = ' + JSON.stringify(handler.ratingUrfuSports, '', 4) + ';\n';
    fs.writeFileSync(__dirname + '/ratingurfusports.js', data);

    data = 'module.exports = ' + JSON.stringify(handler.ratingUrfuPerson, '', 4) + ';\n';
    fs.writeFileSync(__dirname + '/ratingurfuperson.js', data);

    data = 'module.exports = ' + JSON.stringify(handler.ratingInstitutions, '', 4) + ';\n';
    fs.writeFileSync(__dirname + '/ratinginstitutions.js', data);
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
    let arrRatingInstitutions = ratingToArrAndSort(handler.ratingInstitutions);

    let totalRatingUrfu = ratingArrSum(arrRatingUrfu);
    let totalRatingUrfuSports = ratingArrSum(arrRatingUrfuSports);
    let totalRatingUrfuPerson = ratingArrSum(arrRatingUrfuPerson);
    let totalRatingInstitutions = ratingArrSum(arrRatingInstitutions);

    let pos = 1;
    let tableRatingUrfu = '';
    for (let i = 0; i < arrRatingUrfu.length; i++) {
        if (arrRatingUrfu[i].name === 'Other') {
            continue;
        }

        let total = arrRatingUrfu[i].total * 100 / totalRatingUrfu;

        tableRatingUrfu += `
        <tr>
            <td>${pos}</td>
            <td>${arrRatingUrfu[i].name}</td>
            <td align="right">${arrRatingUrfu[i].total}</td>
            <td align="right">${total.toFixed(4)}</td>
        </tr>
        `;

        ++pos;
    }

    pos = 1;
    let tableRatingUrfuSports = '';
    for (let i = 0; i < arrRatingUrfuSports.length; i++) {
        let total = arrRatingUrfuSports[i].total * 100 / totalRatingUrfuSports;

        tableRatingUrfuSports += `
        <tr>
            <td>${pos}</td>
            <td>${arrRatingUrfuSports[i].name}</td>
            <td align="right">${arrRatingUrfuSports[i].total}</td>
            <td align="right">${total.toFixed(4)}</td>
        </tr>
        `;

        ++pos;
    }

    pos = 1;
    let tableRatingUrfuPerson = '';
    for (let i = 0; i < arrRatingUrfuPerson.length; i++) {
        tableRatingUrfuPerson += `
        <tr>
            <td>${pos}</td>
            <td align="left">${arrRatingUrfuPerson[i].name}</td>
            <td align="right">${arrRatingUrfuPerson[i].total}</td>
        </tr>
        `;

        ++pos;
    }

    pos = 1;
    let tableRatingInstitutions = '';
    for (let i = 0; i < arrRatingInstitutions.length; i++) {
        let total = arrRatingInstitutions[i].total * 100 / totalRatingInstitutions;

        tableRatingInstitutions += `
        <tr>
            <td>${pos}</td>
            <td>${arrRatingInstitutions[i].name}</td>
            <td align="right">${arrRatingInstitutions[i].total}</td>
            <td align="right">${total.toFixed(4)}</td>
        </tr>
        `;

        ++pos;
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
                    <th></th>
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
                    <th></th>
                    <th>Вид спорта</th>
                    <th>Количество ссылок</th>
                    <th>Количество ссылок, %</th>
                </tr>

                ${tableRatingUrfuSports}
            </table>

            <br>

            <table border="1" align="center" width="50%">
                <caption>Рейтинг персоналий УрФУ</caption>

                <tr>
                    <th></th>
                    <th></th>
                    <th>Количество ссылок</th>
                </tr>

                ${tableRatingUrfuPerson}
            </table>

            <br>

            <table border="1" align="center" width="50%">
                <caption>Рейтинг вузов России</caption>

                <tr>
                    <th></th>
                    <th>Институт</th>
                    <th>Количество ссылок</th>
                    <th>Количество ссылок, %</th>
                </tr>

                ${tableRatingInstitutions}
            </table>
        </body>
    </html>
    `;

    return page;
}

fs.writeFile(__dirname + '/index.html', getPage());

var app = express();

app.get('/', function (req, res) {
    let page = getPage();
    res.send(page);
});

app.listen(80, function () {
    console.log('Example app listening on port 80!');
});
