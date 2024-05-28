const submit_handler = async (pg_num) => {
  const name = document.getElementById("name" + pg_num);
  const showflag = document.getElementById("showflag" + pg_num);
  const comment = document.getElementById("comment" + pg_num);
  const submit = document.getElementById("submit" + pg_num);
  if (!submit) return;

  submit.addEventListener("click", async () => {
    if (submit.attributes.disabled && submit.attributes.disabled.value == "true") return;

    const r = fetch("/post", {
      body: JSON.stringify({ name: name.value, showflag: showflag.checked, comment: comment.value }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    submit.innerText = "submitting...";
    submit.setAttribute("disabled", true);

    r.catch(async (e) => {});

    r.then(async (r) => {
      console.log(r);
      if (r.status == 400) {
        const text = await r.text();
        console.log(text);
        let old_color = submit.style.color;
        submit.innerText = text;
        submit.style.color = "red";
        setTimeout(() => {
          submit.setAttribute("disabled", false);
          submit.innerText = "submit";
          submit.style.color = old_color;
        }, 5000);
      } else if (r.status == 200) {
        submit.innerText = "submitted, reloading...";
        location.reload();
      }
    });
  });
};

if (location.search.startsWith("?pg")) submit_handler(parseInt(location.search.split("=")[1]));
else submit_handler(0);

const localize_times = () => {
  Array.from(document.getElementsByClassName("time")).forEach((e) => {
    e.className = "";
    e.innerText = new Date(parseInt(e.innerText) * 1000).toLocaleString();
  });
};
localize_times();
const GUESTBOOK_REGEX = /guestbook(?:\?pg=(\d))?/;
document.addEventListener("new_page", (e) => {
  localize_times();
  const page_id = e.detail;
  let gb_pg = GUESTBOOK_REGEX.exec(page_id);
  if (gb_pg) {
    let pg_num = gb_pg[1];
    if (!pg_num) pg_num = 0;
    submit_handler(pg_num);
  }
});
