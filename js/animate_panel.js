function fnv(s = 0x23424555, h) {
  const l = s.length;
  for (let i = 0; i < l; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0);
}

function ease(x) {
  return Math.sin((x * Math.PI) / 2);
}
const lerp = (a, b, t) => {
  t = t < 0 ? 0 : t;
  t = t > 1 ? 1 : t;
  return a + (b - a) * t;
};

const panels_el = [document.getElementById("main"), document.getElementById("projects"), document.getElementById("friends")];
const panels = []; /* { el: element, img: img_string, box: bounding_box } */

window.addEventListener("load", () => {
  setTimeout(() => {
    const placeholder_panel = document.getElementById("placeholder_panel");
    const canvas = document.getElementById("anim");
    const ctx = canvas.getContext("2d", { alpha: true });

    const left = document.getElementById("arrow_left");
    const left_hint = document.getElementById("arrow_left_hint");
    const right = document.getElementById("arrow_right");
    const right_hint = document.getElementById("arrow_right_hint");

    let current_panel = 0;
    let previous_panel = 0;

    let start_t = 0;
    let last_elapsed_time = 0;
    const anim_length = 1300;
    const draw = (t) => {
      const panel = panels[current_panel];
      const prev_panel = panels[previous_panel];
      const box = prev_panel.box;

      if (start_t == 0) start_t = t;
      const elapsed_time = t - start_t;
      const anim_t = ease((elapsed_time % anim_length / anim_length)) * (box.height / 3);
      const anim_t_new = ease(1 + (elapsed_time % anim_length / anim_length)) * (box.height / 3);

      if (elapsed_time >= anim_length || navigator.maxTouchPoints > 0) {
        panel.el.style.display = "block";
        placeholder_panel.hidden = true;
      }

      if (last_elapsed_time > anim_length || navigator.maxTouchPoints > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      last_elapsed_time = elapsed_time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const offset_a = lerp(10, 15, document.children[0].clientHeight / 1363 - 1);
      const offset_b = lerp(12.5, 20, document.children[0].clientHeight / 1363 - 1);
      for (let x = 0; x < box.width; x++) {
        const offset = anim_t * ((fnv(x.toString()) % 40) / 10 + offset_a);
        const offset_new = anim_t_new * ((fnv(x.toString()) % 40) / 10 - offset_b);


        if (elapsed_time < anim_length) ctx.drawImage(prev_panel.img, x, 0, 1, box.height, x, box.top + offset, 1, box.height);
        ctx.drawImage(panel.img, x, 0, 1, box.height, x, box.top + offset_new, 1, box.height);

      }
      // ctx.drawImage(prev_panel.img, 0, 0);

      requestAnimationFrame(draw);
    }

    for (let i = 0; i < panels_el.length; i++) {
      let needs_zfix = (panels_el[i].style.display == "none");
      let old_z;
      let old_pos;
      if (needs_zfix) {
        old_z = panels_el[i].style.zIndex;
        old_pos = panels_el[i].style.position;
        panels_el[i].style.zIndex = -10;
        panels_el[i].style.position = "absolute";
        panels_el[i].style.top = "0";
        panels_el[i].style.left = "0";
        panels_el[i].style.display = "block";
      }

      domtoimage.toPng(panels_el[i]).then(r => {
        if (needs_zfix) {
          panels_el[i].style.zIndex = old_z;
          panels_el[i].style.position = old_pos;
          panels_el[i].style.display = "none";
        }
        ctx.canvas.width = canvas.clientWidth;
        ctx.canvas.height = canvas.clientHeight;

        const img = new Image();
        img.src = r;
        img.onload = () => {
          const box = panels_el[i].getBoundingClientRect();
          panels.push({ el: panels_el[i], img, box, idx: i });
          panels.sort((a, b) => a.idx - b.idx);
        };
        img.onerror = () => {
          console.log(panels_el[i], "failed");
        }
      });
    }

    // navigation hint text
    let hint_text = { right: "projects", left: "friends" };

    const navigate = (dir) => {
      if (last_elapsed_time >= anim_length || last_elapsed_time == 0) {
        previous_panel = current_panel;
        dir ? current_panel++ : current_panel--;
        if (current_panel >= panels.length) current_panel = 0;
        if (current_panel < 0) current_panel = panels.length - 1;

        hint_text.right = panels_el[(current_panel == panels_el.length - 1) ? 0 : current_panel + 1].id;
        hint_text.left = panels_el[(current_panel == 0) ? panels.length - 1 : current_panel - 1].id;
        right_hint.innerText = "to " + hint_text.right;
        left_hint.innerText = "to " + hint_text.left;

        panels[previous_panel].box = panels[previous_panel].el.getBoundingClientRect();
        panels[previous_panel].el.style.display = "none";
        placeholder_panel.hidden = false;
        last_elapsed_time = 0;
        start_t = 0;
        requestAnimationFrame(draw);
      }
    }
    left.addEventListener("click", navigate.bind(null, false));
    right.addEventListener("click", navigate.bind(null, true));

    const navigation_hint = (dir, e) => {
      let el = dir ? right_hint : left_hint;
      el.style.color = "#ffffff" + (e.type == "mouseenter" ? "aa" : "00");
      el.style.animation = e.type == "mouseenter" ? "hint_hover 0.4s ease-in-out infinite 0.2s" : "";
      el.innerText = "to " + (dir ? hint_text.right : hint_text.left);
    }
    left.addEventListener("mouseenter", navigation_hint.bind(null, false));
    right.addEventListener("mouseenter", navigation_hint.bind(null, true));
    left.addEventListener("mouseleave", navigation_hint.bind(null, false));
    right.addEventListener("mouseleave", navigation_hint.bind(null, true));

    window.addEventListener("resize", () => {
      ctx.canvas.width = canvas.clientWidth;
      ctx.canvas.height = canvas.clientHeight;
    });
  }, 50);
});