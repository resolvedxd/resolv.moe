function fnv(s = 0x23424555, h) {
  const l = s.length;
  for (let i = 0; i < l; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

function ease(x) {
  return Math.sin((x * Math.PI) / 2);
}
const lerp = (a, b, t) => {
  t = t < 0 ? 0 : t;
  t = t > 1 ? 1 : t;
  return a + (b - a) * t;
};

const panels_el = [];
Array.from(document.getElementById("panels").children).forEach((el) => panels_el.push(el));
const panels = []; /* { el: element, img: img_string, box: bounding_box, title: page_title } */
const panels_promises = [];

function gen_img(el, ctx, canvas, title, delay = 100) {
  return new Promise((resolve, reject) => {
    let needs_zfix = el.style.display == "none";
    let old_z;
    let old_pos;
    if (needs_zfix) {
      old_z = el.style.zIndex;
      old_pos = el.style.position;
      el.style.zIndex = -10;
      el.style.position = "absolute";
      el.style.top = "0";
      el.style.left = "0";
      el.style.display = "block";
    }

    setTimeout(() => {
      el.style.overflow = "hidden";
      el.style.width = Math.min(el.clientWidth + 2, 600) + "px";
      el.style.height = Math.min(el.clientHeight + 2, 400) + "px";
      domtoimage.toPng(el).then((r) => {
        const box = el.getBoundingClientRect();
        el.style.height = el.style.width = "";
        el.style.overflow = "overlay";

        if (needs_zfix) {
          el.style.zIndex = old_z;
          el.style.position = old_pos;
          el.style.display = "none";
        }
        ctx.canvas.width = canvas.clientWidth;
        ctx.canvas.height = canvas.clientHeight;

        const img = new Image();
        img.src = r;
        img.onload = () => {
          panels.push({ el: el, img, box, title: title, idx: panels_el.findIndex((e) => e.id == el.id) });
          panels.sort((a, b) => a.idx - b.idx);
          resolve();
        };
        img.onerror = () => {
          console.log(el, "failed");
          reject();
        };
      });
    }, delay);
  });
}

window.addEventListener("load", () => {
  const placeholder_panel = document.getElementById("placeholder_panel");
  const canvas = document.getElementById("anim");
  const canvas_box = canvas.getBoundingClientRect();
  const ctx = canvas.getContext("2d", { alpha: true });

  const title_text = document.getElementById("title_text");
  const title_div = document.getElementById("title");
  const panels_div = document.getElementById("panels");

  const back_button = document.getElementById("back");
  if (window.location.pathname.includes("index") || window.location.pathname == "/") back_button.style.display = "none";

  let current_panel = 0;
  let previous_panel = 0;

  let start_t = 0;
  let last_elapsed_time = 0;
  const anim_length = 1000;

  const draw = (t) => {
    const panel = panels[current_panel];
    const prev_panel = panels[previous_panel];
    const box = prev_panel.box;
    const box_new = panel.el.getBoundingClientRect();

    if (start_t == 0) start_t = t;
    const elapsed_time = t - start_t;
    const anim_t = ease((elapsed_time % anim_length) / anim_length);
    const anim_t_new = ease(1 + (elapsed_time % anim_length) / anim_length);

    if (elapsed_time >= anim_length || navigator.maxTouchPoints > 0) {
      panel.el.style.display = "block";
      title.style.visibility = "visible";
      panel.el.style.visibility = "visible";
    }

    if (last_elapsed_time > anim_length || navigator.maxTouchPoints > 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    last_elapsed_time = elapsed_time;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const offset_a = lerp(10, 15, document.children[0].clientHeight / 1363 - 1);
    const offset_b = lerp(15, 20, document.children[0].clientHeight / 1363 - 1);
    const RES = 3;

    const y_offset = box.top;
    const y_offset_new = box_new.top;
    const x_offset = box.left - canvas_box.left;
    const x_offset_new = box_new.left - canvas_box.left;
    if (!(elapsed_time >= anim_length))
      for (let x = 0; x < Math.max(box.width, box_new.width) / RES; x += RES)
        for (let y = 0; y < Math.max(box.height, box_new.height) / RES; y += RES) {
          if (elapsed_time < anim_length) {
            if (((fnv(x.toString()) + fnv(y.toString())) % 100) / 100 > anim_t)
              ctx.drawImage(
                prev_panel.img,
                x * RES,
                y * RES,
                RES * RES,
                RES * RES,
                x * RES + x_offset,
                y * RES + y_offset,
                RES * RES,
                RES * RES,
              );
          }

          if (((fnv(x.toString()) + fnv(y.toString())) % 100) / 100 > anim_t_new)
            ctx.drawImage(
              panel.img,
              x * RES,
              y * RES,
              RES * RES,
              RES * RES,
              x * RES + x_offset_new,
              y * RES + y_offset_new,
              RES * RES,
              RES * RES,
            );
        }

    requestAnimationFrame(draw);
  };

  const COMMENT_REGEX = /<!--(.+)-->/;
  const get_page = async (id, delay = 100) => {
    const page_req = await fetch(`/pages/${id}.html`);
    const page_html = await page_req.text();
    console.log("find", id);
    const div = document.createElement("div");
    div.id = id;
    div.className = "panel main_panel";
    div.style.display = "none";
    div.style.position = "relative";
    div.innerHTML = page_html;
    panels_div.appendChild(div);
    panels_el.push(document.getElementById(id));
    fix_links();
    let title = COMMENT_REGEX.exec(page_html);
    await gen_img(document.getElementById(id), ctx, canvas, title ? title[1] : ":3", delay);
  };

  const fix_links = () => {
    Array.from(document.getElementsByTagName("a")).forEach((e) => {
      if (e.attributes["href"] && !e.attributes["href"].value.includes("http")) {
        e.addEventListener("click", navigate.bind(null, e.attributes["href"].value));
        const id = e.attributes.href.value;
        e.addEventListener("mouseover", () => {
          if (!panels_el.find((el) => el.id == id)) panels_promises.push(get_page(id));
        });
        e.removeAttribute("href");
      }
    });
  };

  const navigate = async (id) => {
    if (!panels_el.find((el) => el.id == id)) {
      await get_page(id);
    }
    if (last_elapsed_time >= anim_length || last_elapsed_time == 0) {
      await Promise.all(panels_promises);
      if (id != "index") history.pushState({}, "resolv.moe", window.location.origin + "/" + id);
      else history.pushState({}, "resolv.moe", window.location.origin);
      previous_panel = current_panel;

      current_panel = panels.findIndex((p) => p.el.id == id);
      panels[previous_panel].box = panels[previous_panel].el.getBoundingClientRect();
      panels[previous_panel].el.style.display = "none";
      title_div.style.visibility = "hidden";
      title_text.innerText = panels[current_panel].title;
      panels[current_panel].el.style.display = "block";
      panels[current_panel].el.style.visibility = "hidden";
      if (id == "index") back_button.style.display = "none";
      else back_button.style.display = "flex";
      last_elapsed_time = 0;
      start_t = 0;
      requestAnimationFrame(draw);
    }
  };

  fix_links();
  for (let i = 0; i < panels_el.length; i++) {
    const title = COMMENT_REGEX.exec(panels_el[i].innerHTML);
    gen_img(panels_el[i], ctx, canvas, title ? title[1] : ":3");
  }

  window.addEventListener("resize", () => {
    canvas.width = document.getElementById("panels").clientWidth;
    ctx.canvas.width = canvas.clientWidth;
    ctx.canvas.height = canvas.clientHeight;
  });
});
