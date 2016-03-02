'use strict';

var Spider = require('./index.js');

var paths = [
    'http://urfu.ru/ru/news/',
    'http://urfu.ru/ru/'
];
var spider = new Spider(paths);
spider.scan();
