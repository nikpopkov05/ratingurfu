'use strict';

var Stemmer = require('./../stemmer').Stemmer;
var stemmer = new Stemmer();

/**
 * @constructor
 * @param {String[]} stopList список слов, для которых не будут создаваться токены
 * @param {String[]} exceptionStem список слов, которые не надо подвергать стеммингу
 */
function Tokenizer(stopList, exceptionStem)
{
    this.stopList = new Set();

    for (let i = 0; i < stopList.length; ++i) {
        this.stopList.add(this.toLowerCase(stopList[i]));
    }

    this.exceptionStem = new Set();

    for (let i = 0; i < exceptionStem.length; ++i) {
        this.exceptionStem.add(this.toLowerCase(exceptionStem[i]));
    }

    this.regToken = new RegExp("([\u0410-\u044f\u0401\u0451]+)|([a-zA-Z]+)|([0-9]+)", "g");
}

/**
 * @param {string} text
 * @return {string[]} массив токенов
 */
Tokenizer.prototype.tokenize = function(text) {
    let tokens = text.match(this.regToken);

    if (!tokens) {
        return [];
    }

    let outTokens = [];
    let lexeme;

    for (let i = 0; i < tokens.length; ++i) {
        lexeme = this.toLowerCase(tokens[i]);

        if (this.stopList.has(lexeme) === false) {
            if (this.exceptionStem.has(lexeme) === false) {
                lexeme = stemmer.stem(lexeme);
            }

            if (lexeme !== '') {
                outTokens.push(lexeme);
            }
        }
    }

    return outTokens;
};

Tokenizer.prototype.toLowerCase = function(lexeme) {
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
};

module.exports = Tokenizer;
