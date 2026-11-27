const Spider = require('./spider/index_fixed');

// Генерируем пачку страниц с пагинацией (например, первые 50 страниц новостей)
let startUrls = [
    'https://urfu.ru/ru/news/',
    'https://www.msu.ru/news/',
    'https://spbu.ru/news-events/novosti',
    'https://www.hse.ru/news'
];
for (let i = 1; i <= 100; i++) {
    startUrls.push(`https://urfu.ru/ru/news/?p=${i}`), // УрФУ
    startUrls.push(`https://www.msu.ru/news/?p=${i}`), // МГУ
    startUrls.push(`https://spbu.ru/news-events/novosti/?p=${i}`), // СПбГУ
    startUrls.push(`https://www.hse.ru/news/?p=${i}`); // ВШЭ
}

let spider = new Spider(startUrls);

spider.targetPersons = []; // Если нужен автопоиск по именам или массив имён

spider.init(function(err) {
    if (err) throw err;
    console.log(startUrls.length > 1 ? 'Мультивузовский паук запущен!' : 'Паук запущен!');
    spider.scan();
});
