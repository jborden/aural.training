# Aural Training

This is the source code for the aural.training website.

# Prerequistes

1. `lein` must be installed
2. `npm` must be installed
3. `rollup` must be installed

```
npm install --global rollup
```
# Develop

Run the clojure server
```
lein repl
aural-training.dev=> (dev-init!)
```

Watch for typescript changes
```
rollup -c -w
```

Open in browser

http://localhost:3000

Connect to the websocket with wscat

```
wscat --connect ws://localhost:3000/ws
```

# Roadmap

1. [ ] MVP - note memorization lesson
2. [ ] Public Release to  https://aural.training

# Notes

https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-opacity
might have some interesting ideas for making the pluck strings circles
more interesting

## Pipeline operator

We investigated using the pipeline operator (|>) and stash some code locally
for this. see: https://babeljs.io/docs/en/babel-plugin-proposal-pipeline-operator

Problems:
1. We will lose Typescript warnings in the rollup compiliation step.
2. The lsp linter does not like parsing |>
3. It's not a R-style pipe or clojure thread, it needs a "topic token", like ^^

## React

React (v18, latest) is not in a place that can be easily used with rollup/tsc. It's a configuration nightmare with no straight forward answer.

## Syncing DB

The websocket on the backend needs more work. The frontend dexie db sync seems to delay connecting, or not connect at all.
