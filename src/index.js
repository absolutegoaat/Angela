import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));
const controllerPath = fileURLToPath(
	new URL(
		"../node_modules/@mercuryworkshop/scramjet-controller/dist/",
		import.meta.url
	)
);
const epoxyPath = fileURLToPath(
	new URL(
		"../node_modules/@mercuryworkshop/epoxy-transport/dist/",
		import.meta.url
	)
);
const libcurlPath = fileURLToPath(
	new URL(
		"../node_modules/@mercuryworkshop/libcurl-transport/dist/",
		import.meta.url
	)
);

logging.set_level(logging.NONE);

Object.assign(wisp.options, {
	allow_udp_streams: false,
	hostname_blacklist: [/example\.com/],
	dns_servers: ["1.1.1.3", "1.0.0.3"],
});

const fastify = Fastify({
	logger: {
		level: "info",
		// Avoid logging sensitive request headers or bodies.
		redact: ["req.headers.authorization", "req.headers.cookie"],
	},

	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				const start = performance.now();

				fastify.log.info(
					{
						event: "request",
						method: req.method,
						url: req.url,
						ip: req.socket.remoteAddress,
					},
					"Incoming HTTP request"
				);

				res.on("finish", () => {
					fastify.log.info(
						{
							event: "response",
							method: req.method,
							url: req.url,
							statusCode: res.statusCode,
							durationMs: Math.round(performance.now() - start),
						},
						"HTTP response completed"
					);
				});

				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				fastify.log.info(
					{
						event: "upgrade",
						method: req.method,
						url: req.url,
						ip: req.socket.remoteAddress,
					},
					"WebSocket upgrade request"
				);

				if (req.url?.endsWith("/wisp/")) {
					wisp.routeRequest(req, socket, head);
				} else {
					socket.end();
				}
			});
	},
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scramjet/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: controllerPath,
	prefix: "/controller/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: epoxyPath,
	prefix: "/epoxy/",
	decorateReply: false,
});

fastify.setNotFoundHandler((request, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();

	if (!address || typeof address === "string") return;

	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
	console.log(
		`\thttp://${
			address.family === "IPv6" ? `[${address.address}]` : address.address
		}:${address.port}`
	);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

let port = parseInt(process.env.PORT || "", 10);

if (isNaN(port)) port = 8080;

async function shutdown() {
	console.log("Closing HTTP server...");
	try {
		await fastify.close();
		process.exit(0);
	} catch (error) {
		fastify.log.error(error, "Error while closing server");
		process.exit(1);
	}
}

try {
	await fastify.listen({
		port,
		host: "0.0.0.0",
	});
} catch (error) {
	fastify.log.error(error);
	process.exit(1);
}
