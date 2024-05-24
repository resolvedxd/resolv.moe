const BACKGROUND_COLOR = "#2a2331";
const SECONDARY_COLOR = "#463A52";

const canvas_el = document.getElementById("background_canvas");
const ctx = canvas_el.getContext("2d");

const draw = () => {
  let w = canvas_el.clientWidth;
  let h = canvas_el.clientHeight;
  ctx.canvas.width = w;
  ctx.canvas.height = h;

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = SECONDARY_COLOR;
  for (let y = 0; y < h / 5; y++)
    for (let x = 0; x < w / 5; x++)
      ctx.fillRect(x * 5, y * 5, 2, 2);
}
requestAnimationFrame(draw);

window.addEventListener("resize", draw);