'use strict';

const mysql = require('mysql');
const cheerio = require('cheerio');
const fs = require('fs');
const https = require('https');
const http = require('http');

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'ratingurfu',
    password: 'ratingurfu',
    database: 'spider'
});

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const httpModule = url.startsWith('https://') ? https : http;
        httpModule.get(url, (res) => {
            if (res.statusCode === 200) {
                if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads', { recursive: true });
                const stream = fs.createWriteStream(filepath);
                res.pipe(stream);
                stream.on('finish', () => { stream.close(); resolve(filepath); });
            } else {
                reject(new Error(`Status ${res.statusCode}`));
            }
        }).on('error', reject);
    });
}

function getPageHtml(url) {
    return new Promise((resolve, reject) => {
        const httpModule = url.startsWith('https://') ? https : http;
        httpModule.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function processPages() {
    pool.query('SELECT id, url FROM pages WHERE photo_url IS NULL', async (err, rows) => {
        if (err) throw err;
        console.log(`Найдено записей без фото: ${rows.length}`);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                console.log(`[${i + 1}/${rows.length}] Обработка ${row.url}...`);
                const html = await getPageHtml(row.url);
                const $ = cheerio.load(html);

                let imgSrc = $('.news-detail-image img, .news-item img, article img').first().attr('src');
                if (!imgSrc) {
                    imgSrc = $('img').filter((_, el) => {
                        const src = $(el).attr('src') || '';
                        return src && !src.includes('logo') && !src.includes('icon') && !src.endsWith('.svg');
                    }).first().attr('src');
                }

                if (imgSrc) {
                    const fullImgUrl = new URL(imgSrc, row.url).href;
                    const localPath = `./uploads/${Date.now()}_${row.id}.jpg`;
                    await downloadImage(fullImgUrl, localPath);

                    await new Promise(res => {
                        pool.query('UPDATE pages SET photo_url = ? WHERE id = ?', [localPath, row.id], res);
                    });
                    console.log(`  -> Фото сохранено: ${localPath}`);
                } else {
                    console.log('  -> Фото не найдено на странице');
                }
            } catch (e) {
                console.error(`  -> Ошибка: ${e.message}`);
            }
        }
        console.log('Готово!');
        process.exit(0);
    });
}

processPages();