import svelte from "rollup-plugin-svelte";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import livereload from "rollup-plugin-livereload";
import { terser } from "rollup-plugin-terser";
import sveltePreprocess from "svelte-preprocess";
import typescript from "@rollup/plugin-typescript";
import css from "rollup-plugin-css-only";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import alias from "@rollup/plugin-alias";
// import NodePolyfills from "rollup-plugin-polyfill-node";
// import builtins from 'rollup-plugin-node-builtins';
// import polyfill from 'rollup-plugin-node-polyfills'

const production = !process.env.ROLLUP_WATCH;

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require("child_process").spawn(
        "npm",
        ["run", "start", "--", "--dev"],
        {
          stdio: ["ignore", "inherit", "inherit"],
          shell: true,
        }
      );

      process.on("SIGTERM", toExit);
      process.on("exit", toExit);
    },
  };
}

export default {
  input: "src/main.ts",
  output: {
    sourcemap: true,
    format: "iife",
    name: "app",
    file: "public/build/bundle.js",
  },
  // resolve: {
  //   alias: {
  //     stream: require.resolve('stream-browserify/'),
  //     http: require.resolve('stream-http/'),
  //     https: require.resolve('https-browserify/'),
  //     os: require.resolve('os-browserify/'),
  //     buffer: require.resolve('buffer/'),
  //     url: require.resolve('url/'),
  //     util: require.resolve('util/'),
  //     // events: require.resolve(''),
  //   }
  // },
  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        sourceMap: !production,
        postcss: {
          plugins: [require("tailwindcss"), require("autoprefixer")],
        },
      }),
      compilerOptions: {
        // enable run-time checks when not in production
        dev: !production,
      },
    }),
    alias({
      entries: [
        { find: "components", replacement: "src/components" },
        { find: "abis", replacement: "src/abis" },
        { find: "src", replacement: "src" },
      ],
    }),
    // we'll extract any component CSS out into
    // a separate file - better for performance
    css({ output: "bundle.css" }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration -
    // consult the documentation for details:
    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    // pollyfill(),
    resolve({
      browser: true,
      dedupe: ["svelte", "svelte/transition", "svelte/interal"],
    }),
    commonjs(),
    // builtins(),
    // polyfill(),
    // NodePolyfills(
    //   {
    //     process: true
    //   }
    // ),
    production
      ? replace({ "process.env.NODE_ENV": JSON.stringify("production") })
      : replace({ "process.env.NODE_ENV": JSON.stringify("development") }),
    typescript({
      sourceMap: !production,
      inlineSources: !production,
    }),
    json(),
    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload("public"),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
  ],
  watch: {
    clearScreen: false,
  },
  // alias({
  //     /** browserify for web3 components */
  //     stream: 'stream-browserify',
  //     http: 'http-browserify',
  //     https: require.resolve('http-browserify'),
  // }
};
