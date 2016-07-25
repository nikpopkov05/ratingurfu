'use strict';

var Spider = require('./spider');
var Rating = require('./rating');

var paths = [
    'http://urfu.ru/ru/news/',
    'http://www.msu.ru/news/',
    'http://www.bmstu.ru/mstu/info/events/',
    'http://www.bmstu.ru/mstu/info/bauman-news/',
    'http://spbu.ru/news-spsu',
    'https://mipt.ru/news/',
    'https://www.hse.ru/news/',
    'http://mpei.ru/news',
    'http://mpei.ru/news/Pages/default.aspx',
    'https://mephi.ru/content/news/',
    'https://lenta.ru/',
    'http://eburg.mk.ru/',
    'http://ria.ru/',
    'http://www.vesti.ru/'
];

var spider = new Spider(paths);
var rating = new Rating();

spider.init(function(err) {
    if (err) {
        console.log('spider err', err);
    } else {
        rating.init(function(err) {
            if (err) {
                console.log('rating err', err);
            } else {
                console.log('init success');
                spider.scan();
                rating.scan();
            }
        });
    }
});
