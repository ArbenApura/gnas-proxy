const express = require("express");
const request = require("request");
const randomUseragent = require("random-useragent");
const app = express();

app.get("/proxy/playstore", (req, res) => {
  const targetUrl = req.query.url || "https://play.google.com";

  request(
    { url: targetUrl, headers: { "User-Agent": randomUseragent.getRandom() } },
    (error, response, body) => {
      if (error) {
        res.status(500).send("Error fetching the content.");
        return;
      }

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
          document.requestStorageAccessFor = () => {};

          document.querySelectorAll('a').forEach((anchor) => {
            anchor.addEventListener('click', (event) => {
              event.preventDefault();
              window.parent.postMessage({ type: 'redirect-url', url: anchor.href }, '*')

              setTimeout(() => {
                // Get all images inside the iframe's document
                const images = document.querySelectorAll("img");

                // Loop through each image and check if it's fully loaded
                images.forEach((img) => {
                  if (!img.complete || img.naturalWidth === 0) {
                    // If image is not loaded, try reloading it
                    img.src = img.src;
                  }
                });
              }, 2000);
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

      res.set("Content-Type", response.headers["content-type"]);
      res.send(modifiedBody);
    }
  );
});

// Fallback route to handle incorrect paths
app.get("*", (req, res) => {
  res.redirect(`/proxy?url=https://play.google.com${req.originalUrl}`);
});

// Show the IP address of the server
app.get("/ip", (req, res) => {
  const targetUrl = "https://api.ipify.org?format=json";

  request(
    {
      url: targetUrl,
      headers: { "User-Agent": "Mozilla/5.0" },
    },
    (error, response, body) => {
      if (error) {
        res.status(500).send("Error fetching the IP address.");
        return;
      }

      try {
        const data = JSON.parse(body);
        res.json({ ip: data.ip });
      } catch (err) {
        res.status(500).send("Error processing the IP data.");
      }
    }
  );
});

// Start the server on port 3000
app.listen(3000, () => {
  console.log("Proxy server running on http://localhost:3000");
});
