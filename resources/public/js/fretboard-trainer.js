System.register("index", ["freelizer"], function (exports_1, context_1) {
    "use strict";
    var freelizer_1, _a, start, subscribe;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (freelizer_1_1) {
                freelizer_1 = freelizer_1_1;
            }
        ],
        execute: async function () {
            _a = await freelizer_1.freelizer(), start = _a.start, subscribe = _a.subscribe;
            start();
            subscribe(console.log);
        }
    };
});
//# sourceMappingURL=fretboard-trainer.js.map