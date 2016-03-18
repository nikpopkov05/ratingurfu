/**
 * Автор: Жаналиев Артур
 * Дата разработки: 2016
 */

"use strict";

var util = require('util');
var naivebayes = require('./index.js');

var classifier = new naivebayes();
classifier.train('asdf asdgsad sdfyhj l;kjsi dsio aa ddd ddd aa 1', 'class1');
classifier.train('asdf asdgsad sdfyhj l;kjsi dsio aa ddd ddd aa', 'class1');
classifier.train('asdf asdgsad sdfyhj l;kjsi dsio aa ddd ddd aa', 'class1');
classifier.train('asdf asdgsad sdfyhj l;kjsi dsio aa ddd ddd aa', 'class2');
classifier.train('asdf asdgsad sdfyhj l;kjsi dsio aa ddd ddd aa', 'class3');

console.log('totalDocuments', classifier.totalDocuments);
console.log('docCount', util.inspect(classifier.docCount, { showHidden: false, depth: null }));
console.log('wordCount', util.inspect(classifier.wordCount, { showHidden: false, depth: null }));
console.log('wordFrequency', util.inspect(classifier.wordFrequency, { showHidden: false, depth: null }));
console.log('wordUnique', util.inspect(classifier.wordUnique, { showHidden: false, depth: null }));
console.log('categories', util.inspect(classifier.categories, { showHidden: false, depth: null }));

console.log(classifier.classify('asdf gsd 1 dsg'));
