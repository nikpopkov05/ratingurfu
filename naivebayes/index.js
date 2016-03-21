/**
 * Автор: Жаналиев Артур
 * Дата разработки: 2016
 */

"use strict";

var util = require('util');

function tokenizer(text)
{
    let rgxPunctuation = /[^\w\s]/g;
    let sanitized = text.replace(rgxPunctuation, ' ');
    return sanitized.split(/\s+/);
}

function Classifier(tokenizerFunc)
{
    // количество документов в обучающей выборке принадлежащих классу c
    // count = docCount[class]
    this.docCount = new Map();

    // общее количество документов в обучающей выборке
    this.totalDocuments = 0;

    // уникальные слова во всех документах обучающей выборки
    // хранит true, если слово уникальное, иначе false
    this.wordUnique = new Map();

    this.words = new Map();

    // суммарное количество слов в документах класса c в обучающей выборке
    // count = wordCount[class]
    this.wordCount = new Map();

    // сколько раз i-ое слово встречалось в документах класса c в обучающей выборке
    // freq = wordFrequency[class][word]
    this.wordFrequency = new Map();

    // все категории
    this.categories = new Map();

    if (tokenizerFunc === undefined || tokenizerFunc === null) {
        this.tokenizer = tokenizer;
    } else {
        this.tokenizer = tokenizerFunc;
    }
}

function train(text, category)
{
    this.totalDocuments++;

    if (this.categories.has(category) === false) {
        this.categories.set(category, true);
    }

    if (this.docCount.has(category) === false) {
        this.docCount.set(category, 1);
    } else {
        let n = this.docCount.get(category);
        this.docCount.set(category, n + 1);
    }

    let tokens = this.tokenizer(text);

    if (this.wordCount.has(category) === false) {
        this.wordCount.set(category, tokens.length);
    } else {
        let n = this.wordCount.get(category);
        this.wordCount.set(category, n + tokens.length);
    }

    for (let i = 0; i < tokens.length; ++i) {
        if (this.wordUnique.has(tokens[i]) === false) {
            if (this.words.has(tokens[i]) === false) {
                this.wordUnique.set(tokens[i], true);
            }
        } else {
            this.wordUnique.delete(tokens[i]);
            this.words.set(tokens[i], true);
        }

        // частота слова в данном классе
        if (this.wordFrequency.has(category) === false) {
            let wordTable = new Map();
            this.wordFrequency.set(category, wordTable);
            wordTable.set(tokens[i], 1);
        } else {
            let wordTable = this.wordFrequency.get(category);
            if (wordTable.has(tokens[i]) === false) {
                wordTable.set(tokens[i], 1);
            } else {
                let n = wordTable.get(tokens[i]);
                wordTable.set(tokens[i], n + 1);
            }
        }
    }
}

function classify(text, famousMax)
{
    if (famousMax === undefined || famousMax === null) {
        famousMax = 0;
    }

    let wordsUniqueTotal = this.wordUnique.size;

    let first = false;
    let max = null;
    let resCategory = null;

    let tokens = this.tokenizer(text);

    for (let category of this.categories) {
        // console.log('category', category[0]);
        let docCount = this.docCount.get(category[0]);
        let wordCount = this.wordCount.get(category[0]);
        let wordTable = this.wordFrequency.get(category[0]);
        let wordsSum = 0;
        let famous = 0; // количество известных слов
        for (let i = 0; i < tokens.length; ++i) {
            let freq = 1;
            if (wordTable.has(tokens[i]) === true) {
                freq += wordTable.get(tokens[i]);
                famous++;
                // console.log(tokens[i]);
            }
            wordsSum += Math.log(freq / (wordsUniqueTotal + wordCount));
        }
        if (famous >= famousMax) {
            let res = Math.log(docCount / this.totalDocuments) + wordsSum;

            if (first === false) {
                max = res;
                resCategory = category[0];
                first = true;
            }

            if (res > max) {
                max = res;
                resCategory = category[0];
            }
        }
    }
    return resCategory;
}

Classifier.prototype.train = train;
Classifier.prototype.classify = classify;

module.exports = Classifier;
