# Aural Training

This is the source code for the aural.training website.

# Prerequistes

- Node Installed + npm installed

- ws installed
```
npm install -g ws
```

# Develop

Host server
```
public$ ws
```

Watch for typescript changes
```
rollup -c -w
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
