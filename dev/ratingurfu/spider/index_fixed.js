'use strict';

const g_url = require('url');
const http = require('http');
const https = require('https');
const fs = require('fs');
const htmlparser = require("htmlparser2");
const mysql = require('mysql');
const Classifier = require('./../classifier');
const Tokenizer = require('./../tokenizer');
const stopList = require('./../db/stoplist.js');
const exceptionStem = require('./../db/exceptionStem.js');
const dbInstitutions = require('./../db/institutions.js');
const cheerio = require('cheerio');
const async = require('async');

/**
 * @param {string[]} paths
 */
function Spider(paths)
{
    this.mysqlPool = mysql.createPool({
        host: 'localhost',
        user: 'ratingurfu',
        password: 'ratingurfu',
        database: 'spider',
        multipleStatements: true
    });
    this.paths = [];
    this.levelMax = 100;
    this.delay = 50;
    this.offset = 0;
    this.count = 500;
    this.tokenizer = new Tokenizer(stopList, exceptionStem);
    this.classifierInstitutions = new Classifier(this.tokenizer);

    this.targetPersons = []; 
    this.seenImages = new Set(); // Коллекция для отслеживания уже занятых картинок

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

Spider.prototype.init = function(cb) {
    let self = this;
    console.log("Пробуем подключится к MySQL и создать базу...");

    self.mysqlPool.query('CREATE DATABASE IF NOT EXISTS `spider` CHARACTER SET utf8 COLLATE utf8_general_ci;', function(err, result) {
        if (err) {
            console.log("Ошибка на шаге создания базы:", err);
            return process.nextTick(cb, err);
        }
        console.log("База данных готова. Создаем таблицу queue...");

        self.mysqlPool.query('CREATE TABLE IF NOT EXISTS `spider`.`queue` (`id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT, `url` TEXT NOT NULL, `level` INT(11) UNSIGNED NOT NULL, `date` DATE NOT NULL, UNIQUE(`id`));', function(err, result) {
            if (err) {
                console.log("Ошибка на шаге таблицы queue:", err);
                return process.nextTick(cb, err);
            };
            console.log("Таблица queue готова. Создаем таблицу pages...");

            let createPagesTable = [
                "CREATE TABLE IF NOT EXISTS `spider`.`pages` (",
                "   `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT, ",
                "   `url` VARCHAR(500) NOT NULL, ", 
                "   `text` LONGTEXT NOT NULL, ",
                "   `photo_url` TEXT, ",
                "   `university` VARCHAR(100) DEFAULT 'УрФУ', ", 
                "   `date` DATE NOT NULL, ",
                "   PRIMARY KEY (`id`), ", 
                "   UNIQUE KEY `idx_url` (`url`)",
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;"
            ].join(" ");

            self.mysqlPool.query(createPagesTable, function(err, result) {
                if (err) {
                    console.log("Ошибка на шаге таблицы pages:", err);
                    return process.nextTick(cb, err);
                };
                console.log("Таблица pages успешно создана.");

                // Загружаем уже сохраненные картинки в память 
                self.mysqlPool.query('SELECT DISTINCT photo_url FROM `spider`.`pages` WHERE photo_url IS NOT NULL;', function(err, rows) {
                    if (!err && Array.isArray(rows)) {
                        rows.forEach(row => {
                            if (row.photo_url) self.seenImages.add(row.photo_url);
                        });
                    }
                    console.log("Инициализация полностью завершена!");
                    process.nextTick(cb, err);
                });
            });
        });
    });
};

Spider.prototype.get = function(path, cb) {
    let time = 15 * 1000;
    let timeout = null;
    let state = true;
    let httpModule = path.indexOf('https://') === 0 ? https : http;

    try {
        let request = httpModule.get(path, function(response) {
            let buffer = null;

            response.on('error', function(err) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                if (state) {
                    state = false;
                    process.nextTick(cb, err);
                }
            });

            response.on('data', function(data) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
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
                    timeout = null;
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
                timeout = null;
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
            timeout = null;
        }
        if (state) {
            state = false;
            process.nextTick(cb, err);
        }
    }
};

Spider.prototype.parsePages = function(arr, cb) {
    let self = this;
    const CONCURRENCY_LIMIT = 15; 

    async.mapLimit(arr, CONCURRENCY_LIMIT, function(pageItem, callback) {
        // 1. Загружаем страницу
        self.get(pageItem.url, function(err, buffer) {
            if (err || !buffer) {
                // Если ошибка загрузки — всё равно удаляем из очереди, чтобы не застревать на битой ссылке
                self.mysqlPool.query('DELETE FROM `spider`.`queue` WHERE `url` = ?', [pageItem.url], () => {
                    callback(null, null);
                });
                return; 
            }

            // 2. Парсим HTML
            self.parseOnePage(pageItem.url, pageItem.level, buffer, function(err, res) {
                if (err || !res) {
                    self.mysqlPool.query('DELETE FROM `spider`.`queue` WHERE `url` = ?', [pageItem.url], () => {
                        callback(null, null);
                    });
                    return;
                }

                // 3. Сохраняем новые найденные ссылки (пагинацию и статьи) в очередь
                self.insertArrToQueue(res.paths, function() {
                    // 4. Сохраняем статью и картинку в таблицу pages
                    self.insertPages(pageItem.url, res.html, res.text, function(err) {
                        
                        // 5. УСПЕХ: Удаляем текущую ссылку из очереди, чтобы она больше никогда не повторялась!
                        self.mysqlPool.query('DELETE FROM `spider`.`queue` WHERE `url` = ?', [pageItem.url], function(delErr) {
                            if (delErr) console.error('Ошибка удаления из очереди:', delErr);
                            callback(null, res);
                        });

                    });
                });
            });
        });
    }, function(err, results) {
        if (err) {
            console.error('Ошибка при параллельной обработке пачки:', err);
        }
        
        // Считаем реально успешно обработанные страницы в этой пачке
        const successCount = results.filter(r => r !== null).length;
        console.log(`📊 Успешно обработано и удалено из очереди страниц: ${successCount}`);
        
        process.nextTick(cb);
    });
};

Spider.prototype.parseOnePage = function(url, level, buffer, cb) {
    let self = this;
    const $ = cheerio.load(buffer);
    let paths = [];

    // Список разрешенных доменов университетов, которые мы собираем
    // Домены будут дополняться по мере разработки
    const allowedDomains = ['urfu.ru', 'msu.ru', 'spbu.ru', 'hse.ru']

    // Перебираем все ссылки на странице 
    $('a').each((i, el) => {
        let href = $(el).attr('href');
        if (!href) return;

        try {
            let absoluteUrl = new URL(href, url).href;

            // Проверяем ведет ли ссылка на один из разрешенных сайтов вузов
            let isAllowedDomain = allowedDomains.some(domain => absoluteUrl.includes(domain));

            if (isAllowedDomain) {
                // Очищаем URL, сохраняя параметр пагинации ?p=
                let parsedUrl = new URL(absoluteUrl);
                let cleanUrl = parsedUrl.origin + parsedUrl.pathname;
                if (parsedUrl.searchParams.has('p')) {
                    cleanUrl += '?p=' + parsedUrl.searchParams.get('p');
                }

                // Проверяем, что это страница новостей ил архива
                if (cleanUrl.includes('/news') || cleanUrl.includes('novosti')) {
                    if (
                        !this.isIgnoreUrlPathName(cleanUrl) &&
                        (cleanUrl.includes('/news') || cleanUrl.includes('novosti'))
                    ) {
                        paths.push({
                        url: cleanUrl,
                        level: level + 1,
                        date: new Date()
                        });
                    }
                }
            }
        } catch (e) {
            // Игнорируем некорректные ссылки (mailto, tel, битые якоря)
        }
    });

    let text = $('body').text().replace(/\s+/g, ' ').trim();
    let html = buffer.toString();

    process.nextTick(cb, null, {
        text: text,
        html: html,
        paths: paths
    });
};

Spider.prototype.isIgnoreUrlPathName = function(url) {
    let ext = ['.pdf', '.doc', '.docx', '.pptx', '.xlsx', '.gif', '.png', '.jpg'];

    for (let i = 0; i < ext.length; ++i) {
        if (url.toLowerCase().endsWith(ext[i].toLowerCase())) {
            return true;
        }
    }

    return false;
};

Spider.prototype.scan = function() {
    let self = this;

    self.extractFromQueue(function(err, rows) {
        if (err || !rows || rows.length === 0) {
            // Если данных нет, ждем 2 секунды перед повторной попыткой
            return setTimeout(function() {
                self.scan();
            }, 2000);
        }

        console.log(`\n--- Обрабатываем пачку: ${rows.length} стр. ---`);

        self.parsePages(rows, function(err) {
            self.scan();
        });
    });
};

Spider.prototype.insertArrToQueue = function(arr, cb) {
    let self = this;
    if (typeof cb !== 'function') cb = function() {};
    if (!arr || arr.length === 0) return process.nextTick(cb);

    // Собираем значения в один массовый INSERT
    let values = arr.map(item => `(${self.mysqlPool.escape(item.url)}, ${parseInt(item.level) || 0}, NOW())`).join(',');
    
    let query = `INSERT IGNORE INTO \`spider\`.\`queue\` (\`url\`, \`level\`, \`date\`) VALUES ${values};`;

    self.mysqlPool.query(query, function(err) {
        if (err) console.error('Ошибка массовой вставки в queue:', err);
        process.nextTick(cb);
    });
};

Spider.prototype.insertArrToQueueFrame = function(index, arr, cb) {
    let self = this;

    if (index < arr.length) {
        self.insertToQueue(arr[index].url, arr[index].level, function(err) {
            self.insertArrToQueueFrame(index + 1, arr, cb);
        });
    } else {
        process.nextTick(cb, null);
    }
};

Spider.prototype.insertToQueue = function(url, level, cb) {
    let self = this;

    if (typeof cb !== 'function') {
        throw new Error('нет callback функции');
    }

    if (url && (typeof url == 'string') && (typeof level == 'number') && (level >= 0)) {
        let qUrl = self.mysqlPool.escape(url);
        // Временно убираем проверку на 3 дня, чтобы спайдер заново зашел на стартовые страницы
        let query = `SELECT * FROM \`spider\`.\`queue\` WHERE \`url\`=${qUrl};`;

        self.mysqlPool.query(query, function(err, res) {
            if (!err) {
                if (Array.isArray(res) && res.length < 1) {
                    let today = new Date();
                    let date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
                    let qDate = self.mysqlPool.escape(date);
                    let insertQuery = `INSERT INTO \`spider\`.\`queue\` SET \`url\` = ${qUrl}, \`level\` = ${level}, \`date\` = ${qDate};`;

                    self.mysqlPool.query(insertQuery, function(err, res) {
                        process.nextTick(cb, err);
                    });
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
};

Spider.prototype.extractFromQueue = function(cb) {
    let self = this;

    let queryDelete = `DELETE FROM \`spider\`.\`queue\` WHERE ((TO_DAYS(CURDATE()) - TO_DAYS(\`date\`)) >= 3);`;
    console.log('delete old queue');

    self.mysqlPool.query(queryDelete, function(err) {
        if (err) console.error('Ошибка очистки:', err);

        let querySelect = `SELECT * FROM \`spider\`.\`queue\` ORDER BY \`level\` ASC, \`id\` ASC LIMIT ${self.count || 50};`;

        self.mysqlPool.query(querySelect, function(err, rows) {
            if (err) return cb(err);

            if (!rows || rows.length === 0) {
                console.log('Очередь пуста! Засеваем стартовые URL...');
                const seedFromPaths = Array.isArray(self.paths) && self.paths.length > 0
                    ? self.paths
                    : null;

                const startItems = seedFromPaths
                    ? seedFromPaths
                    : (self.startUrls || ['https://urfu.ru/ru/news/']).map(u => ({ "url": u, "level": 0 }));

                return self.insertArrToQueue(startItems, function() {
                    self.mysqlPool.query(querySelect, function(err, newRows) {
                        cb(null, newRows || []);
                    });
                });
            }

            cb(null, rows);
        });
    });
};

Spider.prototype.deleteOldPages = function(cb) {
    let self = this;

    if (typeof cb === 'function') {
        let query = 'DELETE FROM `spider`.`pages` WHERE ((TO_DAYS(CURDATE()) - TO_DAYS(`date`)) >= 365);';
        self.mysqlPool.query(query, cb);
    } else {
        throw new Error('нет callback функции');
    }
};

Spider.prototype.insertPages = function(url, htmlContent, text, cb) {
    let self = this;

    if (typeof cb !== 'function') {
        cb = function() {};
    }

    if (!url || typeof url !== 'string') {
        return process.nextTick(cb, new Error('invalid args'));
    }

    const $ = cheerio.load(htmlContent || '');
    let foundImgUrl = null;
    
    // Универсальный поиск картинки-обложки для разных движков сайтов вузов
    let $mainImgEl = $('img').filter((i, el) => {
        const s = $(el).attr('src') || $(el).attr('data-src') || '';
        const lowerS = s.toLowerCase();
        return s &&
               !lowerS.includes('logo') &&
               !lowerS.includes('icon') &&
               !lowerS.includes('blank') &&
               !lowerS.includes('spacer') &&
               !lowerS.includes('.svg') &&
               !lowerS.includes('.gif');
    }).first();
    
    if ($mainImgEl.length) {
        foundImgUrl = $mainImgEl.attr('src') || $mainImgEl.attr('data-src') || $mainImgEl.attr('data-original');
    }

    let fullImgUrl = null;
    if (foundImgUrl) {
        try {
            fullImgUrl = foundImgUrl.startsWith('http') ? foundImgUrl : new URL(foundImgUrl, url).href;
            if (self.seenImages && self.seenImages.has(fullImgUrl)) {
                fullImgUrl = null; // Защита от дублей картинок
            } else if (self.seenImages) {
                self.seenImages.add(fullImgUrl);
            }
        } catch (e) {
            console.error('Ошибка парсинга URL картинки:', e);
        }
    }

    let universityName = getUniversityByUrl(url);
    let today = new Date();
    let date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    let qUrl = self.mysqlPool.escape(url);
    let qText = self.mysqlPool.escape(text || '');
    let qPhoto = fullImgUrl ? self.mysqlPool.escape(fullImgUrl) : 'NULL';
    let qUni = self.mysqlPool.escape(universityName);
    let qDate = self.mysqlPool.escape(date);
    
    let query = `
        INSERT INTO \`spider\`.\`pages\` (\`url\`, \`text\`, \`photo_url\`, \`university\`, \`date\`)
        VALUES (${qUrl}, ${qText}, ${qPhoto}, ${qUni}, ${qDate})
        ON DUPLICATE KEY UPDATE
            \`text\` = VALUES(\`text\`),
            \`photo_url\` = COALESCE(VALUES(\`photo_url\`), \`photo_url\`),
            \`university\` = VALUES(\`university\`),
            \`date\` = VALUES(\`date\`);
    `;
    self.mysqlPool.query(query, function(err, result) {
        if (!err) {
            const found = extractAchievementMention(text);
            if (found) {
                const pageId = (result && result.insertId) ? result.insertId : null;
                const achQuery = `
                    INSERT IGNORE INTO \`spider\`.\`university_achievements\`
                    (\`page_id\`, \`university\`, \`url\`, \`achievement_category\`, \`achievement_mention\`, \`article_date\`, \`photo_url\`)
                    VALUES (
                        ${pageId ? parseInt(pageId, 10) : 'NULL'},
                        ${qUni},
                        ${qUrl},
                        ${self.mysqlPool.escape(found.category)},
                        ${self.mysqlPool.escape(found.mention)},
                        ${qDate},
                        ${qPhoto}
                    );
                `;
                self.mysqlPool.query(achQuery, function(achErr) {
                    if (achErr) {
                        console.error('Ошибка записи в university_achievements:', achErr);
                    }
                });
            }
        }
        process.nextTick(cb, err, result);
    });    
};  

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const httpModule = url.startsWith('https://') ? https : http;
        httpModule.get(url, (res) => {
            if (res.statusCode === 200) {
                const stream = fs.createWriteStream(filepath);
                res.pipe(stream);
                stream.on('finish', () => { 
           });
            } else {
                reject(new Error(`Failed to download: ${res.statusCode}`));
            }
        }).on('error', reject);
    });
}

function isImageOfPerson(imageCaption, personName) {
    if (!imageCaption || !personName) return false;
    const captionLower = imageCaption.toLowerCase();
    const nameParts = personName.toLowerCase().trim().split(/\s+/);
    return nameParts.some(part => part.length > 2 && captionLower.includes(part));
}                stream.close(); 
                    resolve(filepath); 
         

function getUniversityByUrl(url) {
    if (!url) return 'Не определён';
    if (url.includes('urfu.ru')) return 'УрФУ';
    if (url.includes('msu.ru')) return 'МГУ';
    if (url.includes('spbu.ru')) return 'СПбГУ';
    if (url.includes('hse.ru')) return 'ВШЭ';
    return 'Не определён';
}

function extractAchievementMention(text) {
    if (!text || typeof text !== 'string') return null;

    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length < 30) return null;

    const keywords = [
        'достижен', 'побед', 'победител', 'грант', 'патент', 'преми',
        'призёр', 'призер', 'рекорд', 'открыти', 'олимпиад', 'лауреат',
        'конкурс', 'стипенд', 'разработ', 'исследован', 'медал', 'наград',
        'первое место', 'золот', 'серебр', 'бронз', 'вошёл в топ', 'вошел в топ'
    ];

    const lower = clean.toLowerCase();
    const matched = keywords.find(kw => lower.includes(kw));
    if (!matched) return null;

    const idx = lower.indexOf(matched);
    const start = Math.max(0, idx - 140);
    const end = Math.min(clean.length, idx + 260);
    let snippet = clean.slice(start, end).trim();

    if (start > 0) snippet = '...' + snippet;
    if (end < clean.length) snippet = snippet + '...';

    return {
        category: matched,
        mention: snippet
    };
}

module.exports = Spider;