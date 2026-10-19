const placeholderTexts = [
    "Ask me anything",
    `Try: "What's the capital of France?"`,
    "Search",
    "Type here nerd",
    "Angela Search",
    "Is Angela Wi-Fi?",
    "AngelaSoBased",
    "Quite curious you are, little one...",
    "can i get some credit pls check my github",
];

const address2 = document.getElementById("an-address");

if (address2) {
    address2.addEventListener("focus", () => {
        document.body.style.setProperty("--blur-amount", "50px");
    });

    address2.addEventListener("blur", () => {
        document.body.style.setProperty("--blur-amount", "3px");
    });

    address2.placeholder =
        placeholderTexts[Math.floor(Math.random() * placeholderTexts.length)];
} else {
    console.error("Could not find #an-address element");
}

// vibecoded rain
const canvas = document.getElementById("rain-canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const width = canvas.width;
const height = canvas.height;
let wind = 1;

const drops = Array.from({ length: 200 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    speed: 8 + Math.random() * 40,
    len: 10 + Math.random() * 15,
    opacity: Math.random(),
}));

function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let d of drops) {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - wind, d.y - d.len);
        ctx.strokeStyle = `rgba(174, 214, 241, ${d.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        d.y += d.speed;

        if (d.y > height) {
            d.x = Math.random() * width;
            d.y = 0;
        }
    }

    requestAnimationFrame(animate);
}

animate();

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
