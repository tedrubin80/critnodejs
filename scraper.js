const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeCriterion(db) {
  console.log('Scraping started...');
  const url = 'https://www.criterion.com/shop/browse?sort=newest';

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const films = [];

    $('.grid__item').each((i, el) => {
      const title = $(el).find('.product-title').text().trim();
      const director = $(el).find('.product-director').text().trim().replace(/^By /, '');
      const url = 'https://www.criterion.com' + $(el).find('a').attr('href');
      const cover_art_url = $(el).find('img').attr('src');

      if (title) {
        films.push({ title, director, url, cover_art_url });
      }
    });

    const insert = db.prepare(`INSERT OR IGNORE INTO films (title, director, url, cover_art_url) VALUES (?, ?, ?, ?)`);

    for (const film of films) {
      insert.run(film.title, film.director, film.url, film.cover_art_url);
    }

    insert.finalize();
    console.log(`Scraped and stored ${films.length} films`);
  } catch (err) {
    console.error('Scraping failed:', err.message);
    throw err;
  }
}

module.exports = scrapeCriterion;
