const placeholderTexts = [
    "Ask me anything", `Try: "What's the capital of France?"`,
    "Search", "Type here nerd",
    "Angela Search", "Is Angela Wi-Fi?",
    "AngelaSoBased", "Quite curious you are, little one...",
    "can i get some credit pls check my github"
];

const address2 = document.getElementById("an-address");

if (address2) {
    address2.addEventListener('focus', () => {
        document.body.style.setProperty('--blur-amount', '50px');
    });

    address2.addEventListener('blur', () => {
        document.body.style.setProperty('--blur-amount', '3px');
    });

    address2.placeholder = placeholderTexts[Math.floor(Math.random() * placeholderTexts.length)];
} else {
    console.error("Could not find #an-address element");
}
