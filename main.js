const express = require("express");
const request = require("request");
const randomUseragent = require("random-useragent");
const cheerio = require("cheerio");
const app = express();

function modifyPlaystoreBody(targetUrl, body) {
  const $ = cheerio.load(body);

  if ($('a[href="market://details?goToHome=1"]').length > 0) return "";

  const id = new URL(targetUrl).searchParams.get("id");

  const style = `
  <style>
    /* Styles to make the header unclickable and shaded */
    header[role="banner"] {
      pointer-events: none;
    }
  </style>`;

  const script = `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      window.parent.postMessage({ type: 'loaded' }, '*')

      document.requestStorageAccessFor = () => {};

      document.querySelectorAll('a').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
          event.preventDefault();
          window.parent.postMessage({ type: 'redirect-url', url: anchor.href }, '*')
        });
      });

      const banner = document.querySelector('header[role="banner"]');
      if (banner) banner.remove();

      const language = document.querySelector('.avtIH');
      if (language) language.remove();

      let icon = document.querySelector('.Mqg6jb img:first-child')?.src;

      if (!icon) icon = document.querySelector('.RhBWnf img')?.src;

      const title = document.querySelector('.AfwdI')?.textContent;

      let description = document.querySelector('.bARER')?.textContent;

      const publisher = document.querySelector('.Vbfug.auoIOc')?.textContent;

      const totalDownloads = document.querySelector('.wVqUob:nth-child(2) .ClM7O')?.textContent;

      let contentRatingImage = document.querySelector('.wVqUob:nth-child(3) .ClM7O img')?.src;
      let contentRatingLabel = document.querySelector('.wVqUob:nth-child(3) .g1rdde span')?.textContent;

      if (!contentRatingImage) {
        contentRatingImage = document.querySelector('.wVqUob:nth-child(4) .ClM7O img')?.src;
        contentRatingLabel = document.querySelector('.wVqUob:nth-child(4) .g1rdde span')?.textContent;
      }

      let imagePreviews = [];
      document.querySelectorAll('div[role="list"] img.T75of').forEach((img) => imagePreviews.push(img.src));
      if (imagePreviews.length > 12) imagePreviews = imagePreviews.slice(0, 12);

      window.parent.postMessage({ type: 'last-metadata', metadata: JSON.stringify({
        id: '${id}',
        icon,
        title,
        description,
        publisher,
        totalDownloads,
        imagePreviews,
        contentRating: {
          image: contentRatingImage,
          label: contentRatingLabel,
        },
      })}, '*');
    });
    document.addEventListener('click', (e) => {
      if (frameElement && document.activeElement && document.activeElement.href) {
        e.preventDefault();
        frameElement.load(document.activeElement.href);
      }
    });
    document.addEventListener('submit', (e) => {
      if (frameElement && document.activeElement && document.activeElement.form && document.activeElement.form.action) {
        e.preventDefault();
        if (document.activeElement.form.method === 'post')
          frameElement.load(document.activeElement.form.action, {
            method: 'post',
            body: new FormData(document.activeElement.form),
          });
        else
          frameElement.load(
            document.activeElement.form.action + '?' + new URLSearchParams(new FormData(document.activeElement.form)),
          );
      }
    });
  </script>`;

  const modifiedBody = body
    .replace("</head>", `${style}</head>`)
    .replace("</body>", `${script}</body>`);

  return modifiedBody;
}

app.get("/proxy/playstore", (req, res) => {
  const targetUrl = req.query.url || "https://play.google.com";

  request(
    { url: targetUrl, headers: { "User-Agent": randomUseragent.getRandom() } },
    async (error, response, body) => {
      if (error) {
        res.status(500).send("Error fetching the content.");
        return;
      }

      const modifiedBody = modifyPlaystoreBody(targetUrl, body);

      if (!modifiedBody) {
        res.set("Content-Type", response.headers["content-type"]);
        res.send(
          `<script>
            document.addEventListener('DOMContentLoaded', () => {
              window.parent.postMessage({ type: 'blocked-url', url: '${targetUrl}' }, '*');
            });
          </script>`
        );
        return;
      }

      res.set("Content-Type", response.headers["content-type"]);
      res.send(modifiedBody);
    }
  );
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(3000, () => {
  console.log("Proxy server running on http://localhost:3000");
});
