const default_config = {
  bg_color: "#ededed",
  line_color: "#000000",
  text_color: "#ffffff",
  line_width: 2,
  ticks_color: "#cfcfcf",
  ticks_width: 1,
  font: "12px Arial",
  subtitle_mode: "interval", // "interval" or "point"
  subtitle_x: (x) => x.toString(),
  subtitle_y: (y) => y.toString(),
  subtitle_line_color: "#000000",
  subtitle_line_width: 1,
  subtitle_line_length: 3,
  subtitle_line_enabled: true,
  ticks_enabled: true,
  legend_enabled: true,
  subscribe_events: true,
  range_y_min: -1,
  range_y_max: -1,
};

const MEOWGRAPHS_lerp = function(start, end, t) {
  return start * (1 - t) + end * t;
};

class LineChart {
  data; /* [{ data: [x(time), y(value)], label, color, line_width }] */

  el;
  ctx;
  cursor = { x: -1, y: -1 };

  min_x = Number.MAX_VALUE;
  min_y = Number.MAX_VALUE;
  max_x = Number.MIN_VALUE;
  max_y = Number.MIN_VALUE;

  constructor(el, data, config = default_config) {
    if (typeof el == "string") el = document.getElementById(el);
    if (!(el instanceof Element)) throw Error("Invalid element");

    this.el = el;
    this.ctx = el.getContext("2d");
    this.data = data;
    this.config = { ...default_config, ...config };

    if (this.config.subscribe_events) {
      el.addEventListener("mousemove", (ev) => this.mousemove(ev));
    }

    this.recalc_all(true);
    this.draw();
  }

  recalc(i, sort = false) {
    let lowest_x = { val: Number.MAX_VALUE, idx: -1 };
    let highest_x = { val: Number.MIN_VALUE, idx: -1 };
    let lowest_y = { val: Number.MAX_VALUE, idx: -1 };
    let highest_y = { val: Number.MIN_VALUE, idx: -1 };

    for (let j = 0; j < this.data[i].data.length; j++) {
      let d = this.data[i].data[j];
      if (lowest_x.val > d[0]) {
        lowest_x.val = d[0];
        lowest_x.idx = j;
      }
      if (lowest_y.val > d[1]) {
        lowest_y.val = d[1];
        lowest_y.idx = j;
      }
      if (highest_x.val < d[0]) {
        highest_x.val = d[0];
        highest_x.idx = j;
      }
      if (highest_y.val < d[1]) {
        highest_y.val = d[1];
        highest_y.idx = j;
      }
    }

    this.data[i].lowest_x = lowest_x;
    this.data[i].highest_x = highest_x;
    this.data[i].lowest_y = lowest_y;
    this.data[i].highest_y = highest_y;
    if (lowest_x.val < this.min_x) this.min_x = lowest_x.val;
    if (lowest_y.val < this.min_y) this.min_y = lowest_y.val;
    if (highest_x.val > this.max_x) this.max_x = highest_x.val;
    if (highest_y.val > this.max_y) this.max_y = highest_y.val;

    // TODO: find sorted position to insert at, instead of resorting each time
    if (sort) this.data[i].data = this.data[i].data.sort((a, b) => a[0] - b[0]);
  }

  recalc_all(sort = false) {
    for (let i = 0; i < this.data.length; i++) {
      this.recalc(i, sort);
    }
  }

  add_data(d, i = 0, do_draw = true) {
    if (!Array.isArray(d))
      throw Error("input to add_data must be an array or array of arrys");

    if (Array.isArray(d[0])) {
      this.data[i].data.push(...d);
    } else {
      this.data[i].data.push(d);
    }

    if (do_draw) {
      this.recalc(i, true);
      this.draw();
    }
  }

  draw() {
    const ctx = this.ctx;
    const config = this.config;
    const data = this.data;
    const width = this.el.width;
    const height = this.el.height;
    ctx.clearRect(0, 0, width, height);

    ctx.font = config.font;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const _tm = ctx.measureText("W");
    const font_height = _tm.fontBoundingBoxAscent + _tm.fontBoundingBoxDescent;
    const legend_height = font_height + 5;
    const x_pad =
      ctx.measureText("WWW").width +
      8 +
      (config.subtitle_line_enabled ? config.subtitle_line_width + 3 : 0);
    const y_pad =
      font_height +
      3 +
      (config.subtitle_line_enabled ? config.subtitle_line_width + 3 : 0) +
      (config.legend_enabled ? legend_height : 0);

    const min_y = config.range_y_min == -1 ? this.min_y : config.range_y_min;
    const max_y = config.range_y_max == -1 ? this.max_y : config.range_y_max;

    if (config.ticks_enabled) {
      const ticks_x = Math.floor((width - x_pad) / 80);
      const ticks_y = Math.floor((height - y_pad) / 20);

      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = config.ticks_color;
      ctx.beginPath();
      let tick_path;
      if (config.subtitle_line_enabled) tick_path = new Path2D();

      for (let i = 0; i <= ticks_x; i++) {
        const x = ((width - x_pad) / ticks_x) * i + x_pad;

        ctx.moveTo(x, 0);
        ctx.lineTo(x, height - y_pad);

        if (config.subtitle_mode == "interval") {
          ctx.textBaseline = "bottom";
          if (i == 0) ctx.textAlign = "left";
          else if (i == ticks_x) ctx.textAlign = "right";
          else ctx.textAlign = "center";
          let val = MEOWGRAPHS_lerp(this.min_x, this.max_x, i / ticks_x);
          if (config.subtitle_x) val = config.subtitle_x(val);
          ctx.fillStyle = config.text_color;
          ctx.fillText(val, x, height - legend_height);
          tick_path.moveTo(x, height - y_pad);
          tick_path.lineTo(x, height - font_height - legend_height);
          if (i == 0)
            tick_path.lineTo(
              x + config.subtitle_line_length,
              height - font_height - legend_height,
            );
          else if (i == ticks_x)
            tick_path.lineTo(
              x - config.subtitle_line_length,
              height - font_height - legend_height,
            );
          else {
            tick_path.moveTo(
              x - config.subtitle_line_length,
              height - font_height - legend_height,
            );
            tick_path.lineTo(
              x + config.subtitle_line_length,
              height - font_height - legend_height,
            );
          }
        }
      }

      for (let i = 0; i <= ticks_y; i++) {
        const y = ((height - y_pad) / ticks_y) * i;
        ctx.moveTo(x_pad, y);
        ctx.lineTo(width, y);

        if (config.subtitle_mode == "interval") {
          if (i == 0) ctx.textBaseline = "top";
          else if (i == ticks_y) ctx.textBaseline = "bottom";
          else ctx.textBaseline = "middle";
          let val = MEOWGRAPHS_lerp(min_y, max_y, Math.abs(i / ticks_y - 1));
          if (config.subtitle_y) val = config.subtitle_y(val);
          ctx.textAlign = "right";
          ctx.fillStyle = config.text_color;
          ctx.fillText(val, x_pad - 8, y);
          ctx.stroke();

          tick_path.moveTo(x_pad, y);
          tick_path.lineTo(x_pad - 5, y);
          if (i == 0) {
            tick_path.lineTo(x_pad - 5, y + config.subtitle_line_length);
          } else if (i == ticks_y) {
            tick_path.lineTo(x_pad - 5, y - config.subtitle_line_length);
          } else {
            tick_path.moveTo(x_pad - 5, y - config.subtitle_line_length);
            tick_path.lineTo(x_pad - 5, y + config.subtitle_line_length);
          }
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      if (config.subtitle_line_enabled) {
        ctx.strokeStyle = config.subtitle_line_color;
        ctx.stroke(tick_path);
      }
    }

    for (let i = 0; i < data.length; i++) {
      let d_obj = data[i];
      let last_tm_x;
      let last_tm_y;

      ctx.beginPath();
      for (let j = 0; j < d_obj.data.length; j++) {
        let d = d_obj.data[j];

        const x =
          ((width - x_pad) * (d[0] - d_obj.lowest_x.val)) /
          (this.max_x - this.min_x) +
          x_pad;

        // const d_min_y = min_y == this.min_y ? d_obj.lowest_y.val : min_y;
        // const d_max_y = max_y == this.max_y ? d_obj.highest_y.val : max_y;
        const y =
          ((height - y_pad) * (d[1] - min_y)) /
          (max_y - min_y) +
          y_pad;

        // flip
        ctx.lineTo(x, Math.abs(y - height));

        // subtitles
        if (config.subtitle_mode == "point") {
          const text_x =
            typeof d_obj.subtitle_x == "function"
              ? d_obj.subtitle_x(d[0])
              : d[0].toString();
          const text_y =
            typeof d_obj.subtitle_y == "function"
              ? d_obj.subtitle_y(d[1])
              : d[1].toString();

          const tm_x = ctx.measureText(text_x);
          const tm_y = ctx.measureText(text_y);

          if (!last_tm_x) {
            ctx.textAlign = "left";
            ctx.fillStyle = config.text_color;
            ctx.fillText(text_x, x, height);
            // ctx.textAlign = "center";
            tm_x.x = x;
            last_tm_x = tm_x;
          } else if (last_tm_x.x + last_tm_x.width / 2 < x - tm_x.width) {
            if (x + tm_x.width > width) ctx.textAlign = "right";
            ctx.fillStyle = config.text_color;
            ctx.fillText(text_x, x, height);
            tm_x.x = x;
            last_tm_x = tm_x;
          }

          if (!last_tm_y) {
            ctx.textAlign = "left";
            ctx.textBaseline = "bottom";
            ctx.fillStyle = config.text_color;
            ctx.fillText(text_y, 0, Math.abs(y - height));
            tm_y.y = y;
            last_tm_y = tm_y;
          } else if (
            last_tm_y.y + last_tm_y.fontBoundingBoxAscent / 2 <
            y - tm_y.fontBoundingBoxAscent / 2
          ) {
            if (y + tm_y.fontBoundingBoxAscent > height) ctx.textAlign = "left";
            ctx.fillStyle = config.text_color;
            ctx.fillText(text_y, 0, Math.abs(y - height));
            tm_y.y = y;
            last_tm_y = tm_y;
          }
        }
      }
      if (d_obj.color) ctx.strokeStyle = d_obj.color;
      else ctx.strokeStyle = config.line_color;
      if (d_obj.line_width) ctx.lineWidth = d_obj.line_width;
      else ctx.lineWidth = config.line_width;
      ctx.stroke();
    }

    if (config.legend_enabled) {
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      let biggest_label = 0;
      for (let i = 0; i < data.length; i++) {
        const d_obj = data[i];
        const tm = ctx.measureText(d_obj.label);
        if (tm.width > biggest_label) biggest_label = tm.width;
      }
      const rect_size = font_height - 4;
      const label_width = rect_size + biggest_label + 8;
      for (let i = 0; i < data.length; i++) {
        const d_obj = data[i];
        ctx.fillStyle = d_obj.color;
        ctx.fillRect(
          label_width * i,
          height - legend_height + 2,
          rect_size,
          rect_size,
        );
        ctx.fillStyle = config.text_color;
        ctx.fillText(
          d_obj.label,
          rect_size + label_width * i + 1,
          height - legend_height + 2,
        );
      }
    }
  }

  mousemove(ev) {
    this.cursor.x = ev.clientX;
    this.cursor.y = ev.clientY;
  }
}
