// this generates the html pages based on BASE.html and content in the pages folder
const fs = require("fs");
const { replace_strings } = require("./utils.js");

const BASE = fs.readFileSync("BASE.html", { encoding: "utf8" });

function recurse_pages(path) {
  fs.stat(path, (err, stats) => {
    if (err != null) return console.error(err);
    if (stats.isDirectory())
      fs.opendir(path, async (err, dir) => {
        for await (const dirent of dir) {
          if (dirent.isDirectory()) {
            recurse_pages(path + "/" + dirent.name);
          } else {
            const out_path = path.replace("public/pages", "") + "/" + dirent.name;

            fs.readFile(path + "/" + dirent.name, { encoding: "utf8" }, (err, data) => {
              let title = /<!--(.+)-->/.exec(data);
              let replace_data = {
                PAGE: data,
                ID: dirent.name.replace(".html", ""),
                TITLE: title ? title[1] : ":3",
              };
              out = replace_strings(replace_data, BASE);

              console.log(out_path + ':"""' + data + '"""');

              fs.writeFile("./public" + out_path, out, { encoding: "utf8", flag: "w" }, (err) => {
                if (err) {
                  if (err.errno == -2) {
                    fs.mkdirSync("./public/" + path.replace("public/pages", ""));
                  } else console.error(err);
                }
              });
            });
          }
        }
      });
  });
}

recurse_pages("public/pages");
