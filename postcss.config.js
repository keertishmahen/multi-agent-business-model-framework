// Tailwind was removed: no stylesheet ever used @tailwind/@apply, so it emitted
// nothing while its config file (which defined a different green palette) kept
// misleading readers into thinking it drove the theme. The design system lives
// in src/index.css and src/styles/corporate.css.
module.exports = {
  plugins: {
    autoprefixer: {},
  },
};
