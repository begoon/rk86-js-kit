const server = Bun.serve({
    routes: {
        "/": () => new Response(Bun.file("main.html")),
        "/.well-known/appspecific/com.chrome.devtools.json": new Response("OK"),
        "/console": async (req) => {
            const data = await req.json();
            if (data.type.startsWith("console")) {
                console.log([data.type, data.timestamp, ...[data.args.join(" ")]].join(" | "));
            } else {
                console.log(JSON.stringify(data, null, 2));
            }
            return new Response(undefined);
        },
        "/*": async (req) => {
            const url = new URL(req.url);
            const path = `.${url.pathname}`;
            if (path.endsWith(".ts")) {
                const result = await Bun.build({
                    entrypoints: [path],
                    target: "browser",
                });
                if (result.success && result.outputs.length > 0) {
                    return new Response(result.outputs[0], {
                        headers: { "Content-Type": "application/javascript" },
                    });
                }
                console.error("Build failed:", result.logs);
                return new Response("Build failed", { status: 500 });
            }
            return new Response(Bun.file(path));
        },
    },

    port: 8000,
});

console.log(`server running at ${server.url}`);
