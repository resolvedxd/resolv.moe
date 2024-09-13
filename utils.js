module.exports = {
  replace_strings: (data, input) => {
    Object.entries(data).forEach((d) => {
      input = input.replace(RegExp(`\\{\\{\\{${d[0]}\\}\\}\\}`, "g"), d[1]);
    });
    return input;
  },
};
