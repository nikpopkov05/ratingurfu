'use strict';

var fs = require('fs');
var express = require('express');
var Classifier = require('./classifier');
var Tokenizer = require('./tokenizer');
var Spider = require('./spider');

var stopList = require('./stoplist.js');
var exceptionStem = require('./exceptionStem.js');
var dbInstitutions = require('./db/institutions.js');
var dbUrfu = require('./db/urfu.js');
var dbSports = require('./db/sports.js');
var dbPerson = require('./db/person.js');

var ratingUrfu = require('./ratingurfu.js');
var ratingUrfuSports = require('./ratingurfusports.js');
var ratingUrfuPerson = require('./ratingurfuperson.js');

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

    this.tokenizer = new Tokenizer(stopList, exceptionStem);

    this.classifierInstitutions = new Classifier(this.tokenizer);
    this.classifierUrfu = new Classifier(this.tokenizer);
    this.classifierSports = new Classifier(this.tokenizer);
    this.classifierPerson = new Classifier(this.tokenizer);

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

    for (let i = 0; i < dbSports.length; ++i) {
        for (let j = 0; j < dbSports[i].text.length; ++j) {
            this.classifierSports.train(dbSports[i].text[j], dbSports[i].category);
        }
    }

    for (let i = 0; i < dbPerson.length; ++i) {
        for (let j = 0; j < dbPerson[i].text.length; ++j) {
            this.classifierPerson.train(dbPerson[i].text[j], dbPerson[i].category);
        }
    }

    this.isDebug = false;

    for (let i = 2; i < process.argv.length; ++i) {
        if (process.argv[i] === 'debug') {
            this.isDebug = true;
        }
    }
}

Handler.prototype.run = function(text) {
    let category = this.classifierInstitutions.classify(text);
    // console.log(text);
    console.log(category);

    if (category) {
        if (category === 'УрФУ') {
            let category1 = this.classifierUrfu.classify(text);
            console.log(category1);
            if (category1 !== null) {
                if (this.isDebug) {
                    let fileName = `./log/${formatDate(new Date())}_${process.pid}.log`;
                    try {
                        fs.appendFileSync(fileName, `${category}\n${category1}\n\n${text}\n`);
                    } catch (err) {
                        console.log(fileName, err);
                    }
                }

                if (category1 in this.ratingUrfu) {
                    this.ratingUrfu[category1]++;
                } else {
                    this.ratingUrfu[category1] = 1;
                }
            }

            category = this.classifierSports.classify(text);
            console.log(category);
            if (category !== null) {
                if (category in this.ratingUrfuSports) {
                    this.ratingUrfuSports[category]++;
                } else {
                    this.ratingUrfuSports[category] = 1;
                }
            }
        }

        category = this.classifierPerson.classify(text);
        console.log(category);
        if (category !== null) {
            if (category in this.ratingUrfuPerson) {
                this.ratingUrfuPerson[category]++;
            } else {
                this.ratingUrfuPerson[category] = 1;
            }
        }
    }
};

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
